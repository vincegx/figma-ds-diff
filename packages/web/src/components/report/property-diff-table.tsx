'use client';

import { useState } from 'react';
import type { PropertyDiff } from '@/types/report';
import { PropertyDiffRow } from './property-diff-row';

interface PropertyDiffTableProps {
  props: PropertyDiff[];
}

export function PropertyDiffTable({ props }: PropertyDiffTableProps) {
  const [showBase, setShowBase] = useState(true);

  if (props.length === 0) return null;

  // Sort: conflicts first, then upstream, then local
  const conflicts = props.filter((p) => p.status === 'conflict');
  const upstream = props.filter((p) => p.status === 'upstream');
  const local = props.filter((p) => p.status === 'local');
  const sorted = [...conflicts, ...upstream, ...local];

  return (
    <div style={{ padding: '0 28px 28px' }}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="uppercase tracking-wider"
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text-tertiary)',
            letterSpacing: '0.07em',
          }}
        >
          Property Changes
        </span>
        <label className="flex items-center gap-1.5 cursor-pointer" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
          <Toggle active={showBase} onToggle={() => setShowBase(!showBase)} />
          Base column
        </label>
      </div>

      {/* Table */}
      <div
        className="overflow-hidden"
        style={{
          border: '1px solid var(--border-default)',
          borderRadius: 10,
        }}
      >
        {/* Column headers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: showBase
              ? '1fr 100px 100px 100px 42px'
              : '1fr 120px 120px 42px',
            padding: '7px 14px',
            background: 'var(--bg-surface)',
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--text-muted)',
            letterSpacing: '0.07em',
            textTransform: 'uppercase' as const,
            borderBottom: '1px solid var(--border-default)',
          }}
        >
          <span>Property</span>
          {showBase && <span>Base</span>}
          <span style={{ color: 'var(--color-upstream)' }}>Upstream</span>
          <span style={{ color: 'var(--color-local)' }}>Local</span>
          <span />
        </div>

        {/* Rows */}
        {sorted.map((prop, i) => (
          <div
            key={prop.name}
            style={{
              borderBottom:
                i < sorted.length - 1
                  ? prop.status === 'conflict'
                    ? '1px solid var(--border-default)'
                    : '1px solid rgba(255,255,255,0.03)'
                  : 'none',
            }}
          >
            <PropertyDiffRow prop={prop} showBase={showBase} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Toggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      className="relative cursor-pointer"
      style={{
        width: 28,
        height: 16,
        borderRadius: 8,
        background: active ? 'var(--color-upstream-deep)' : 'var(--bg-surface)',
        border: `1px solid ${active ? 'var(--color-upstream-bd)' : 'var(--border-default)'}`,
        transition: 'all 0.2s',
      }}
    >
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: 6,
          background: 'var(--text-primary)',
          position: 'absolute',
          top: 1,
          left: active ? 14 : 1,
          transition: 'left 0.2s',
        }}
      />
    </div>
  );
}
