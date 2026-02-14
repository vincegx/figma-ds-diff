const STEPS = ['Library URLs', 'Variables (opt.)', 'Generate'];

interface StepIndicatorProps {
  current: number;
}

export function StepIndicator({ current }: StepIndicatorProps) {
  return (
    <div className="flex gap-0.5 mb-7">
      {STEPS.map((label, i) => (
        <div key={label} className="flex-1">
          <div
            className="h-[3px] rounded-sm mb-1.5"
            style={{
              background: current > i
                ? 'linear-gradient(135deg, var(--accent-from), var(--accent-to))'
                : 'var(--border-default)',
              transition: 'all 0.3s',
            }}
          />
          <span
            className="text-[10px] font-semibold"
            style={{
              color: current > i ? 'var(--text-secondary)' : 'var(--text-muted)',
              letterSpacing: '0.04em',
            }}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
