'use client';

import type { QuotaStats, TierStats } from '@figma-ds-diff/core';
import { Progress } from '@/components/ui/progress';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

function tierColor(status: TierStats['status']): string {
  if (status === 'critical') return 'bg-red-500';
  if (status === 'warning') return 'bg-yellow-500';
  return 'bg-green-500';
}

function indicatorColor(status: TierStats['status']): string {
  if (status === 'critical') return 'bg-red-500';
  if (status === 'warning') return 'bg-yellow-500';
  return 'bg-primary';
}

export function QuotaPopover({ stats }: { stats: QuotaStats }) {
  return (
    <div className="space-y-4 w-80">
      {/* Tier bars */}
      <div className="space-y-3">
        {stats.tiers.map((tier) => (
          <div key={tier.tier}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">{tier.label}</span>
              <span className="flex items-center gap-1.5">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${tierColor(tier.status)}`}
                />
                <span className="font-mono">
                  {tier.lastMinuteCount}/{tier.limitPerMin}
                </span>
              </span>
            </div>
            <Progress
              value={Math.min(tier.usagePercent, 100)}
              indicatorClassName={indicatorColor(tier.status)}
            />
          </div>
        ))}
      </div>

      {/* Today total */}
      <div className="text-xs text-muted-foreground">
        Today: <span className="font-mono text-foreground">{stats.todayTotal}</span> calls
      </div>

      {/* 7-day chart */}
      {stats.weeklyChart.some((d) => d.tier1 + d.tier2 > 0) && (
        <div>
          <div className="text-xs text-muted-foreground mb-2">Last 7 days</div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={stats.weeklyChart}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickFormatter={(d: string) => d.slice(5)} // MM-DD
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 10 }}
              />
              <Bar dataKey="tier1" name="Images" fill="#ef4444" stackId="a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="tier2" name="Files" fill="#3b82f6" stackId="a" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top endpoints */}
      {stats.topEndpoints.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">Top endpoints today</div>
          <div className="space-y-0.5">
            {stats.topEndpoints.slice(0, 5).map((ep) => (
              <div key={ep.endpoint} className="flex justify-between text-xs font-mono">
                <span className="truncate text-muted-foreground">{ep.endpoint}</span>
                <span className="ml-2 shrink-0">{ep.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
