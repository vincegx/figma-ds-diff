'use client';

import { useApiQuota } from '@/hooks/use-api-quota';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { QuotaPopover } from './quota-popover';
import type { QuotaStatus } from '@figma-ds-diff/core';

function dotColor(status: QuotaStatus): string {
  if (status === 'critical') return 'bg-red-500';
  if (status === 'warning') return 'bg-yellow-500';
  return 'bg-green-500';
}

export function QuotaIndicator() {
  const { stats, loading } = useApiQuota();

  if (loading || !stats) {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
        <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground animate-pulse" />
        API …
      </div>
    );
  }

  // Show the most constrained tier
  const worst = stats.tiers.reduce((a, b) =>
    a.usagePercent >= b.usagePercent ? a : b,
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs hover:bg-accent transition-colors cursor-pointer"
        >
          <span className={`inline-block h-2 w-2 rounded-full ${dotColor(worst.status)}`} />
          <span className="font-mono">
            API {worst.lastMinuteCount}/{worst.limitPerMin}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-4">
        <QuotaPopover stats={stats} />
      </PopoverContent>
    </Popover>
  );
}
