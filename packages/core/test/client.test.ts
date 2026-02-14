import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createFigmaClient,
  FigmaApiError,
  FigmaRateLimitError,
} from '../src/figma/client.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function textResponse(body: string, status: number): Response {
  return new Response(body, { status });
}

// Minimal valid fixtures matching our Zod schemas
const fileFixture = {
  name: 'Test File',
  version: '123',
  document: { id: '0:0', name: 'Document', type: 'DOCUMENT', children: [] },
  components: {},
  styles: {},
};

const versionsFixture = {
  versions: [
    {
      id: 'v1',
      created_at: '2024-01-01T00:00:00Z',
      label: null,
      description: null,
      user: { handle: 'user', img_url: 'https://example.com/img.png' },
    },
  ],
};

const componentsFixture = {
  meta: { components: [] },
};

const stylesFixture = {
  meta: { styles: [] },
};

const nodesFixture = {
  name: 'Test File',
  nodes: {
    '1:2': {
      document: { id: '1:2', name: 'Frame', type: 'FRAME' },
    },
  },
};

const imagesFixture = {
  images: { '1:2': 'https://example.com/image.png' },
  err: null,
};

describe('createFigmaClient', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  function mockFetch(
    fn: (url: string, init?: RequestInit) => Promise<Response>,
  ) {
    globalThis.fetch = fn as typeof fetch;
  }

  const client = createFigmaClient({
    personalAccessToken: 'figd_test_token',
    rateLimit: 100, // high limit so tests don't throttle
    maxRetries: 2,
  });

  // ── Auth header ────────────────────────────────────────────────────

  it('sends X-Figma-Token header', async () => {
    let capturedHeaders: HeadersInit | undefined;
    mockFetch(async (_url, init) => {
      capturedHeaders = init?.headers;
      return jsonResponse(fileFixture);
    });

    await client.getFile('abc123');
    expect(capturedHeaders).toEqual({ 'X-Figma-Token': 'figd_test_token' });
  });

  // ── Endpoint URLs ──────────────────────────────────────────────────

  it('builds correct URL for getFile', async () => {
    let capturedUrl = '';
    mockFetch(async (url) => {
      capturedUrl = url;
      return jsonResponse(fileFixture);
    });

    await client.getFile('abc123', { version: 'v1', depth: 2 });
    expect(capturedUrl).toBe(
      'https://api.figma.com/v1/files/abc123?version=v1&depth=2',
    );
  });

  it('builds correct URL for getFileVersions', async () => {
    let capturedUrl = '';
    mockFetch(async (url) => {
      capturedUrl = url;
      return jsonResponse(versionsFixture);
    });

    await client.getFileVersions('abc123');
    expect(capturedUrl).toBe(
      'https://api.figma.com/v1/files/abc123/versions',
    );
  });

  it('builds correct URL for getFileComponents', async () => {
    let capturedUrl = '';
    mockFetch(async (url) => {
      capturedUrl = url;
      return jsonResponse(componentsFixture);
    });

    await client.getFileComponents('abc123');
    expect(capturedUrl).toBe(
      'https://api.figma.com/v1/files/abc123/components',
    );
  });

  it('builds correct URL for getFileStyles', async () => {
    let capturedUrl = '';
    mockFetch(async (url) => {
      capturedUrl = url;
      return jsonResponse(stylesFixture);
    });

    await client.getFileStyles('abc123');
    expect(capturedUrl).toBe(
      'https://api.figma.com/v1/files/abc123/styles',
    );
  });

  it('builds correct URL for getFileNodes', async () => {
    let capturedUrl = '';
    mockFetch(async (url) => {
      capturedUrl = url;
      return jsonResponse(nodesFixture);
    });

    await client.getFileNodes('abc123', ['1:2', '3:4']);
    expect(capturedUrl).toBe(
      'https://api.figma.com/v1/files/abc123/nodes?ids=1%3A2%2C3%3A4',
    );
  });

  it('builds correct URL for getImages', async () => {
    let capturedUrl = '';
    mockFetch(async (url) => {
      capturedUrl = url;
      return jsonResponse(imagesFixture);
    });

    await client.getImages('abc123', ['1:2'], { scale: 2, format: 'png' });
    expect(capturedUrl).toBe(
      'https://api.figma.com/v1/images/abc123?ids=1%3A2&scale=2&format=png',
    );
  });

  // ── Error handling ─────────────────────────────────────────────────

  it('throws FigmaApiError with clear message on 403', async () => {
    mockFetch(async () => textResponse('Forbidden', 403));

    await expect(client.getFile('abc123')).rejects.toThrow(FigmaApiError);
    await expect(client.getFile('abc123')).rejects.toThrow(
      'Access denied',
    );
  });

  it('throws FigmaApiError on 404', async () => {
    mockFetch(async () => textResponse('Not found', 404));

    await expect(client.getFile('abc123')).rejects.toThrow(FigmaApiError);
    await expect(client.getFile('abc123')).rejects.toThrow('File not found');
  });

  it('throws non-retryable error on 400', async () => {
    let callCount = 0;
    mockFetch(async () => {
      callCount++;
      return textResponse('Bad request', 400);
    });

    await expect(client.getFile('abc123')).rejects.toThrow(FigmaApiError);
    expect(callCount).toBe(1); // No retries for 400
  });

  // ── Retries ────────────────────────────────────────────────────────

  it('retries on 429 and succeeds', async () => {
    let callCount = 0;
    mockFetch(async () => {
      callCount++;
      if (callCount === 1) return textResponse('Rate limited', 429);
      return jsonResponse(fileFixture);
    });

    const result = await client.getFile('abc123');
    expect(result.name).toBe('Test File');
    expect(callCount).toBe(2);
  });

  it('retries on 500 and succeeds', async () => {
    let callCount = 0;
    mockFetch(async () => {
      callCount++;
      if (callCount === 1) return textResponse('Server error', 500);
      return jsonResponse(fileFixture);
    });

    const result = await client.getFile('abc123');
    expect(result.name).toBe('Test File');
    expect(callCount).toBe(2);
  });

  it('throws FigmaRateLimitError after exhausting retries on 429', async () => {
    mockFetch(async () => textResponse('Rate limited', 429));

    await expect(client.getFile('abc123')).rejects.toThrow(
      FigmaRateLimitError,
    );
  });

  it('retries on network error', async () => {
    let callCount = 0;
    mockFetch(async () => {
      callCount++;
      if (callCount === 1) throw new Error('Network failure');
      return jsonResponse(fileFixture);
    });

    const result = await client.getFile('abc123');
    expect(result.name).toBe('Test File');
    expect(callCount).toBe(2);
  });

  // ── Zod validation ────────────────────────────────────────────────

  it('throws on invalid response shape', async () => {
    mockFetch(async () => jsonResponse({ unexpected: true }));

    await expect(client.getFile('abc123')).rejects.toThrow();
  });

  // ── Passthrough: extra fields don't break validation ──────────────

  it('accepts extra fields in response', async () => {
    mockFetch(async () =>
      jsonResponse({
        ...fileFixture,
        someNewFigmaField: 'hello',
      }),
    );

    const result = await client.getFile('abc123');
    expect(result.name).toBe('Test File');
    expect((result as Record<string, unknown>)['someNewFigmaField']).toBe(
      'hello',
    );
  });

  // ── onRequest callback ──────────────────────────────────────────

  it('calls onRequest callback on successful response', async () => {
    const onRequest = vi.fn();
    const trackedClient = createFigmaClient({
      personalAccessToken: 'figd_test_token',
      rateLimit: 100,
      onRequest,
    });

    mockFetch(async () => jsonResponse(fileFixture));

    await trackedClient.getFile('abc123');
    expect(onRequest).toHaveBeenCalledOnce();
    expect(onRequest).toHaveBeenCalledWith(
      '/v1/files/abc123',
      200,
    );
  });

  it('calls onRequest callback on error response', async () => {
    const onRequest = vi.fn();
    const trackedClient = createFigmaClient({
      personalAccessToken: 'figd_test_token',
      rateLimit: 100,
      maxRetries: 0,
      onRequest,
    });

    mockFetch(async () => textResponse('Not found', 404));

    await expect(trackedClient.getFile('abc123')).rejects.toThrow();
    expect(onRequest).toHaveBeenCalledOnce();
    expect(onRequest).toHaveBeenCalledWith(
      '/v1/files/abc123',
      404,
    );
  });

  it('calls onRequest on each retry attempt', async () => {
    const onRequest = vi.fn();
    const trackedClient = createFigmaClient({
      personalAccessToken: 'figd_test_token',
      rateLimit: 100,
      maxRetries: 1,
      onRequest,
    });

    let callCount = 0;
    mockFetch(async () => {
      callCount++;
      if (callCount === 1) return textResponse('Rate limited', 429);
      return jsonResponse(fileFixture);
    });

    await trackedClient.getFile('abc123');
    expect(onRequest).toHaveBeenCalledTimes(2);
    expect(onRequest).toHaveBeenNthCalledWith(1, '/v1/files/abc123', 429);
    expect(onRequest).toHaveBeenNthCalledWith(2, '/v1/files/abc123', 200);
  });
});
