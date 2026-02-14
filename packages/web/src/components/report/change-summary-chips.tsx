'use client';

interface ChangeSummaryChipsProps {
  upstream: number;
  local: number;
  conflicts: number;
}

const CHIPS = [
  { key: 'upstream', label: 'Upstream', colorVar: 'upstream' },
  { key: 'local', label: 'Local', colorVar: 'local' },
  { key: 'conflicts', label: 'Conflicts', colorVar: 'conflict' },
] as const;

export function ChangeSummaryChips({ upstream, local, conflicts }: ChangeSummaryChipsProps) {
  const counts: Record<string, number> = { upstream, local, conflicts };
  const visible = CHIPS.filter((c) => counts[c.key]! > 0);

  if (visible.length === 0) return null;

  return (
    <div className="flex gap-1.5" style={{ padding: '14px 28px 10px' }}>
      {visible.map((chip) => (
        <div
          key={chip.key}
          className="flex items-center gap-1.5"
          style={{
            padding: '4px 10px',
            borderRadius: 6,
            background: `var(--color-${chip.colorVar}-bg)`,
            border: `1px solid var(--color-${chip.colorVar}-bd)`,
          }}
        >
          <span
            className="rounded-full"
            style={{
              width: 5,
              height: 5,
              background: `var(--color-${chip.colorVar})`,
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: `var(--color-${chip.colorVar})`,
            }}
          >
            {counts[chip.key]}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            {chip.label}
          </span>
        </div>
      ))}
    </div>
  );
}
