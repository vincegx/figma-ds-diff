import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

// ── Tier Configuration ──────────────────────────────────────────────

export type QuotaTier = 'tier1' | 'tier2';

export type QuotaStatus = 'ok' | 'warning' | 'critical';

export const TIER_CONFIGS = {
  tier1: { label: 'Images API', limitPerMin: 15, path: '/v1/images/' },
  tier2: { label: 'Files API', limitPerMin: 50, path: '/v1/files/' },
} as const;

// ── Persisted Data ──────────────────────────────────────────────────

interface RecentCall {
  endpoint: string;
  tier: QuotaTier;
  status: number;
  timestamp: number;
}

interface DailyBucket {
  date: string; // YYYY-MM-DD
  tier1: number;
  tier2: number;
  endpoints: Record<string, number>;
}

interface QuotaData {
  recentCalls: RecentCall[];
  dailyBuckets: DailyBucket[];
}

// ── Public Stats Types ──────────────────────────────────────────────

export interface TierStats {
  tier: QuotaTier;
  label: string;
  limitPerMin: number;
  lastMinuteCount: number;
  usagePercent: number;
  status: QuotaStatus;
}

export interface EndpointStat {
  endpoint: string;
  count: number;
}

export interface WeeklyChartPoint {
  date: string;
  tier1: number;
  tier2: number;
}

export interface QuotaStats {
  tiers: TierStats[];
  todayTotal: number;
  weeklyChart: WeeklyChartPoint[];
  topEndpoints: EndpointStat[];
}

// ── Helpers ─────────────────────────────────────────────────────────

function classifyTier(endpoint: string): QuotaTier {
  return endpoint.includes('/v1/images/') ? 'tier1' : 'tier2';
}

/** Replace file keys with `:key` for grouping. */
export function normalizeEndpoint(endpoint: string): string {
  // Strip query string first
  const pathOnly = endpoint.split('?')[0] ?? endpoint;
  // Capture the type (files|images), then replace the file key segment with :key
  return pathOnly.replace(
    /\/v1\/(files|images)\/[A-Za-z0-9_-]+/,
    '/v1/$1/:key',
  );
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function statusFromPercent(percent: number): QuotaStatus {
  if (percent >= 80) return 'critical';
  if (percent >= 60) return 'warning';
  return 'ok';
}

// ── QuotaTracker ────────────────────────────────────────────────────

const RECENT_CALLS_TTL_MS = 60_000; // 60s
const DAILY_BUCKET_TTL_DAYS = 7;
const EMPTY_DATA: QuotaData = { recentCalls: [], dailyBuckets: [] };

export class QuotaTracker {
  private data: QuotaData | null = null;
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  async trackCall(endpoint: string, status: number): Promise<void> {
    // Serialize the entire read-modify-write cycle
    this.queue = this.queue.then(async () => {
      const data = await this.load();
      const tier = classifyTier(endpoint);
      const normalized = normalizeEndpoint(endpoint);
      const now = Date.now();

      // Add to recent calls
      data.recentCalls.push({ endpoint: normalized, tier, status, timestamp: now });

      // Update daily bucket
      const today = todayString();
      let bucket = data.dailyBuckets.find((b) => b.date === today);
      if (!bucket) {
        bucket = { date: today, tier1: 0, tier2: 0, endpoints: {} };
        data.dailyBuckets.push(bucket);
      }
      bucket[tier]++;
      bucket.endpoints[normalized] = (bucket.endpoints[normalized] ?? 0) + 1;

      // Prune stale data
      this.prune(data, now);

      // Persist
      await this.persist(data);
    });

    await this.queue;
  }

  async getStats(): Promise<QuotaStats> {
    const data = await this.load();
    const now = Date.now();

    // Prune before computing (don't save — read-only operation)
    this.prune(data, now);

    const cutoff = now - RECENT_CALLS_TTL_MS;
    const recentValid = data.recentCalls.filter((c) => c.timestamp >= cutoff);

    const tiers: TierStats[] = (['tier1', 'tier2'] as const).map((tier) => {
      const config = TIER_CONFIGS[tier];
      const lastMinuteCount = recentValid.filter((c) => c.tier === tier).length;
      const usagePercent = Math.round((lastMinuteCount / config.limitPerMin) * 100);
      return {
        tier,
        label: config.label,
        limitPerMin: config.limitPerMin,
        lastMinuteCount,
        usagePercent,
        status: statusFromPercent(usagePercent),
      };
    });

    const today = todayString();
    const todayBucket = data.dailyBuckets.find((b) => b.date === today);
    const todayTotal = todayBucket ? todayBucket.tier1 + todayBucket.tier2 : 0;

    // Weekly chart: last 7 days (fill gaps with 0)
    const weeklyChart: WeeklyChartPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const b = data.dailyBuckets.find((bucket) => bucket.date === dateStr);
      weeklyChart.push({
        date: dateStr,
        tier1: b?.tier1 ?? 0,
        tier2: b?.tier2 ?? 0,
      });
    }

    // Top endpoints today
    const topEndpoints: EndpointStat[] = todayBucket
      ? Object.entries(todayBucket.endpoints)
          .map(([endpoint, count]) => ({ endpoint, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      : [];

    return { tiers, todayTotal, weeklyChart, topEndpoints };
  }

  // ── Persistence ─────────────────────────────────────────────────

  private async load(): Promise<QuotaData> {
    if (this.data) return this.data;

    try {
      const raw = await readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw) as QuotaData;
      // Basic validation
      if (!Array.isArray(parsed.recentCalls) || !Array.isArray(parsed.dailyBuckets)) {
        this.data = { ...EMPTY_DATA, recentCalls: [], dailyBuckets: [] };
      } else {
        this.data = parsed;
      }
    } catch {
      this.data = { ...EMPTY_DATA, recentCalls: [], dailyBuckets: [] };
    }

    return this.data;
  }

  private async persist(data: QuotaData): Promise<void> {
    this.data = data;
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  private prune(data: QuotaData, now: number): void {
    // Prune recentCalls older than 60s
    const cutoff = now - RECENT_CALLS_TTL_MS;
    data.recentCalls = data.recentCalls.filter((c) => c.timestamp >= cutoff);

    // Prune dailyBuckets older than 7 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DAILY_BUCKET_TTL_DAYS);
    const cutoffDateStr = cutoffDate.toISOString().slice(0, 10);
    data.dailyBuckets = data.dailyBuckets.filter((b) => b.date >= cutoffDateStr);
  }
}
