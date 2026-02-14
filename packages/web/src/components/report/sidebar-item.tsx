'use client';

import { CHANGE_TYPES, type ChangeType } from '@/lib/change-types';
import { StatusDot } from '@/components/shared/status-dot';

interface SidebarItemProps {
  name: string;
  type: ChangeType;
  diffPct: number;
  active: boolean;
  onClick: () => void;
}

export function SidebarItem({ name, type, diffPct, active, onClick }: SidebarItemProps) {
  const config = CHANGE_TYPES[type];

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left cursor-pointer transition-colors"
      style={{
        borderRadius: 7,
        background: active ? 'var(--bg-surface-active)' : undefined,
        borderLeft: active ? `2px solid var(--color-${config.colorVar})` : '2px solid transparent',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = 'var(--bg-surface-hover)';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = '';
      }}
    >
      <StatusDot type={type} size={6} />
      <span
        className="flex-1 truncate"
        style={{
          fontSize: 12,
          fontWeight: active ? 650 : 500,
          color: 'var(--text-primary)',
        }}
      >
        {name}
      </span>
      {diffPct > 0 && (
        <span
          className="shrink-0 font-mono"
          style={{ fontSize: 10, color: 'var(--text-tertiary)' }}
        >
          {diffPct}%
        </span>
      )}
    </button>
  );
}
