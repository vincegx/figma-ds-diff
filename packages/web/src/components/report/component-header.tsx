'use client';

import { CHANGE_TYPES, type ChangeType } from '@/lib/change-types';
import { TypeBadge } from '@/components/shared/type-badge';
import type { ComponentDiff } from '@/types/report';

interface ComponentHeaderProps {
  component: ComponentDiff;
  onNext: () => void;
  constructorFileKey?: string;
  forkFileKey?: string;
}

function buildFigmaUrl(fileKey: string, nodeId: string): string {
  return `https://www.figma.com/design/${fileKey}/?node-id=${nodeId.replace(':', '-')}`;
}

export function ComponentHeader({ component, onNext, constructorFileKey, forkFileKey }: ComponentHeaderProps) {
  const config = CHANGE_TYPES[component.type];

  const upstreamUrl =
    constructorFileKey && component.upstreamNodeId
      ? buildFigmaUrl(constructorFileKey, component.upstreamNodeId)
      : null;

  const localUrl =
    forkFileKey && component.localNodeId
      ? buildFigmaUrl(forkFileKey, component.localNodeId)
      : null;

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
        <div className="flex items-center gap-2">
          {upstreamUrl && (
            <a
              href={upstreamUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 cursor-pointer font-sans transition-colors"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                color: 'var(--color-upstream)',
                padding: '6px 10px',
                borderRadius: 7,
                fontSize: 11,
                fontWeight: 600,
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-upstream)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-default)';
              }}
            >
              <FigmaIcon /> Upstream
            </a>
          )}
          {localUrl && (
            <a
              href={localUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 cursor-pointer font-sans transition-colors"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                color: 'var(--color-local)',
                padding: '6px 10px',
                borderRadius: 7,
                fontSize: 11,
                fontWeight: 600,
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-local)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-default)';
              }}
            >
              <FigmaIcon /> Local
            </a>
          )}
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

function FigmaIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 38 57" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z" fill="currentColor" opacity="0.8" />
      <path d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z" fill="currentColor" opacity="0.6" />
      <path d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z" fill="currentColor" opacity="0.6" />
      <path d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z" fill="currentColor" opacity="0.8" />
      <path d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z" fill="currentColor" />
    </svg>
  );
}
