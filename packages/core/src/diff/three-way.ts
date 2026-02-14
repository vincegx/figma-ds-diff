/**
 * Generic three-way diff algorithm.
 *
 * Takes three Maps (base, upstream, local) keyed by the same key type,
 * and returns DiffEntry[] with change attribution per the spec:
 *
 * | Base vs Upstream | Base vs Local | Result            |
 * |------------------|---------------|-------------------|
 * | Same             | Same          | unchanged         |
 * | Different        | Same          | upstream_changed  |
 * | Same             | Different     | local_changed     |
 * | Different        | Different     | conflict          |
 * | Not in Base      | In Upstream   | new_upstream      |
 * | Not in Base      | In Local      | new_local         |
 * | In Base          | Not in Upstream| deleted_upstream |
 * | In Base          | Not in Local  | deleted_local     |
 */

import type { ChangeType, DiffEntry } from './types.js';

export interface ThreeWayOptions<T> {
  /**
   * Compare two values for equality.
   * Default: JSON.stringify deep equality.
   */
  isEqual?: (a: T, b: T) => boolean;

  /**
   * Generate human-readable detail strings describing what changed.
   * Called only when items differ.
   */
  describeChanges?: (key: string, base: T | undefined, upstream: T | undefined, local: T | undefined) => string[];
}

/**
 * Perform a three-way diff between base, upstream, and local states.
 *
 * @param base - State at fork time
 * @param upstream - Constructor's current state
 * @param local - Fork's current state
 * @param options - Comparison and description options
 * @returns Array of DiffEntry, excluding unchanged items
 */
export function threeWayDiff<T>(
  base: Map<string, T>,
  upstream: Map<string, T>,
  local: Map<string, T>,
  options: ThreeWayOptions<T> = {},
): DiffEntry<T>[] {
  const {
    isEqual = defaultIsEqual,
    describeChanges = defaultDescribeChanges,
  } = options;

  const result: DiffEntry<T>[] = [];

  // Collect all unique keys across all three maps
  const allKeys = new Set<string>([
    ...base.keys(),
    ...upstream.keys(),
    ...local.keys(),
  ]);

  for (const key of allKeys) {
    const inBase = base.has(key);
    const inUpstream = upstream.has(key);
    const inLocal = local.has(key);

    const baseVal = base.get(key);
    const upstreamVal = upstream.get(key);
    const localVal = local.get(key);

    const changeType = attributeChange(
      inBase,
      inUpstream,
      inLocal,
      baseVal,
      upstreamVal,
      localVal,
      isEqual,
    );

    // Skip unchanged items
    if (changeType === 'unchanged') continue;

    result.push({
      key,
      changeType,
      base: baseVal,
      upstream: upstreamVal,
      local: localVal,
      details: describeChanges(key, baseVal, upstreamVal, localVal),
    });
  }

  // Sort by key for deterministic output
  result.sort((a, b) => a.key.localeCompare(b.key));

  return result;
}

function attributeChange<T>(
  inBase: boolean,
  inUpstream: boolean,
  inLocal: boolean,
  baseVal: T | undefined,
  upstreamVal: T | undefined,
  localVal: T | undefined,
  isEqual: (a: T, b: T) => boolean,
): ChangeType {
  // Item exists in all three
  if (inBase && inUpstream && inLocal) {
    const baseUpstreamSame = isEqual(baseVal as T, upstreamVal as T);
    const baseLocalSame = isEqual(baseVal as T, localVal as T);

    if (baseUpstreamSame && baseLocalSame) return 'unchanged';
    if (!baseUpstreamSame && baseLocalSame) return 'upstream_changed';
    if (baseUpstreamSame && !baseLocalSame) return 'local_changed';
    return 'conflict'; // both changed
  }

  // New item (not in base)
  if (!inBase) {
    if (inUpstream && !inLocal) return 'new_upstream';
    if (!inUpstream && inLocal) return 'new_local';
    if (inUpstream && inLocal) {
      // Both added it — if same value, treat as new_upstream (harmless),
      // otherwise conflict
      if (isEqual(upstreamVal as T, localVal as T)) return 'new_upstream';
      return 'conflict';
    }
    // Not in any — shouldn't happen since we iterate allKeys
    return 'unchanged';
  }

  // Item was in base but removed from one or both
  if (!inUpstream && inLocal) return 'deleted_upstream';
  if (inUpstream && !inLocal) return 'deleted_local';
  // Deleted from both
  return 'unchanged';
}

function defaultIsEqual<T>(a: T, b: T): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function defaultDescribeChanges<T>(
  key: string,
  _base: T | undefined,
  _upstream: T | undefined,
  _local: T | undefined,
): string[] {
  return [`"${key}" changed`];
}
