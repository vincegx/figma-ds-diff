'use client';

import type { StyleDiff } from '@/types/report';
import { PropStatusBadge } from '@/components/shared/prop-status-badge';

interface StylesTableProps {
  styles: StyleDiff[];
}

export function StylesTable({ styles }: StylesTableProps) {
  if (styles.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center"
        style={{ padding: '80px 28px', color: 'var(--text-tertiary)' }}
      >
        <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>◎</div>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
          No style changes detected
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          All styles match between the constructor and fork
        </div>
      </div>
    );
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
        Style Changes
      </h2>

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
            gridTemplateColumns: '160px 55px 1fr 1fr 1fr 42px',
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
          <span>Token</span>
          <span>Type</span>
          <span>Base</span>
          <span style={{ color: 'var(--color-upstream)' }}>Upstream</span>
          <span style={{ color: 'var(--color-local)' }}>Local</span>
          <span />
        </div>

        {/* Rows */}
        {styles.map((s, i) => {
          const isColor = s.type === 'color';
          return (
            <div
              key={s.name}
              className="animate-fade-up"
              style={{
                display: 'grid',
                gridTemplateColumns: '160px 55px 1fr 1fr 1fr 42px',
                padding: '9px 14px',
                alignItems: 'center',
                borderBottom:
                  i < styles.length - 1
                    ? '1px solid rgba(255,255,255,0.03)'
                    : 'none',
                animationDelay: `${i * 20}ms`,
              }}
            >
              <span
                className="font-mono truncate"
                style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)' }}
              >
                {s.name}
              </span>
              <span
                className="uppercase tracking-wider"
                style={{
                  fontSize: 9,
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                }}
              >
                {s.type}
              </span>
              <StyleValueCell value={s.base} isColor={isColor} highlight={false} />
              <StyleValueCell
                value={s.upstream}
                isColor={isColor}
                highlight={s.status === 'upstream'}
              />
              <StyleValueCell
                value={s.local}
                isColor={isColor}
                highlight={s.status === 'local'}
              />
              <div className="flex justify-end">
                <PropStatusBadge status={s.status} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StyleValueCell({
  value,
  isColor,
  highlight,
}: {
  value: string;
  isColor: boolean;
  highlight: boolean;
}) {
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
        className="font-mono"
        style={{
          fontSize: 11,
          fontWeight: highlight ? 600 : 400,
          color: highlight ? 'var(--text-primary)' : 'var(--text-muted)',
        }}
      >
        {value}
      </span>
    </div>
  );
}
