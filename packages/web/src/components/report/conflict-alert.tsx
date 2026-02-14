'use client';

interface ConflictAlertProps {
  count: number;
}

export function ConflictAlert({ count }: ConflictAlertProps) {
  if (count === 0) return null;

  return (
    <div
      className="flex items-center gap-2 shrink-0"
      style={{
        padding: '8px 28px',
        background: 'var(--color-conflict-bg)',
        borderBottom: '1px solid var(--color-conflict-bd)',
      }}
    >
      <span style={{ fontSize: 13 }}>⚡</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-conflict)' }}>
        {count} conflicting propert{count > 1 ? 'ies' : 'y'}
      </span>
      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
        — changed both upstream and locally
      </span>
    </div>
  );
}
