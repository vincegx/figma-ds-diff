const STATUS_CONFIG = {
  upstream: { label: 'UP', colorVar: 'upstream' },
  local:    { label: 'YOU', colorVar: 'local' },
  conflict: { label: 'BOTH', colorVar: 'conflict' },
} as const;

interface PropStatusBadgeProps {
  status: 'upstream' | 'local' | 'conflict';
}

export function PropStatusBadge({ status }: PropStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.upstream;

  return (
    <span
      className="text-[8px] font-bold tracking-wider rounded-[3px] font-sans"
      style={{
        padding: '1px 5px',
        background: `color-mix(in srgb, var(--color-${config.colorVar}) 9%, transparent)`,
        color: `var(--color-${config.colorVar})`,
        letterSpacing: '0.06em',
      }}
    >
      {config.label}
    </span>
  );
}
