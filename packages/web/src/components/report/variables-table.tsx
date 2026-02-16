'use client';

import type { VariableDiff, VariableModeValue } from '@/types/report';
import { PropStatusBadge } from '@/components/shared/prop-status-badge';

interface VariablesTableProps {
  variables: VariableDiff[];
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
                  alignItems: 'start',
                  borderBottom:
                    i < vars.length - 1
                      ? '1px solid rgba(255,255,255,0.03)'
                      : 'none',
                  animationDelay: `${i * 20}ms`,
                }}
              >
                <span
                  className="font-mono"
                  style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)', paddingTop: 2 }}
                >
                  {v.name}
                </span>
                <ModeValueList values={v.upstream} side="upstream" />
                <ModeValueList values={v.local} side="local" />
                <div className="flex justify-end" style={{ paddingTop: 2 }}>
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

function ModeValueList({ values, side }: { values: VariableModeValue[]; side: 'upstream' | 'local' }) {
  if (values.length === 0) {
    return (
      <span className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
        —
      </span>
    );
  }

  const showModeLabel = values.length > 1;

  return (
    <div className="flex flex-col gap-1">
      {values.map((mv) => (
        <div key={mv.mode} className="flex flex-col">
          {showModeLabel && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: 'var(--text-muted)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase' as const,
                marginBottom: 1,
              }}
            >
              {mv.mode}
            </span>
          )}
          <span
            className="font-mono"
            style={{
              fontSize: 11,
              fontWeight: mv.changed ? 600 : 400,
              color: mv.changed
                ? side === 'upstream'
                  ? 'var(--color-upstream)'
                  : 'var(--color-local)'
                : 'var(--text-primary)',
            }}
          >
            {mv.value}
          </span>
        </div>
      ))}
    </div>
  );
}
