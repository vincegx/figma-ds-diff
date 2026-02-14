import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { downloadComponentImages, sanitizeFilename } from '../src/images/downloader.js';
import type { FigmaClient } from '../src/figma/client.js';
import type { DiffEntry } from '../src/diff/types.js';
import type { NormalizedComponent } from '../src/normalize/components.js';

function makeComponent(name: string, nodeId: string): NormalizedComponent {
  return {
    name,
    path: `Page/${name}`,
    nodeId,
    description: '',
    variants: [],
    properties: [],
    strippedNode: null,
  };
}

function makeDiffEntry(
  key: string,
  changeType: DiffEntry<NormalizedComponent>['changeType'],
  base?: NormalizedComponent,
  upstream?: NormalizedComponent,
  local?: NormalizedComponent,
): DiffEntry<NormalizedComponent> {
  return { key, changeType, base, upstream, local, details: [] };
}

// 1x1 red PNG (minimal valid PNG)
const RED_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
  'base64',
);
// 1x1 blue PNG
const BLUE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==',
  'base64',
);

describe('sanitizeFilename', () => {
  it('converts path to safe filename', () => {
    expect(sanitizeFilename('Page/Frame/Button')).toBe('page_frame_button');
  });

  it('handles special characters', () => {
    expect(sanitizeFilename('Icons / 24px / Arrow-Left')).toBe('icons_24px_arrow_left');
  });

  it('trims leading/trailing underscores', () => {
    expect(sanitizeFilename('/Leading/Trailing/')).toBe('leading_trailing');
  });

  it('truncates to 100 chars', () => {
    const long = 'a'.repeat(200);
    expect(sanitizeFilename(long).length).toBeLessThanOrEqual(100);
  });
});

describe('downloadComponentImages', () => {
  let tmpDir: string;
  let imagesDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'dl-test-'));
    imagesDir = join(tmpDir, 'images');
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  function mockClient(imageUrls: Record<string, string | null>): FigmaClient {
    return {
      getFile: vi.fn(),
      getFileVersions: vi.fn(),
      getFileComponents: vi.fn(),
      getFileStyles: vi.fn(),
      getFileNodes: vi.fn(),
      getImages: vi.fn().mockResolvedValue({
        images: imageUrls,
        err: null,
      }),
    };
  }

  it('handles empty diff entries', async () => {
    const client = mockClient({});
    const result = await downloadComponentImages(
      client, [], 'fileA', 'fileB', imagesDir,
    );

    expect(result.images).toHaveLength(0);
    expect(result.diffs).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('downloads upstream and local images for changed component', async () => {
    const upComp = makeComponent('Button', '1:1');
    const locComp = makeComponent('Button', '2:1');
    const entries: DiffEntry<NormalizedComponent>[] = [
      makeDiffEntry('Page/Button', 'upstream_changed', upComp, upComp, locComp),
    ];

    // Mock fetch for downloading PNGs
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.startsWith('https://figma-')) {
        return Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(RED_PNG.buffer.slice(RED_PNG.byteOffset, RED_PNG.byteOffset + RED_PNG.byteLength)),
        });
      }
      return originalFetch(url);
    });

    const client = mockClient({ '1:1': 'https://figma-cdn/img1.png', '2:1': 'https://figma-cdn/img2.png' });

    try {
      const result = await downloadComponentImages(
        client, entries, 'constructorKey', 'forkKey', imagesDir,
      );

      expect(result.images.length).toBeGreaterThan(0);
      // Should have upstream and local images (no base — API limitation)
      const labels = result.images.map((i) => i.label);
      expect(labels).toContain('upstream');
      expect(labels).toContain('local');

      // Verify files exist on disk
      const files = await readdir(imagesDir);
      expect(files.length).toBeGreaterThan(0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('handles null image URLs (non-renderable nodes)', async () => {
    const comp = makeComponent('Icon', '2:2');
    const entries: DiffEntry<NormalizedComponent>[] = [
      makeDiffEntry('Page/Icon', 'upstream_changed', comp, comp, comp),
    ];

    const client = mockClient({ '2:2': null });

    const result = await downloadComponentImages(
      client, entries, 'fk1', 'fk2', imagesDir,
    );

    // No images downloaded since URL was null
    expect(result.images).toHaveLength(0);
  });

  it('generates upstream_vs_local diff overlays', async () => {
    const upComp = makeComponent('Card', '3:1');
    const locComp = makeComponent('Card', '3:2');
    const entries: DiffEntry<NormalizedComponent>[] = [
      makeDiffEntry('Page/Card', 'upstream_changed', upComp, upComp, locComp),
    ];

    // Mock fetch: upstream returns RED, local returns BLUE
    const originalFetch = globalThis.fetch;
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.startsWith('https://figma-')) {
        callCount++;
        const buf = callCount <= 1 ? RED_PNG : BLUE_PNG;
        return Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)),
        });
      }
      return originalFetch(url);
    });

    const client: FigmaClient = {
      getFile: vi.fn(),
      getFileVersions: vi.fn(),
      getFileComponents: vi.fn(),
      getFileStyles: vi.fn(),
      getFileNodes: vi.fn(),
      getImages: vi.fn().mockImplementation((_fileKey: string, ids: string[]) => {
        const images: Record<string, string | null> = {};
        for (const id of ids) {
          images[id] = `https://figma-cdn/${id}.png`;
        }
        return Promise.resolve({ images, err: null });
      }),
    };

    try {
      const result = await downloadComponentImages(
        client, entries, 'fk1', 'fk2', imagesDir,
      );

      // Should have upstream_vs_local diff
      expect(result.diffs.length).toBeGreaterThanOrEqual(1);
      expect(result.diffs[0]?.comparison).toBe('upstream_vs_local');

      // Check files on disk
      const files = await readdir(imagesDir);
      expect(files.length).toBeGreaterThan(0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('records warnings for failed downloads', async () => {
    const comp = makeComponent('Broken', '4:1');
    const entries: DiffEntry<NormalizedComponent>[] = [
      makeDiffEntry('Page/Broken', 'upstream_changed', comp, comp, comp),
    ];

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.startsWith('https://figma-')) {
        return Promise.resolve({ ok: false, status: 500 });
      }
      return originalFetch(url);
    });

    const client = mockClient({ '4:1': 'https://figma-cdn/broken.png' });

    try {
      const result = await downloadComponentImages(
        client, entries, 'fk1', 'fk2', imagesDir,
        { maxRetries: 0 },
      );

      expect(result.warnings.length).toBeGreaterThan(0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('calls onProgress callback', async () => {
    const client = mockClient({});
    const progress: string[] = [];
    await downloadComponentImages(
      client, [], 'fk1', 'fk2', imagesDir,
      { onProgress: (step) => progress.push(step) },
    );

    expect(progress.length).toBeGreaterThan(0);
    expect(progress.some((p) => p.includes('image'))).toBe(true);
  });

  it('only fetches upstream images for deleted_local', async () => {
    const base = makeComponent('OldBtn', '1:1');
    const entries: DiffEntry<NormalizedComponent>[] = [
      makeDiffEntry('Page/OldBtn', 'deleted_local', base, base, undefined),
    ];

    const client = mockClient({ '1:1': 'https://figma-cdn/img.png' });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.startsWith('https://figma-')) {
        return Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(RED_PNG.buffer.slice(RED_PNG.byteOffset, RED_PNG.byteOffset + RED_PNG.byteLength)),
        });
      }
      return originalFetch(url);
    });

    try {
      const result = await downloadComponentImages(
        client, entries, 'fk1', 'fk2', imagesDir,
      );

      // Only upstream image (local is deleted)
      const labels = result.images.map((i) => i.label);
      expect(labels).toContain('upstream');
      expect(labels).not.toContain('local');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
