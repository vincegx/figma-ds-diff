import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'node:path';
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { QuotaTracker, normalizeEndpoint, TIER_CONFIGS } from '../src/figma/quota-tracker.js';

describe('normalizeEndpoint', () => {
  it('replaces file keys with :key for images endpoint', () => {
    expect(normalizeEndpoint('/v1/images/abc123XYZ?ids=1:2')).toBe(
      '/v1/images/:key',
    );
  });

  it('replaces file keys with :key for files endpoint', () => {
    expect(normalizeEndpoint('/v1/files/abc123XYZ')).toBe('/v1/files/:key');
  });

  it('preserves sub-paths for files', () => {
    expect(normalizeEndpoint('/v1/files/abc123XYZ/versions?before=5')).toBe(
      '/v1/files/:key/versions',
    );
  });

  it('normalizes files/components path', () => {
    expect(normalizeEndpoint('/v1/files/abc123XYZ/components')).toBe(
      '/v1/files/:key/components',
    );
  });

  it('normalizes files/styles path', () => {
    expect(normalizeEndpoint('/v1/files/abc123XYZ/styles')).toBe(
      '/v1/files/:key/styles',
    );
  });

  it('normalizes files/nodes path', () => {
    expect(normalizeEndpoint('/v1/files/abc123XYZ/nodes?ids=1:2,3:4')).toBe(
      '/v1/files/:key/nodes',
    );
  });
});

describe('TIER_CONFIGS', () => {
  it('defines tier1 for images', () => {
    expect(TIER_CONFIGS.tier1.limitPerMin).toBe(15);
    expect(TIER_CONFIGS.tier1.path).toBe('/v1/images/');
  });

  it('defines tier2 for files', () => {
    expect(TIER_CONFIGS.tier2.limitPerMin).toBe(50);
    expect(TIER_CONFIGS.tier2.path).toBe('/v1/files/');
  });
});

describe('QuotaTracker', () => {
  let tmpDir: string;
  let filePath: string;
  let tracker: QuotaTracker;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'quota-test-'));
    filePath = join(tmpDir, 'api-quota.json');
    tracker = new QuotaTracker(filePath);
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  // ── Tier Classification ───────────────────────────────────────────

  it('classifies /v1/images/ calls as tier1', async () => {
    await tracker.trackCall('/v1/images/abc123?ids=1:2', 200);
    const stats = await tracker.getStats();
    const tier1 = stats.tiers.find((t) => t.tier === 'tier1')!;
    expect(tier1.lastMinuteCount).toBe(1);
  });

  it('classifies /v1/files/ calls as tier2', async () => {
    await tracker.trackCall('/v1/files/abc123', 200);
    const stats = await tracker.getStats();
    const tier2 = stats.tiers.find((t) => t.tier === 'tier2')!;
    expect(tier2.lastMinuteCount).toBe(1);
  });

  it('classifies /v1/files/:key/versions as tier2', async () => {
    await tracker.trackCall('/v1/files/abc123/versions', 200);
    const stats = await tracker.getStats();
    const tier2 = stats.tiers.find((t) => t.tier === 'tier2')!;
    expect(tier2.lastMinuteCount).toBe(1);
  });

  // ── Stats Computation ─────────────────────────────────────────────

  it('tracks multiple calls and computes correct counts', async () => {
    await tracker.trackCall('/v1/images/abc?ids=1:2', 200);
    await tracker.trackCall('/v1/images/abc?ids=3:4', 200);
    await tracker.trackCall('/v1/files/abc', 200);

    const stats = await tracker.getStats();
    const tier1 = stats.tiers.find((t) => t.tier === 'tier1')!;
    const tier2 = stats.tiers.find((t) => t.tier === 'tier2')!;

    expect(tier1.lastMinuteCount).toBe(2);
    expect(tier2.lastMinuteCount).toBe(1);
  });

  it('computes usage percentages correctly', async () => {
    // tier1 limit is 15, so 9 calls = 60%
    for (let i = 0; i < 9; i++) {
      await tracker.trackCall(`/v1/images/abc?ids=${i}`, 200);
    }

    const stats = await tracker.getStats();
    const tier1 = stats.tiers.find((t) => t.tier === 'tier1')!;
    expect(tier1.usagePercent).toBe(60);
    expect(tier1.status).toBe('warning');
  });

  it('returns ok status at 0%', async () => {
    const stats = await tracker.getStats();
    for (const tier of stats.tiers) {
      expect(tier.status).toBe('ok');
      expect(tier.usagePercent).toBe(0);
    }
  });

  it('returns critical status at >=80%', async () => {
    // tier1 limit is 15, so 12 calls = 80%
    for (let i = 0; i < 12; i++) {
      await tracker.trackCall(`/v1/images/abc?ids=${i}`, 200);
    }

    const stats = await tracker.getStats();
    const tier1 = stats.tiers.find((t) => t.tier === 'tier1')!;
    expect(tier1.status).toBe('critical');
  });

  it('includes todayTotal in stats', async () => {
    await tracker.trackCall('/v1/images/abc?ids=1', 200);
    await tracker.trackCall('/v1/files/abc', 200);
    await tracker.trackCall('/v1/files/abc/versions', 429);

    const stats = await tracker.getStats();
    expect(stats.todayTotal).toBe(3);
  });

  it('tracks error status codes as well', async () => {
    await tracker.trackCall('/v1/files/abc', 429);
    await tracker.trackCall('/v1/files/abc', 500);

    const stats = await tracker.getStats();
    const tier2 = stats.tiers.find((t) => t.tier === 'tier2')!;
    expect(tier2.lastMinuteCount).toBe(2);
  });

  // ── Weekly Chart ──────────────────────────────────────────────────

  it('returns 7 days in weeklyChart', async () => {
    const stats = await tracker.getStats();
    expect(stats.weeklyChart).toHaveLength(7);
  });

  it('includes today in weeklyChart', async () => {
    await tracker.trackCall('/v1/files/abc', 200);
    const stats = await tracker.getStats();
    const today = new Date().toISOString().slice(0, 10);
    const todayPoint = stats.weeklyChart.find((p) => p.date === today);
    expect(todayPoint).toBeDefined();
    expect(todayPoint!.tier2).toBe(1);
  });

  // ── Top Endpoints ─────────────────────────────────────────────────

  it('tracks endpoint breakdown', async () => {
    await tracker.trackCall('/v1/files/abc', 200);
    await tracker.trackCall('/v1/files/abc', 200);
    await tracker.trackCall('/v1/files/xyz/versions', 200);

    const stats = await tracker.getStats();
    expect(stats.topEndpoints.length).toBeGreaterThanOrEqual(2);
    expect(stats.topEndpoints[0]!.count).toBe(2);
  });

  // ── Persistence ───────────────────────────────────────────────────

  it('creates the file and directory on first write', async () => {
    const nestedPath = join(tmpDir, 'nested', 'deep', 'api-quota.json');
    const nestedTracker = new QuotaTracker(nestedPath);
    await nestedTracker.trackCall('/v1/files/abc', 200);

    const raw = await readFile(nestedPath, 'utf-8');
    const data = JSON.parse(raw);
    expect(data.dailyBuckets).toHaveLength(1);
  });

  it('persists data across instances', async () => {
    await tracker.trackCall('/v1/images/abc?ids=1', 200);

    // New instance reads the same file
    const tracker2 = new QuotaTracker(filePath);
    const stats = await tracker2.getStats();
    const tier1 = stats.tiers.find((t) => t.tier === 'tier1')!;
    expect(tier1.lastMinuteCount).toBe(1);
  });

  it('handles corrupted JSON gracefully', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(filePath, 'NOT_JSON{{{', 'utf-8');

    const corruptTracker = new QuotaTracker(filePath);
    const stats = await corruptTracker.getStats();
    expect(stats.todayTotal).toBe(0);
  });

  it('handles missing recentCalls array gracefully', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(filePath, JSON.stringify({ dailyBuckets: [] }), 'utf-8');

    const badTracker = new QuotaTracker(filePath);
    const stats = await badTracker.getStats();
    expect(stats.todayTotal).toBe(0);
  });

  // ── Concurrent Writes ─────────────────────────────────────────────

  it('serializes concurrent writes without data loss', async () => {
    // Fire 10 concurrent trackCall operations
    const promises = Array.from({ length: 10 }, (_, i) =>
      tracker.trackCall(`/v1/files/abc${i}`, 200),
    );
    await Promise.all(promises);

    const stats = await tracker.getStats();
    expect(stats.todayTotal).toBe(10);
  });
});
