'use client';

import type { VariableDiff } from '@/types/report';
import { PropStatusBadge } from '@/components/shared/prop-status-badge';

interface VariablesTableProps {
  variables: VariableDiff[];
}

function isColorValue(val: string): boolean {
  return /^#[0-9a-f]{3,8}$/i.test(val);
}

export function VariablesTable({ variables }: VariablesTableProps) {
  if (variables.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center"
        style={{ padding: '80px 28px', color: 'var(--text-tertiary)' }}
      >
        <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>⬡</div>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
          No variable changes detected
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          All variables match between the constructor and fork
        </div>
      </div>
    );
  }

  // Group by collection
  const groups = new Map<string, VariableDiff[]>();
  for (const v of variables) {
    const col = v.collection || 'Ungrouped';
    const list = groups.get(col) ?? [];
    list.push(v);
    groups.set(col, list);
  }

  return (
    <div className="animate-fade-up" style={{ padding: 28 }}>
      <h2
        style={{
          fontSize: 18,
          fontWeight: 700,
          marginBottom: 14,
          letterSpacing: '-0.02em',
          color: 'var(--text-primary)',
        }}
      >
        Variable Changes
        <span
          className="ml-2"
          style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}
        >
          ({variables.length})
        </span>
      </h2>

      {[...groups.entries()].map(([collection, vars]) => (
        <div key={collection} className="mb-6">
          {/* Collection header */}
          <div
            className="flex items-center gap-2 mb-2"
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--text-tertiary)',
              letterSpacing: '0.07em',
              textTransform: 'uppercase' as const,
            }}
          >
            <span style={{ color: 'var(--color-new)' }}>⬡</span>
            {collection}
            <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
              ({vars.length})
            </span>
          </div>

          <div
            className="overflow-hidden"
            style={{
              border: '1px solid var(--border-default)',
              borderRadius: 10,
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 42px',
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
              <span>Variable</span>
              <span style={{ color: 'var(--color-upstream)' }}>Upstream</span>
              <span style={{ color: 'var(--color-local)' }}>Local</span>
              <span />
            </div>

            {/* Rows */}
            {vars.map((v, i) => (
              <div
                key={v.name}
                className="animate-fade-up"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 42px',
                  padding: '9px 14px',
                  alignItems: 'center',
                  borderBottom:
                    i < vars.length - 1
                      ? '1px solid rgba(255,255,255,0.03)'
                      : 'none',
                  animationDelay: `${i * 20}ms`,
                }}
              >
                <span
                  className="font-mono truncate"
                  style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)' }}
                >
                  {v.name}
                </span>
                <ValueCell
                  value={v.upstream}
                  highlight={v.status === 'upstream' || v.status === 'conflict'}
                />
                <ValueCell
                  value={v.local}
                  highlight={v.status === 'local' || v.status === 'conflict'}
                />
                <div className="flex justify-end">
                  <PropStatusBadge status={v.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ValueCell({ value, highlight }: { value: string; highlight: boolean }) {
  const isColor = isColorValue(value);
  return (
    <div className="flex items-center gap-1.5">
      {isColor && (
        <div
          className="shrink-0"
          style={{
            width: 13,
            height: 13,
            borderRadius: 3,
            background: value,
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        />
      )}
      <span
        className="font-mono truncate"
        style={{
          fontSize: 11,
          fontWeight: highlight ? 600 : 400,
          color: 'var(--text-primary)',
        }}
      >
        {value}
      </span>
    </div>
  );
}
