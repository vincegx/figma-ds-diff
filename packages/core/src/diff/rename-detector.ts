/**
 * Rename detection for three-way diff results.
 *
 * After the initial three-way diff, looks for delete+add pairs
 * with high structural similarity and merges them into rename entries.
 *
 * Pairs checked:
 * - deleted_upstream + new_upstream → renamed_upstream
 * - deleted_local + new_local → renamed_local
 */

import type { DiffEntry, ChangeType } from './types.js';

/** Minimum similarity score (0–1) to consider a delete+add pair a rename */
const DEFAULT_SIMILARITY_THRESHOLD = 0.6;

export interface RenameDetectorOptions<T> {
  /**
   * Compute structural similarity between two values (0 = completely different, 1 = identical).
   * Name differences should be ignored since renames by definition change the name.
   */
  similarity: (a: T, b: T) => number;
  /** Minimum similarity score to consider a rename (default: 0.6) */
  threshold?: number;
}

/**
 * Detect renames in diff entries by matching high-similarity delete+add pairs.
 *
 * Returns a new array with rename pairs merged into single entries.
 * Unmatched deletes/adds are left unchanged.
 */
export function detectRenames<T>(
  entries: DiffEntry<T>[],
  options: RenameDetectorOptions<T>,
): DiffEntry<T>[] {
  const { similarity, threshold = DEFAULT_SIMILARITY_THRESHOLD } = options;

  // Separate entries by type
  const deletedUpstream: DiffEntry<T>[] = [];
  const newUpstream: DiffEntry<T>[] = [];
  const deletedLocal: DiffEntry<T>[] = [];
  const newLocal: DiffEntry<T>[] = [];
  const others: DiffEntry<T>[] = [];

  for (const entry of entries) {
    switch (entry.changeType) {
      case 'deleted_upstream':
        deletedUpstream.push(entry);
        break;
      case 'new_upstream':
        newUpstream.push(entry);
        break;
      case 'deleted_local':
        deletedLocal.push(entry);
        break;
      case 'new_local':
        newLocal.push(entry);
        break;
      default:
        others.push(entry);
        break;
    }
  }

  // Match pairs
  const upstreamRenames = matchRenamePairs(
    deletedUpstream,
    newUpstream,
    'renamed_upstream',
    similarity,
    threshold,
  );
  const localRenames = matchRenamePairs(
    deletedLocal,
    newLocal,
    'renamed_local',
    similarity,
    threshold,
  );

  // Combine: others + remaining unmatched + renames
  const result = [
    ...others,
    ...upstreamRenames.unmatchedDeleted,
    ...upstreamRenames.unmatchedNew,
    ...localRenames.unmatchedDeleted,
    ...localRenames.unmatchedNew,
    ...upstreamRenames.renames,
    ...localRenames.renames,
  ];

  // Re-sort by key for deterministic output
  result.sort((a, b) => a.key.localeCompare(b.key));

  return result;
}

interface MatchResult<T> {
  renames: DiffEntry<T>[];
  unmatchedDeleted: DiffEntry<T>[];
  unmatchedNew: DiffEntry<T>[];
}

function matchRenamePairs<T>(
  deleted: DiffEntry<T>[],
  added: DiffEntry<T>[],
  renameType: ChangeType,
  similarity: (a: T, b: T) => number,
  threshold: number,
): MatchResult<T> {
  const usedDeleted = new Set<number>();
  const usedAdded = new Set<number>();
  const renames: DiffEntry<T>[] = [];

  // Build similarity matrix and find best matches greedily
  const matches: Array<{ delIdx: number; addIdx: number; score: number }> = [];

  for (let di = 0; di < deleted.length; di++) {
    for (let ai = 0; ai < added.length; ai++) {
      const delEntry = deleted[di]!;
      const addEntry = added[ai]!;

      // Get the actual values to compare
      const delVal = delEntry.base; // deleted item's base state
      const addVal = renameType === 'renamed_upstream'
        ? addEntry.upstream // new upstream item's current state
        : addEntry.local;   // new local item's current state

      if (!delVal || !addVal) continue;

      const score = similarity(delVal, addVal);
      if (score >= threshold) {
        matches.push({ delIdx: di, addIdx: ai, score });
      }
    }
  }

  // Sort by score descending → pick best matches first
  matches.sort((a, b) => b.score - a.score);

  for (const match of matches) {
    if (usedDeleted.has(match.delIdx) || usedAdded.has(match.addIdx)) continue;

    usedDeleted.add(match.delIdx);
    usedAdded.add(match.addIdx);

    const delEntry = deleted[match.delIdx]!;
    const addEntry = added[match.addIdx]!;

    // Merge into a rename entry
    // Key = new name (destination of rename)
    // base = old value, upstream/local = new value
    renames.push({
      key: addEntry.key,
      changeType: renameType,
      base: delEntry.base,
      upstream: renameType === 'renamed_upstream' ? addEntry.upstream : delEntry.upstream,
      local: renameType === 'renamed_local' ? addEntry.local : delEntry.local,
      details: [
        `Renamed from "${delEntry.key}" to "${addEntry.key}"`,
        ...addEntry.details.filter(d => !d.startsWith('New ')),
      ],
    });
  }

  const unmatchedDeleted = deleted.filter((_, i) => !usedDeleted.has(i));
  const unmatchedNew = added.filter((_, i) => !usedAdded.has(i));

  return { renames, unmatchedDeleted, unmatchedNew };
}
