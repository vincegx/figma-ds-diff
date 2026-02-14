import type { ChangeType } from '@/lib/change-types';

export interface ReportData {
  meta: {
    constructorName: string;
    forkName: string;
    constructorFileKey?: string;
    forkFileKey?: string;
    baseline: string;
    date: string;
    summary: { upstream: number; local: number; conflicts: number; total: number };
  };
  components: ComponentDiff[];
  styles: StyleDiff[];
  variables?: VariableDiff[];
}

export interface ComponentDiff {
  id: string;
  name: string;
  group: string;
  type: ChangeType;
  diffPct: number;
  upstreamNodeId?: string;
  localNodeId?: string;
  variants: { base: number; upstream: number; local: number };
  details: string[];
  props: PropertyDiff[];
  images: {
    base?: string;
    upstream?: string;
    local?: string;
    diff?: string;
  };
}

export interface PropertyDiff {
  name: string;
  base: string;
  upstream: string;
  local: string;
  status: 'upstream' | 'local' | 'conflict';
}

export interface StyleDiff {
  name: string;
  type: 'color' | 'text' | 'effect';
  base: string;
  upstream: string;
  local: string;
  status: 'upstream' | 'local' | 'conflict';
}

export interface VariableDiff {
  name: string;
  collection: string;
  base: string;
  upstream: string;
  local: string;
  status: 'upstream' | 'local' | 'conflict';
}
