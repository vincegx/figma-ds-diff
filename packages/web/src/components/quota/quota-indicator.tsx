'use client';

import { useState } from 'react';
import { useApiQuota } from '@/hooks/use-api-quota';
import { QuotaPopover } from './quota-popover';
import type { QuotaStatus } from '@figma-ds-diff/core';

function dotColor(status: QuotaStatus): string {
  if (status === 'critical') return 'var(--color-removed)';
  if (status === 'warning') return 'var(--color-conflict)';
  return 'var(--color-local)';
}

export function QuotaIndicator() {
  const { stats, loading } = useApiQuota();
  const [open, setOpen] = useState(false);

  if (loading || !stats) {
    return (
      <div
        className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
        style={{
          fontSize: 11,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          color: 'var(--text-muted)',
        }}
      >
        <span
          className="inline-block h-[6px] w-[6px] rounded-full animate-pulse-soft"
          style={{ background: 'var(--text-muted)' }}
        />
        <span className="font-mono" style={{ fontSize: 10 }}>API</span>
      </div>
    );
  }

  const worst = stats.tiers.reduce((a, b) =>
    a.usagePercent >= b.usagePercent ? a : b,
  );

  const color = dotColor(worst.status);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-full px-2.5 py-1 cursor-pointer"
        style={{
          fontSize: 10,
          fontWeight: 500,
          background: open ? 'var(--bg-surface-hover)' : 'var(--bg-surface)',
          border: `1px solid ${open ? 'var(--border-hover)' : 'var(--border-default)'}`,
          color: 'var(--text-secondary)',
          transition: 'all var(--duration-fast)',
        }}
        onMouseEnter={(e) => {
          if (!open) {
            e.currentTarget.style.borderColor = 'var(--border-hover)';
            e.currentTarget.style.background = 'var(--bg-surface-hover)';
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.borderColor = 'var(--border-default)';
            e.currentTarget.style.background = 'var(--bg-surface)';
          }
        }}
      >
        <span
          className="inline-block h-[6px] w-[6px] rounded-full shrink-0"
          style={{ background: color, boxShadow: `0 0 6px ${color}40` }}
        />
        <span className="font-mono" style={{ letterSpacing: '-0.01em' }}>
          {worst.lastMinuteCount}<span style={{ color: 'var(--text-muted)' }}>/</span>{worst.limitPerMin}
        </span>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {/* Popover panel */}
          <div
            className="absolute right-0 top-full mt-2 z-50 animate-fade-up"
            style={{
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-default)',
              borderRadius: 14,
              boxShadow: '0 16px 48px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.02)',
              padding: 16,
            }}
          >
            <QuotaPopover stats={stats} />
          </div>
        </>
      )}
    </div>
  );
}
