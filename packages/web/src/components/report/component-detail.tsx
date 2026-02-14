'use client';

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
}

export function ComponentDetail({ component, slug, onNext }: ComponentDetailProps) {
  const conflictProps = component.props.filter((p) => p.status === 'conflict');
  const upstreamProps = component.props.filter((p) => p.status === 'upstream');
  const localProps = component.props.filter((p) => p.status === 'local');
  const isConflict = component.type === 'conflict';

  return (
    <div key={component.id} className="animate-fade-up">
      {/* Conflict alert — only for conflict components */}
      {isConflict && <ConflictAlert count={conflictProps.length} />}

      {/* Header */}
      <ComponentHeader component={component} onNext={onNext} />

      {/* Change summary chips */}
      <ChangeSummaryChips
        upstream={upstreamProps.length}
        local={localProps.length}
        conflicts={conflictProps.length}
      />

      {/* Visual comparison */}
      <VisualComparison component={component} slug={slug} />

      {/* Property diff table */}
      <PropertyDiffTable props={component.props} />
    </div>
  );
}
