import { CHANGE_TYPES, type ChangeType } from '@/lib/change-types';

interface StatusDotProps {
  type: ChangeType;
  size?: number;
}

export function StatusDot({ type, size = 8 }: StatusDotProps) {
  const config = CHANGE_TYPES[type] ?? CHANGE_TYPES.upstream;

  return (
    <div
      className="shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        background: `var(--color-${config.colorVar})`,
        boxShadow: `0 0 6px color-mix(in srgb, var(--color-${config.colorVar}) 25%, transparent)`,
      }}
    />
  );
}
