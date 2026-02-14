import { CHANGE_TYPES, type ChangeType } from '@/lib/change-types';
import { cn } from '@/lib/utils';

interface TypeBadgeProps {
  type: ChangeType;
  size?: 'sm' | 'md';
}

export function TypeBadge({ type, size = 'sm' }: TypeBadgeProps) {
  const config = CHANGE_TYPES[type] ?? CHANGE_TYPES.upstream;
  const isSmall = size === 'sm';

  return (
    <span
      className={cn(
        'inline-flex items-center font-bold uppercase tracking-wider whitespace-nowrap rounded-pill font-sans',
        isSmall ? 'text-[9px] px-1.5 py-[1.5px]' : 'text-[10px] px-2 py-[2px]',
      )}
      style={{
        background: `var(--color-${config.colorVar}-bg)`,
        color: `var(--color-${config.colorVar})`,
        border: `1px solid var(--color-${config.colorVar}-bd)`,
        letterSpacing: '0.05em',
      }}
    >
      {config.label}
    </span>
  );
}
