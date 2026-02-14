'use client';

import type { QuotaStats, TierStats } from '@figma-ds-diff/core';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

/* ── Helpers ── */

function tierColor(status: TierStats['status']): string {
  if (status === 'critical') return 'var(--color-removed)';
  if (status === 'warning') return 'var(--color-conflict)';
  return 'var(--color-local)';
}


/* ── Section header (matches sidebar GroupHeader pattern) ── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: 'var(--text-muted)',
        letterSpacing: '0.07em',
        textTransform: 'uppercase' as const,
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

/* ── Tier card (matches StatCard pattern — colored top bar, surface bg) ── */
function TierCard({ tier }: { tier: TierStats }) {
  const color = tierColor(tier.status);
  const pct = Math.min(tier.usagePercent, 100);

  return (
    <div
      className="relative overflow-hidden"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 10,
        padding: '12px 14px',
      }}
    >
      {/* Colored top bar (StatCard pattern) */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: color, opacity: 0.5 }}
      />

      {/* Label row */}
      <div className="flex items-center justify-between mb-2">
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)' }}>
          {tier.label}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-[6px] w-[6px] rounded-full shrink-0"
            style={{ background: color, boxShadow: `0 0 6px ${color}40` }}
          />
          <span
            className="font-mono"
            style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}
          >
            {tier.lastMinuteCount}
            <span style={{ color: 'var(--text-muted)' }}>/</span>
            {tier.limitPerMin}
          </span>
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="relative h-[5px] w-full overflow-hidden rounded-full"
        style={{ background: 'var(--border-default)' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: color,
            transition: 'width 0.3s var(--ease-default)',
          }}
        />
      </div>
    </div>
  );
}

/* ── Main popover ── */
export function QuotaPopover({ stats }: { stats: QuotaStats }) {
  const hasChartData = stats.weeklyChart.some((d) => d.tier1 + d.tier2 > 0);

  return (
    <div style={{ width: 300 }}>
      {/* Title */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className="flex items-center justify-center shrink-0"
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))',
            fontSize: 10,
            fontWeight: 800,
          }}
        >
          ⚡
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
          Figma API Quota
        </span>
      </div>

      {/* Tier cards */}
      <div className="flex flex-col gap-2 mb-3">
        {stats.tiers.map((tier) => (
          <TierCard key={tier.tier} tier={tier} />
        ))}
      </div>

      {/* Today total — inline stat badge */}
      <div
        className="flex items-center justify-between mb-3"
        style={{
          padding: '8px 12px',
          borderRadius: 8,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
        }}
      >
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>
          Today
        </span>
        <span className="flex items-baseline gap-1">
          <span
            className="font-mono"
            style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
          >
            {stats.todayTotal}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>calls</span>
        </span>
      </div>

      {/* 7-day chart */}
      {hasChartData && (
        <div
          className="mb-3"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 10,
            padding: '10px 10px 4px',
          }}
        >
          <SectionLabel>Last 7 days</SectionLabel>
          <ResponsiveContainer width="100%" height={90}>
            <BarChart data={stats.weeklyChart} barCategoryGap="20%">
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)' }}
                tickFormatter={(d: string) => d.slice(5)}
                stroke="rgba(255,255,255,0.06)"
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                contentStyle={{
                  backgroundColor: '#0a0a11',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 8,
                  fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: '#ffffff',
                  padding: '6px 10px',
                }}
                labelStyle={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, marginBottom: 2 }}
              />
              <Bar
                dataKey="tier1"
                name="Images"
                fill="#F87171"
                stackId="a"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="tier2"
                name="Files"
                fill="#3B82F6"
                stackId="a"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          {/* Custom legend */}
          <div className="flex items-center justify-center gap-4 pb-1" style={{ fontSize: 9 }}>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-sm" style={{ background: '#F87171' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Images</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-sm" style={{ background: '#3B82F6' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Files</span>
            </span>
          </div>
        </div>
      )}

      {/* Top endpoints */}
      {stats.topEndpoints.length > 0 && (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 10,
            padding: '10px 12px',
          }}
        >
          <SectionLabel>Top endpoints today</SectionLabel>
          <div className="flex flex-col gap-1">
            {stats.topEndpoints.slice(0, 5).map((ep, i) => (
              <div
                key={ep.endpoint}
                className="flex justify-between items-center font-mono"
                style={{
                  fontSize: 10,
                  padding: '3px 0',
                  borderBottom:
                    i < Math.min(stats.topEndpoints.length, 5) - 1
                      ? '1px solid rgba(255,255,255,0.03)'
                      : 'none',
                }}
              >
                <span className="truncate" style={{ color: 'var(--text-tertiary)' }}>
                  {ep.endpoint}
                </span>
                <span
                  className="ml-3 shrink-0 tabular-nums"
                  style={{ color: 'var(--text-secondary)', fontWeight: 600 }}
                >
                  {ep.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
