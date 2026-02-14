import type {
  FigmaClient,
  GetFileParams,
  GetFileNodesParams,
  GetImagesParams,
} from './client.js';
import type {
  GetFileResponse,
  GetFileComponentsResponse,
  GetFileStylesResponse,
  GetFileNodesResponse,
  GetImagesResponse,
  Version,
} from './types.js';

const BATCH_SIZE = 50;
const IMAGE_BATCH_SIZE = 10; // Images need smaller batches (Figma render timeout)

/** Pass-through to client.getFile */
export async function fetchFile(
  client: FigmaClient,
  fileKey: string,
  opts?: GetFileParams,
): Promise<GetFileResponse> {
  return client.getFile(fileKey, opts);
}

/** Auto-paginate all versions */
export async function fetchVersions(
  client: FigmaClient,
  fileKey: string,
): Promise<Version[]> {
  const allVersions: Version[] = [];
  let cursor: number | undefined;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const response = await client.getFileVersions(fileKey, cursor != null ? { cursor } : undefined);
    allVersions.push(...response.versions);

    const nextCursor = response.pagination?.before;
    if (nextCursor == null || response.versions.length === 0) {
      break;
    }
    cursor = nextCursor;
  }

  return allVersions;
}

/** Batch node IDs into chunks of 50, merge results */
export async function fetchNodes(
  client: FigmaClient,
  fileKey: string,
  nodeIds: string[],
  opts?: GetFileNodesParams,
): Promise<GetFileNodesResponse> {
  if (nodeIds.length === 0) {
    return { name: '', nodes: {} };
  }

  const chunks = chunkArray(nodeIds, BATCH_SIZE);
  let mergedName = '';
  const mergedNodes: GetFileNodesResponse['nodes'] = {};

  for (const chunk of chunks) {
    const response = await client.getFileNodes(fileKey, chunk, opts);
    if (!mergedName) mergedName = response.name;

    for (const [key, value] of Object.entries(response.nodes)) {
      mergedNodes[key] = value;
    }
  }

  return { name: mergedName, nodes: mergedNodes };
}

/** Batch image IDs into small chunks, merge results. Retries with halved batch on render timeout. */
export async function fetchImages(
  client: FigmaClient,
  fileKey: string,
  nodeIds: string[],
  opts?: GetImagesParams,
): Promise<GetImagesResponse> {
  if (nodeIds.length === 0) {
    return { images: {}, err: null };
  }

  const mergedImages: Record<string, string | null> = {};

  async function fetchChunk(ids: string[]): Promise<void> {
    try {
      const response = await client.getImages(fileKey, ids, opts);
      for (const [key, value] of Object.entries(response.images)) {
        mergedImages[key] = value;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Figma returns 400 "Render timeout" when batch is too large — retry with smaller chunks
      if (msg.includes('Render timeout') && ids.length > 1) {
        const mid = Math.ceil(ids.length / 2);
        await fetchChunk(ids.slice(0, mid));
        await fetchChunk(ids.slice(mid));
      } else {
        throw err;
      }
    }
  }

  const chunks = chunkArray(nodeIds, IMAGE_BATCH_SIZE);
  for (const chunk of chunks) {
    await fetchChunk(chunk);
  }

  return { images: mergedImages, err: null };
}

/** Pass-through to client.getFileComponents */
export async function fetchComponents(
  client: FigmaClient,
  fileKey: string,
): Promise<GetFileComponentsResponse> {
  return client.getFileComponents(fileKey);
}

/** Pass-through to client.getFileStyles */
export async function fetchStyles(
  client: FigmaClient,
  fileKey: string,
): Promise<GetFileStylesResponse> {
  return client.getFileStyles(fileKey);
}

// ── Helpers ────────────────────────────────────────────────────────────

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
