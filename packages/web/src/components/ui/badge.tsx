import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'upstream' | 'local' | 'conflict' | 'new' | 'deleted' | 'renamed';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        variant === 'default' && 'bg-muted text-muted-foreground',
        variant === 'upstream' && 'bg-blue-500/20 text-blue-400',
        variant === 'local' && 'bg-green-500/20 text-green-400',
        variant === 'conflict' && 'bg-red-500/20 text-red-400',
        variant === 'new' && 'bg-purple-500/20 text-purple-400',
        variant === 'deleted' && 'bg-orange-500/20 text-orange-400',
        variant === 'renamed' && 'bg-fuchsia-500/20 text-fuchsia-400',
        className,
      )}
      {...props}
    />
  );
}
