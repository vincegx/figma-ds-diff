import { describe, it, expect, vi } from 'vitest';
import type { FigmaClient } from '../src/figma/client.js';
import {
  fetchFile,
  fetchVersions,
  fetchNodes,
  fetchImages,
  fetchComponents,
  fetchStyles,
} from '../src/figma/fetcher.js';

function createMockClient(overrides: Partial<FigmaClient> = {}): FigmaClient {
  return {
    getFile: vi.fn().mockResolvedValue({
      name: 'Test',
      version: '1',
      document: { id: '0:0', name: 'Document', type: 'DOCUMENT' },
      components: {},
      styles: {},
    }),
    getFileVersions: vi.fn().mockResolvedValue({
      versions: [],
    }),
    getFileComponents: vi.fn().mockResolvedValue({
      meta: { components: [] },
    }),
    getFileStyles: vi.fn().mockResolvedValue({
      meta: { styles: [] },
    }),
    getFileNodes: vi.fn().mockResolvedValue({
      name: 'Test',
      nodes: {},
    }),
    getImages: vi.fn().mockResolvedValue({
      images: {},
      err: null,
    }),
    ...overrides,
  };
}

describe('fetchFile', () => {
  it('passes through to client.getFile', async () => {
    const client = createMockClient();
    await fetchFile(client, 'abc123', { version: 'v1' });
    expect(client.getFile).toHaveBeenCalledWith('abc123', { version: 'v1' });
  });
});

describe('fetchVersions', () => {
  it('returns all versions from a single page', async () => {
    const client = createMockClient({
      getFileVersions: vi.fn().mockResolvedValue({
        versions: [
          { id: 'v1', created_at: '2024-01-01T00:00:00Z', user: { handle: 'u', img_url: '' } },
          { id: 'v2', created_at: '2024-01-02T00:00:00Z', user: { handle: 'u', img_url: '' } },
        ],
      }),
    });

    const versions = await fetchVersions(client, 'abc123');
    expect(versions).toHaveLength(2);
    expect(client.getFileVersions).toHaveBeenCalledTimes(1);
  });

  it('auto-paginates across multiple pages', async () => {
    const getFileVersions = vi.fn()
      .mockResolvedValueOnce({
        versions: [
          { id: 'v1', created_at: '2024-01-01', user: { handle: 'u', img_url: '' } },
        ],
        pagination: { before: 12345 },
      })
      .mockResolvedValueOnce({
        versions: [
          { id: 'v2', created_at: '2024-01-02', user: { handle: 'u', img_url: '' } },
        ],
        // No pagination = last page
      });

    const client = createMockClient({ getFileVersions });

    const versions = await fetchVersions(client, 'abc123');
    expect(versions).toHaveLength(2);
    expect(versions[0]!.id).toBe('v1');
    expect(versions[1]!.id).toBe('v2');
    expect(getFileVersions).toHaveBeenCalledTimes(2);
    expect(getFileVersions).toHaveBeenNthCalledWith(2, 'abc123', { cursor: 12345 });
  });
});

describe('fetchNodes', () => {
  it('returns empty result for empty nodeIds', async () => {
    const client = createMockClient();
    const result = await fetchNodes(client, 'abc123', []);
    expect(result.nodes).toEqual({});
    expect(client.getFileNodes).not.toHaveBeenCalled();
  });

  it('makes a single call for <= 50 IDs', async () => {
    const ids = Array.from({ length: 10 }, (_, i) => `${i}:0`);
    const client = createMockClient({
      getFileNodes: vi.fn().mockResolvedValue({
        name: 'Test',
        nodes: Object.fromEntries(ids.map((id) => [id, { document: { id, name: 'N', type: 'FRAME' } }])),
      }),
    });

    const result = await fetchNodes(client, 'abc123', ids);
    expect(Object.keys(result.nodes)).toHaveLength(10);
    expect(client.getFileNodes).toHaveBeenCalledTimes(1);
  });

  it('batches 51 IDs into 2 calls', async () => {
    const ids = Array.from({ length: 51 }, (_, i) => `${i}:0`);
    let callCount = 0;

    const getFileNodes = vi.fn().mockImplementation(async (_fileKey: string, chunk: string[]) => {
      callCount++;
      return {
        name: 'Test',
        nodes: Object.fromEntries(chunk.map((id) => [id, { document: { id, name: 'N', type: 'FRAME' } }])),
      };
    });

    const client = createMockClient({ getFileNodes });
    const result = await fetchNodes(client, 'abc123', ids);

    expect(callCount).toBe(2);
    expect(Object.keys(result.nodes)).toHaveLength(51);

    // First call gets 50, second gets 1
    const firstCallIds = getFileNodes.mock.calls[0]![1] as string[];
    const secondCallIds = getFileNodes.mock.calls[1]![1] as string[];
    expect(firstCallIds).toHaveLength(50);
    expect(secondCallIds).toHaveLength(1);
  });
});

describe('fetchImages', () => {
  it('returns empty result for empty nodeIds', async () => {
    const client = createMockClient();
    const result = await fetchImages(client, 'abc123', []);
    expect(result.images).toEqual({});
    expect(client.getImages).not.toHaveBeenCalled();
  });

  it('batches 51 IDs into multiple calls (batch size 10) and merges images', async () => {
    const ids = Array.from({ length: 51 }, (_, i) => `${i}:0`);

    const getImages = vi.fn().mockImplementation(async (_fileKey: string, chunk: string[]) => ({
      images: Object.fromEntries(chunk.map((id) => [id, `https://example.com/${id}.png`])),
      err: null,
    }));

    const client = createMockClient({ getImages });
    const result = await fetchImages(client, 'abc123', ids, { scale: 2, format: 'png' });

    // 51 IDs / batch size 10 = 6 calls
    expect(getImages).toHaveBeenCalledTimes(6);
    expect(Object.keys(result.images)).toHaveLength(51);

    // Verify opts are passed through
    expect(getImages).toHaveBeenCalledWith('abc123', expect.any(Array), { scale: 2, format: 'png' });
  });
});

describe('fetchComponents', () => {
  it('passes through to client.getFileComponents', async () => {
    const client = createMockClient();
    await fetchComponents(client, 'abc123');
    expect(client.getFileComponents).toHaveBeenCalledWith('abc123');
  });
});

describe('fetchStyles', () => {
  it('passes through to client.getFileStyles', async () => {
    const client = createMockClient();
    await fetchStyles(client, 'abc123');
    expect(client.getFileStyles).toHaveBeenCalledWith('abc123');
  });
});
