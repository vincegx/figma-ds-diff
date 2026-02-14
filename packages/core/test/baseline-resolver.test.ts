import { describe, it, expect, vi } from 'vitest';
import type { FigmaClient } from '../src/figma/client.js';
import { resolveBaseline } from '../src/baseline/resolver.js';

function makeVersion(id: string, createdAt: string) {
  return {
    id,
    created_at: createdAt,
    label: null,
    description: null,
    user: { handle: 'user', img_url: 'https://example.com/img.png' },
  };
}

function createMockClient(
  constructorVersions: ReturnType<typeof makeVersion>[],
  forkVersions: ReturnType<typeof makeVersion>[],
): FigmaClient {
  return {
    getFile: vi.fn(),
    getFileVersions: vi.fn().mockImplementation(async (fileKey: string) => {
      if (fileKey === 'constructor') {
        return { versions: constructorVersions };
      }
      return { versions: forkVersions };
    }),
    getFileComponents: vi.fn(),
    getFileStyles: vi.fn(),
    getFileNodes: vi.fn(),
    getImages: vi.fn(),
  };
}

describe('resolveBaseline', () => {
  it('finds exact matching version', async () => {
    const client = createMockClient(
      [
        makeVersion('v3', '2024-06-01T00:00:00Z'),
        makeVersion('v2', '2024-03-01T00:00:00Z'),
        makeVersion('v1', '2024-01-01T00:00:00Z'),
      ],
      [
        makeVersion('fork-v2', '2024-05-01T00:00:00Z'),
        makeVersion('fork-v1', '2024-03-01T00:00:00Z'), // fork created at same time as v2
      ],
    );

    const result = await resolveBaseline(client, 'constructor', 'fork');
    expect(result.versionId).toBe('v2');
    expect(result.forkCreatedAt).toBe('2024-03-01T00:00:00Z');
    expect(result.warnings).toHaveLength(0);
    expect(result.isTwoWayFallback).toBe(false);
  });

  it('finds closest version before fork date', async () => {
    const client = createMockClient(
      [
        makeVersion('v3', '2024-06-01T00:00:00Z'),
        makeVersion('v2', '2024-03-01T00:00:00Z'),
        makeVersion('v1', '2024-01-01T00:00:00Z'),
      ],
      [
        makeVersion('fork-v1', '2024-04-15T00:00:00Z'), // fork created between v2 and v3
      ],
    );

    const result = await resolveBaseline(client, 'constructor', 'fork');
    // Should pick v2 (2024-03-01) — the latest version before fork date (2024-04-15)
    expect(result.versionId).toBe('v2');
    expect(result.forkCreatedAt).toBe('2024-04-15T00:00:00Z');
    expect(result.warnings).toHaveLength(0);
  });

  it('picks latest version when fork is after all versions', async () => {
    const client = createMockClient(
      [
        makeVersion('v2', '2024-03-01T00:00:00Z'),
        makeVersion('v1', '2024-01-01T00:00:00Z'),
      ],
      [
        makeVersion('fork-v1', '2024-06-01T00:00:00Z'), // fork created after all constructor versions
      ],
    );

    const result = await resolveBaseline(client, 'constructor', 'fork');
    // Should pick v2 (latest, still before fork date)
    expect(result.versionId).toBe('v2');
    expect(result.warnings).toHaveLength(0);
  });

  it('uses earliest version with warning when fork predates all constructor versions', async () => {
    const client = createMockClient(
      [
        makeVersion('v2', '2024-06-01T00:00:00Z'),
        makeVersion('v1', '2024-03-01T00:00:00Z'),
      ],
      [
        makeVersion('fork-v1', '2024-01-01T00:00:00Z'), // fork created before any constructor version
      ],
    );

    const result = await resolveBaseline(client, 'constructor', 'fork');
    // Should use earliest available (v1) with a warning
    expect(result.versionId).toBe('v1');
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/truncated/);
    expect(result.warnings[0]).toMatch(/approximate/);
  });

  it('works with single constructor version that is before fork', async () => {
    const client = createMockClient(
      [makeVersion('v1', '2024-01-01T00:00:00Z')],
      [makeVersion('fork-v1', '2024-06-01T00:00:00Z')],
    );

    const result = await resolveBaseline(client, 'constructor', 'fork');
    expect(result.versionId).toBe('v1');
    expect(result.warnings).toHaveLength(0);
  });

  it('works with single constructor version that is after fork', async () => {
    const client = createMockClient(
      [makeVersion('v1', '2024-06-01T00:00:00Z')],
      [makeVersion('fork-v1', '2024-01-01T00:00:00Z')],
    );

    const result = await resolveBaseline(client, 'constructor', 'fork');
    expect(result.versionId).toBe('v1');
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/approximate/);
  });

  it('uses oldest fork version as creation date (versions are newest-first)', async () => {
    const client = createMockClient(
      [
        makeVersion('v3', '2024-06-01T00:00:00Z'),
        makeVersion('v2', '2024-04-01T00:00:00Z'),
        makeVersion('v1', '2024-01-01T00:00:00Z'),
      ],
      [
        makeVersion('fork-v3', '2024-08-01T00:00:00Z'),
        makeVersion('fork-v2', '2024-07-01T00:00:00Z'),
        makeVersion('fork-v1', '2024-05-01T00:00:00Z'), // oldest = creation date
      ],
    );

    const result = await resolveBaseline(client, 'constructor', 'fork');
    expect(result.forkCreatedAt).toBe('2024-05-01T00:00:00Z');
    // v2 (2024-04-01) is the latest constructor version before fork (2024-05-01)
    expect(result.versionId).toBe('v2');
  });

  it('returns two-way fallback when fork has no version history', async () => {
    const client = createMockClient(
      [makeVersion('v1', '2024-01-01T00:00:00Z')],
      [], // no fork versions
    );

    const result = await resolveBaseline(client, 'constructor', 'fork');
    expect(result.isTwoWayFallback).toBe(true);
    expect(result.versionId).toBe('');
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/Falling back to two-way diff/);
  });

  it('returns two-way fallback when constructor has no version history', async () => {
    const client = createMockClient(
      [], // no constructor versions
      [makeVersion('fork-v1', '2024-01-01T00:00:00Z')],
    );

    const result = await resolveBaseline(client, 'constructor', 'fork');
    expect(result.isTwoWayFallback).toBe(true);
    expect(result.versionId).toBe('');
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/Falling back to two-way diff/);
  });

  it('fetches both version histories in parallel', async () => {
    const getFileVersions = vi.fn().mockResolvedValue({
      versions: [makeVersion('v1', '2024-01-01T00:00:00Z')],
    });

    const client: FigmaClient = {
      getFile: vi.fn(),
      getFileVersions,
      getFileComponents: vi.fn(),
      getFileStyles: vi.fn(),
      getFileNodes: vi.fn(),
      getImages: vi.fn(),
    };

    await resolveBaseline(client, 'constructor', 'fork');
    // Both calls should have been made
    expect(getFileVersions).toHaveBeenCalledTimes(2);
  });
});
