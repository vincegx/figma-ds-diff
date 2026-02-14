'use client';

import { useState } from 'react';
import type { ComponentDiff } from '@/types/report';
import { ConflictAlert } from './conflict-alert';
import { ComponentHeader } from './component-header';
import { ChangeSummaryChips } from './change-summary-chips';
import { VisualComparison } from './visual-comparison';
import { PropertyDiffTable } from './property-diff-table';

interface ComponentDetailProps {
  component: ComponentDiff;
  slug: string;
  onNext: () => void;
  constructorFileKey?: string;
  forkFileKey?: string;
}

export function ComponentDetail({ component, slug, onNext, constructorFileKey, forkFileKey }: ComponentDetailProps) {
  const conflictProps = component.props.filter((p) => p.status === 'conflict');
  const upstreamProps = component.props.filter((p) => p.status === 'upstream');
  const localProps = component.props.filter((p) => p.status === 'local');
  const isConflict = component.type === 'conflict';

  return (
    <div key={component.id} className="animate-fade-up">
      {/* Conflict alert — only for conflict components */}
      {isConflict && <ConflictAlert count={conflictProps.length} />}

      {/* Header */}
      <ComponentHeader
        component={component}
        onNext={onNext}
        constructorFileKey={constructorFileKey}
        forkFileKey={forkFileKey}
      />

      {/* Change summary chips */}
      <ChangeSummaryChips
        upstream={upstreamProps.length}
        local={localProps.length}
        conflicts={conflictProps.length}
      />

      {/* Visual comparison */}
      <VisualComparison component={component} slug={slug} />

      {/* Change details */}
      {component.details.length > 0 && (
        <ChangeDetails details={component.details} />
      )}

      {/* Property diff table */}
      <PropertyDiffTable props={component.props} />
    </div>
  );
}

function ChangeDetails({ details }: { details: string[] }) {
  const [open, setOpen] = useState(true);

  return (
    <div style={{ padding: '0 28px 16px' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 cursor-pointer w-full"
        style={{
          background: 'none',
          padding: '10px 0',
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--text-tertiary)',
          letterSpacing: '0.04em',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            transition: 'transform 150ms ease',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            fontSize: 8,
          }}
        >
          ▼
        </span>
        <span className="uppercase">Change Details</span>
        <span style={{ fontWeight: 500 }}>({details.length})</span>
      </button>
      {open && (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 8,
            padding: '10px 14px',
          }}
        >
          {details.map((detail, i) => (
            <div
              key={i}
              className="flex items-start gap-2"
              style={{
                padding: '5px 0',
                borderBottom: i < details.length - 1 ? '1px solid var(--border-default)' : undefined,
              }}
            >
              <span style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 2, flexShrink: 0 }}>•</span>
              <span
                className="font-mono"
                style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}
              >
                {detail}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
