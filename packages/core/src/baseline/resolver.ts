import type { FigmaClient } from '../figma/client.js';
import type { Version } from '../figma/types.js';
import { fetchVersions } from '../figma/fetcher.js';

export interface BaselineResult {
  /** The constructor version ID closest to the fork creation date. Empty if fallback two-way diff. */
  versionId: string;
  /** The timestamp of that constructor version. Empty if fallback two-way diff. */
  versionDate: string;
  /** The fork creation date (oldest version in fork history). Empty if unavailable. */
  forkCreatedAt: string;
  /** Warnings about potential inaccuracies */
  warnings: string[];
  /** When true, no baseline could be determined — fall back to two-way diff (upstream vs local only). */
  isTwoWayFallback: boolean;
}

/**
 * Resolves the baseline: finds the constructor version that was current
 * when the fork was created.
 *
 * Strategy:
 * 1. Fetch the fork's full version history → oldest entry = creation date
 * 2. Fetch the constructor's full version history
 * 3. Find the constructor version with created_at <= forkCreatedAt (closest before)
 */
export async function resolveBaseline(
  client: FigmaClient,
  constructorFileKey: string,
  forkFileKey: string,
): Promise<BaselineResult> {
  // Fetch both version histories in parallel
  const [constructorVersions, forkVersions] = await Promise.all([
    fetchVersions(client, constructorFileKey),
    fetchVersions(client, forkFileKey),
  ]);

  const warnings: string[] = [];

  // Fork creation date = oldest version in fork history
  if (forkVersions.length === 0) {
    warnings.push(
      'Fork file has no version history. Falling back to two-way diff (no change attribution).',
    );
    return {
      versionId: '',
      versionDate: '',
      forkCreatedAt: '',
      warnings,
      isTwoWayFallback: true,
    };
  }

  const forkCreatedAt = getForkCreationDate(forkVersions);

  if (constructorVersions.length === 0) {
    warnings.push(
      'Constructor file has no version history. Falling back to two-way diff (no change attribution).',
    );
    return {
      versionId: '',
      versionDate: '',
      forkCreatedAt,
      warnings,
      isTwoWayFallback: true,
    };
  }

  // Find the constructor version closest to (but not after) the fork creation date
  const match = findClosestVersion(constructorVersions, forkCreatedAt);

  if (match.type === 'exact' || match.type === 'before') {
    return {
      versionId: match.version.id,
      versionDate: match.version.created_at,
      forkCreatedAt,
      warnings,
      isTwoWayFallback: false,
    };
  }

  if (match.type === 'after_all') {
    // Fork was created before the earliest available constructor version
    // This means version history may be truncated
    warnings.push(
      `Fork was created (${forkCreatedAt}) before the earliest available constructor version (${match.version.created_at}). ` +
        'The constructor version history may be truncated. Baseline is approximate — using earliest available version.',
    );
    return {
      versionId: match.version.id,
      versionDate: match.version.created_at,
      forkCreatedAt,
      warnings,
      isTwoWayFallback: false,
    };
  }

  // Should never reach here
  throw new Error('Could not determine baseline version.');
}

/**
 * Get the fork creation date from its version history.
 * Figma returns versions newest-first, so the last entry is the oldest.
 */
function getForkCreationDate(versions: Version[]): string {
  // Versions are ordered newest-first from the API
  const oldest = versions[versions.length - 1]!;
  return oldest.created_at;
}

interface VersionMatch {
  type: 'exact' | 'before' | 'after_all';
  version: Version;
}

/**
 * Find the constructor version closest to the fork creation date.
 *
 * Figma returns versions newest-first. We want the latest version
 * whose created_at is <= forkCreatedAt.
 */
function findClosestVersion(
  versions: Version[],
  forkCreatedAt: string,
): VersionMatch {
  const forkTime = new Date(forkCreatedAt).getTime();

  // Versions are newest-first. Walk through to find the first one
  // that is <= forkCreatedAt (i.e., created before or at the fork time).
  for (const version of versions) {
    const versionTime = new Date(version.created_at).getTime();

    if (versionTime === forkTime) {
      return { type: 'exact', version };
    }

    if (versionTime <= forkTime) {
      return { type: 'before', version };
    }
  }

  // All constructor versions are after the fork date.
  // Use the oldest available version (last in the array).
  return { type: 'after_all', version: versions[versions.length - 1]! };
}
