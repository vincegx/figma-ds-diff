/**
 * Core types for the three-way diff engine.
 */

/** How a change is attributed between base, upstream, and local */
export type ChangeType =
  | 'unchanged'
  | 'upstream_changed'
  | 'local_changed'
  | 'conflict'
  | 'new_upstream'
  | 'new_local'
  | 'deleted_upstream'
  | 'deleted_local'
  | 'renamed_upstream'
  | 'renamed_local';

/** A single diff entry comparing base/upstream/local states of an item */
export interface DiffEntry<T> {
  /** Unique key identifying the item (path for components, name for styles) */
  key: string;
  /** How the change is attributed */
  changeType: ChangeType;
  /** Base state (at fork time). Undefined if item didn't exist in base. */
  base: T | undefined;
  /** Upstream state (constructor now). Undefined if item was deleted upstream. */
  upstream: T | undefined;
  /** Local state (fork now). Undefined if item was deleted locally. */
  local: T | undefined;
  /** Human-readable details about what changed */
  details: string[];
}

/** Summary statistics for a diff report */
export interface DiffSummary {
  total: number;
  unchanged: number;
  upstreamChanges: number;
  localChanges: number;
  conflicts: number;
  newUpstream: number;
  newLocal: number;
  deletedUpstream: number;
  deletedLocal: number;
  renamedUpstream: number;
  renamedLocal: number;
}

/** Full diff report combining all asset types */
export interface DiffReport {
  /** Constructor file name */
  constructorName: string;
  /** Fork file name */
  forkName: string;
  /** Baseline version used */
  baselineVersionId: string;
  /** Baseline version date */
  baselineVersionDate: string;
  /** When the report was generated */
  generatedAt: string;
  /** Component diffs */
  components: DiffEntry<unknown>[];
  /** Style diffs */
  styles: DiffEntry<unknown>[];
  /** Variable diffs (empty if no JSON uploaded) */
  variables: DiffEntry<unknown>[];
  /** Summary stats */
  summary: DiffSummary;
}

/** Compute summary stats from diff entries */
export function computeSummary(
  entries: DiffEntry<unknown>[],
): DiffSummary {
  const summary: DiffSummary = {
    total: entries.length,
    unchanged: 0,
    upstreamChanges: 0,
    localChanges: 0,
    conflicts: 0,
    newUpstream: 0,
    newLocal: 0,
    deletedUpstream: 0,
    deletedLocal: 0,
    renamedUpstream: 0,
    renamedLocal: 0,
  };

  for (const entry of entries) {
    switch (entry.changeType) {
      case 'unchanged':
        summary.unchanged++;
        break;
      case 'upstream_changed':
        summary.upstreamChanges++;
        break;
      case 'local_changed':
        summary.localChanges++;
        break;
      case 'conflict':
        summary.conflicts++;
        break;
      case 'new_upstream':
        summary.newUpstream++;
        break;
      case 'new_local':
        summary.newLocal++;
        break;
      case 'deleted_upstream':
        summary.deletedUpstream++;
        break;
      case 'deleted_local':
        summary.deletedLocal++;
        break;
      case 'renamed_upstream':
        summary.renamedUpstream++;
        break;
      case 'renamed_local':
        summary.renamedLocal++;
        break;
    }
  }

  return summary;
}
