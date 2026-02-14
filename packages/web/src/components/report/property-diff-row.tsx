'use client';

import type { PropertyDiff } from '@/types/report';
import { PropStatusBadge } from '@/components/shared/prop-status-badge';

interface PropertyDiffRowProps {
  prop: PropertyDiff;
  showBase: boolean;
}

function isColor(v: string): boolean {
  return v.startsWith('#') && v.length <= 9;
}

function ValueCell({ value, highlight, strike }: { value: string; highlight: boolean; strike: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {isColor(value) && (
        <div
          className="shrink-0"
          style={{
            width: 14,
            height: 14,
            borderRadius: 4,
            background: value,
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        />
      )}
      <span
        className="font-mono"
        style={{
          fontSize: 11.5,
          fontWeight: highlight ? 600 : 400,
          color: highlight
            ? 'var(--text-primary)'
            : strike
              ? 'var(--text-muted)'
              : 'var(--text-tertiary)',
          textDecoration: strike ? 'line-through' : 'none',
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function PropertyDiffRow({ prop, showBase }: PropertyDiffRowProps) {
  const isConflict = prop.status === 'conflict';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: showBase
          ? '1fr 100px 100px 100px 42px'
          : '1fr 120px 120px 42px',
        padding: '9px 14px',
        alignItems: 'center',
        gap: 8,
        background: isConflict ? 'var(--color-conflict-bg)' : 'transparent',
        borderLeft: isConflict
          ? '2px solid color-mix(in srgb, var(--color-conflict) 25%, transparent)'
          : '2px solid transparent',
      }}
    >
      <span
        className="font-mono"
        style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}
      >
        {prop.name}
      </span>
      {showBase && (
        <ValueCell value={prop.base} highlight={false} strike={prop.base !== '—'} />
      )}
      <ValueCell
        value={prop.upstream}
        highlight={prop.status === 'upstream' || prop.status === 'conflict'}
      strike={false}
      />
      <ValueCell
        value={prop.local}
        highlight={prop.status === 'local' || prop.status === 'conflict'}
        strike={false}
      />
      <div className="flex justify-end">
        <PropStatusBadge status={prop.status} />
      </div>
    </div>
  );
}
