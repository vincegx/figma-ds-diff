'use client';

import { CHANGE_TYPES, type ChangeType } from '@/lib/change-types';
import { TypeBadge } from '@/components/shared/type-badge';
import type { ComponentDiff } from '@/types/report';

interface ComponentHeaderProps {
  component: ComponentDiff;
  onNext: () => void;
}

export function ComponentHeader({ component, onNext }: ComponentHeaderProps) {
  const config = CHANGE_TYPES[component.type];

  return (
    <div
      style={{
        padding: '18px 28px',
        borderBottom: '1px solid var(--border-default)',
        background: `color-mix(in srgb, var(--color-${config.colorVar}) 3%, transparent)`,
      }}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <h2
          style={{
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
          }}
        >
          {component.name}
        </h2>
        <TypeBadge type={component.type} size="md" />
        <div className="flex-1" />
        <button
          onClick={onNext}
          className="cursor-pointer font-sans transition-colors"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-secondary)',
            padding: '6px 12px',
            borderRadius: 7,
            fontSize: 11,
            fontWeight: 600,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-default)';
          }}
        >
          Next →
        </button>
      </div>
      <div
        className="flex gap-3.5"
        style={{ fontSize: 11, color: 'var(--text-tertiary)' }}
      >
        <span>{component.group}</span>
        <span style={{ color: 'var(--text-muted)' }}>·</span>
        <span>
          Variants: {component.variants.base} base → {component.variants.upstream} upstream / {component.variants.local} local
        </span>
        {component.props.length > 0 && (
          <>
            <span style={{ color: 'var(--text-muted)' }}>·</span>
            <span>{component.props.length} property changes</span>
          </>
        )}
      </div>
    </div>
  );
}
