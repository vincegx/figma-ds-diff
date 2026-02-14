interface StatCardProps {
  label: string;
  value: string | number;
  color: string;
  sub?: string;
}

export function StatCard({ label, value, color, sub }: StatCardProps) {
  return (
    <div className="relative flex-1 min-w-[120px] overflow-hidden rounded-lg border border-border-default"
      style={{ background: 'var(--bg-surface)', padding: '18px 22px' }}
    >
      {/* Colored top bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] opacity-50"
        style={{ background: color }}
      />
      <div
        className="text-xs font-medium mb-1.5"
        style={{ color: 'var(--text-tertiary)', letterSpacing: '0.03em' }}
      >
        {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          className="text-[32px] font-bold leading-none"
          style={{ color, letterSpacing: '-0.03em' }}
        >
          {value}
        </span>
        {sub && (
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}
