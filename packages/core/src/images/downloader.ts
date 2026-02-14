/**
 * Batch-fetch component render PNGs from the Figma image API
 * and save them to a report's images/ folder.
 *
 * IMPORTANT: The Figma /v1/images endpoint does NOT support a `version`
 * parameter. We can only render nodes at the current file version.
 * Therefore, visual diff is a two-way comparison: upstream (constructor now)
 * vs local (fork now). The three-way data diff (Phase 4) still uses
 * base/upstream/local for structural comparison.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { FigmaClient } from '../figma/client.js';
import { fetchImages } from '../figma/fetcher.js';
import { visualDiff, type VisualDiffOptions } from '../diff/visual-diff.js';
import type { DiffEntry } from '../diff/types.js';
import type { NormalizedComponent } from '../normalize/components.js';

// ── Types ────────────────────────────────────────────────────────────────

export interface DownloadRequest {
  /** Figma file key */
  fileKey: string;
  /** Label for filenames: "upstream" or "local" */
  label: string;
  /** Node IDs to fetch renders for */
  nodeIds: string[];
}

export interface ImageEntry {
  /** Component key (path) */
  componentKey: string;
  /** Filename relative to images/ folder */
  filename: string;
  /** Version label: "upstream" or "local" */
  label: string;
  /** Node ID */
  nodeId: string;
}

export interface DiffImageEntry {
  /** Component key (path) */
  componentKey: string;
  /** Filename of the diff overlay */
  filename: string;
  /** Comparison label */
  comparison: string;
  /** Diff percentage (0-100) */
  diffPercent: number;
  /** Number of different pixels */
  diffPixels: number;
  /** Total pixels */
  totalPixels: number;
}

export interface DownloadResult {
  /** All downloaded component images */
  images: ImageEntry[];
  /** All generated diff overlays */
  diffs: DiffImageEntry[];
  /** Warnings (e.g. null renders) */
  warnings: string[];
}

export interface DownloadOptions {
  /** Image scale (default: 2) */
  scale?: number;
  /** Image format (default: 'png') */
  format?: 'png' | 'jpg' | 'svg' | 'pdf';
  /** Visual diff options */
  diffOptions?: VisualDiffOptions;
  /** Progress callback */
  onProgress?: (step: string) => void;
  /** Max retry attempts per image download (default: 3) */
  maxRetries?: number;
}

// ── Main function ────────────────────────────────────────────────────────

/**
 * Download component render images for all changed components
 * and generate pixel-diff overlays.
 *
 * Fetches current renders for upstream (constructor) and local (fork),
 * then generates pixel-diff overlays between them.
 *
 * Note: Figma's image API cannot render historical versions, so we only
 * compare current upstream vs current local visually.
 *
 * @param client - Figma API client
 * @param componentDiffs - Diff entries for components
 * @param constructorFileKey - Constructor file key
 * @param forkFileKey - Fork file key
 * @param imagesDir - Directory to save images to
 * @param options - Download options
 */
export async function downloadComponentImages(
  client: FigmaClient,
  componentDiffs: DiffEntry<NormalizedComponent>[],
  constructorFileKey: string,
  forkFileKey: string,
  imagesDir: string,
  options: DownloadOptions = {},
): Promise<DownloadResult> {
  const { scale = 2, format = 'png', diffOptions, onProgress, maxRetries = 3 } = options;

  await mkdir(imagesDir, { recursive: true });

  const result: DownloadResult = {
    images: [],
    diffs: [],
    warnings: [],
  };

  // Collect node IDs per file (upstream = constructor, local = fork)
  const upstreamNodeIds: string[] = [];
  const localNodeIds: string[] = [];

  // Map: nodeId → componentKey for each version
  const upstreamNodeMap = new Map<string, string>();
  const localNodeMap = new Map<string, string>();

  for (const entry of componentDiffs) {
    if (entry.upstream) {
      upstreamNodeIds.push(entry.upstream.nodeId);
      upstreamNodeMap.set(entry.upstream.nodeId, entry.key);
    }
    if (entry.local) {
      localNodeIds.push(entry.local.nodeId);
      localNodeMap.set(entry.local.nodeId, entry.key);
    }
  }

  // Fetch image URLs from Figma API (batched, in parallel)
  onProgress?.('Fetching image URLs from Figma...');

  const imgParams = { scale, format };

  const [upstreamUrls, localUrls] = await Promise.all([
    upstreamNodeIds.length > 0
      ? fetchImageUrls(client, constructorFileKey, upstreamNodeIds, imgParams)
      : new Map<string, string>(),
    localNodeIds.length > 0
      ? fetchImageUrls(client, forkFileKey, localNodeIds, imgParams)
      : new Map<string, string>(),
  ]);

  // Download all PNGs
  onProgress?.('Downloading component renders...');

  const downloadedBuffers = new Map<string, Buffer>(); // filename → buffer

  await downloadBatch(
    upstreamUrls, upstreamNodeMap, 'upstream', imagesDir, result, downloadedBuffers, maxRetries,
  );
  await downloadBatch(
    localUrls, localNodeMap, 'local', imagesDir, result, downloadedBuffers, maxRetries,
  );

  // Generate diff overlays (upstream vs local)
  onProgress?.('Generating pixel diff overlays...');

  for (const entry of componentDiffs) {
    const safeName = sanitizeFilename(entry.key);

    const upstreamFile = `${safeName}_upstream.png`;
    const localFile = `${safeName}_local.png`;

    const upstreamBuf = downloadedBuffers.get(upstreamFile);
    const localBuf = downloadedBuffers.get(localFile);

    // Only generate diff when both upstream and local renders exist
    if (upstreamBuf && localBuf) {
      try {
        const diffResult = await visualDiff(upstreamBuf, localBuf, diffOptions);
        const diffFilename = `${safeName}_diff.png`;
        await writeFile(join(imagesDir, diffFilename), diffResult.diffImage);
        result.diffs.push({
          componentKey: entry.key,
          filename: diffFilename,
          comparison: 'upstream_vs_local',
          diffPercent: diffResult.diffPercent,
          diffPixels: diffResult.diffPixels,
          totalPixels: diffResult.totalPixels,
        });
      } catch {
        result.warnings.push(`Failed to generate diff overlay for "${entry.key}"`);
      }
    }
  }

  onProgress?.(`Downloaded ${result.images.length} images, generated ${result.diffs.length} diff overlays`);

  return result;
}

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Fetch image URLs from Figma API.
 * Returns a Map of nodeId → imageUrl.
 */
async function fetchImageUrls(
  client: FigmaClient,
  fileKey: string,
  nodeIds: string[],
  params: { scale: number; format: string },
): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>();

  const response = await fetchImages(client, fileKey, nodeIds, {
    scale: params.scale,
    format: params.format as 'png' | 'jpg' | 'svg' | 'pdf',
  });

  for (const [nodeId, url] of Object.entries(response.images)) {
    if (url) {
      urlMap.set(nodeId, url);
    }
  }

  return urlMap;
}

/**
 * Download a batch of images and save to disk with retry logic.
 */
async function downloadBatch(
  urls: Map<string, string>,
  nodeMap: Map<string, string>,
  label: string,
  imagesDir: string,
  result: DownloadResult,
  bufferStore: Map<string, Buffer>,
  maxRetries: number,
): Promise<void> {
  const downloads = Array.from(urls.entries()).map(async ([nodeId, url]) => {
    const componentKey = nodeMap.get(nodeId);
    if (!componentKey) return;

    const safeName = sanitizeFilename(componentKey);
    const filename = `${safeName}_${label}.png`;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url);

        // Non-retryable client errors (4xx except 429)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          result.warnings.push(
            `Failed to download ${label} image for "${componentKey}": HTTP ${response.status}`,
          );
          return;
        }

        // Retryable: 429 or 5xx
        if (!response.ok) {
          if (attempt < maxRetries) {
            await backoff(attempt);
            continue;
          }
          result.warnings.push(
            `Failed to download ${label} image for "${componentKey}": HTTP ${response.status} after ${maxRetries + 1} attempts`,
          );
          return;
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        await writeFile(join(imagesDir, filename), buffer);
        bufferStore.set(filename, buffer);

        result.images.push({
          componentKey,
          filename,
          label,
          nodeId,
        });
        return; // success
      } catch {
        if (attempt < maxRetries) {
          await backoff(attempt);
          continue;
        }
        result.warnings.push(
          `Failed to download ${label} image for "${componentKey}": network error after ${maxRetries + 1} attempts`,
        );
      }
    }
  });

  // Download in parallel with concurrency limit
  const CONCURRENCY = 10;
  for (let i = 0; i < downloads.length; i += CONCURRENCY) {
    await Promise.all(downloads.slice(i, i + CONCURRENCY));
  }
}

/** Exponential backoff for retries */
function backoff(attempt: number): Promise<void> {
  const ms = Math.min(500 * 2 ** attempt, 10_000);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Convert a component path to a safe filename.
 * "Page/Frame/Button" → "page_frame_button"
 */
export function sanitizeFilename(path: string): string {
  return path
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 100);
}
