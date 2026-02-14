import type { z } from 'zod';
import {
  GetFileResponseSchema,
  GetFileVersionsResponseSchema,
  GetFileComponentsResponseSchema,
  GetFileStylesResponseSchema,
  GetFileNodesResponseSchema,
  GetImagesResponseSchema,
  type GetFileResponse,
  type GetFileVersionsResponse,
  type GetFileComponentsResponse,
  type GetFileStylesResponse,
  type GetFileNodesResponse,
  type GetImagesResponse,
} from './types.js';

// ── Error Classes ──────────────────────────────────────────────────────

export class FigmaApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly endpoint: string,
    public readonly body: string,
  ) {
    super(`Figma API error ${status} on ${endpoint}: ${body}`);
    this.name = 'FigmaApiError';
  }
}

export class FigmaRateLimitError extends FigmaApiError {
  constructor(endpoint: string, body: string) {
    super(429, endpoint, body);
    this.name = 'FigmaRateLimitError';
  }
}

// ── Rate Limiter ───────────────────────────────────────────────────────

class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefill: number;
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly maxTokens: number,
    private readonly refillIntervalMs: number,
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    // Serialize access to prevent race conditions with concurrent requests
    const prev = this.queue;
    let release!: () => void;
    this.queue = new Promise<void>((resolve) => {
      release = resolve;
    });

    await prev;

    try {
      this.refill();
      while (this.tokens <= 0) {
        const waitMs = this.refillIntervalMs - (Date.now() - this.lastRefill);
        await new Promise((resolve) => setTimeout(resolve, Math.max(waitMs, 50)));
        this.refill();
      }
      this.tokens--;
    } finally {
      release();
    }
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    if (elapsed >= this.refillIntervalMs) {
      const periods = Math.floor(elapsed / this.refillIntervalMs);
      this.tokens = Math.min(
        this.maxTokens,
        this.tokens + periods * this.maxTokens,
      );
      this.lastRefill += periods * this.refillIntervalMs;
    }
  }
}

// ── Types ──────────────────────────────────────────────────────────────

export interface FigmaClientOptions {
  personalAccessToken: string;
  /** Max requests per interval (default: 30) */
  rateLimit?: number;
  /** Rate limit interval in ms (default: 60_000 = 1 minute) */
  rateLimitIntervalMs?: number;
  /** Max retry attempts (default: 3) */
  maxRetries?: number;
  /** Base URL for the Figma API (default: https://api.figma.com) */
  baseUrl?: string;
  /** Called after each API request (success or error). For quota tracking. */
  onRequest?: (endpoint: string, status: number) => void;
}

export interface GetFileParams {
  version?: string;
  depth?: number;
}

export interface GetFileVersionsParams {
  cursor?: number;
}

export interface GetFileNodesParams {
  version?: string;
}

export interface GetImagesParams {
  scale?: number;
  format?: 'jpg' | 'png' | 'svg' | 'pdf';
}

export interface FigmaClient {
  getFile(fileKey: string, params?: GetFileParams): Promise<GetFileResponse>;
  getFileVersions(
    fileKey: string,
    params?: GetFileVersionsParams,
  ): Promise<GetFileVersionsResponse>;
  getFileComponents(fileKey: string): Promise<GetFileComponentsResponse>;
  getFileStyles(fileKey: string): Promise<GetFileStylesResponse>;
  getFileNodes(fileKey: string, ids: string[], params?: GetFileNodesParams): Promise<GetFileNodesResponse>;
  getImages(
    fileKey: string,
    ids: string[],
    params?: GetImagesParams,
  ): Promise<GetImagesResponse>;
}

// ── Factory ────────────────────────────────────────────────────────────

export function createFigmaClient(options: FigmaClientOptions): FigmaClient {
  const {
    personalAccessToken,
    rateLimit = 30,
    rateLimitIntervalMs = 60_000,
    maxRetries = 3,
    baseUrl = 'https://api.figma.com',
  } = options;

  const limiter = new TokenBucketRateLimiter(rateLimit, rateLimitIntervalMs);

  async function request<T>(
    endpoint: string,
    schema: z.ZodType<T>,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      await limiter.acquire();

      const url = `${baseUrl}${endpoint}`;
      let response: Response;
      try {
        response = await fetch(url, {
          headers: {
            'X-Figma-Token': personalAccessToken,
          },
        });
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < maxRetries) {
          await backoff(attempt);
          continue;
        }
        throw lastError;
      }

      if (response.ok) {
        options.onRequest?.(endpoint, response.status);
        const json: unknown = await response.json();
        return schema.parse(json);
      }

      const body = await response.text();
      options.onRequest?.(endpoint, response.status);

      if (response.status === 403) {
        const hint = body.includes('Not found')
          ? 'File not accessible. Your FIGMA_PAT may lack read access to this file, or the file may not exist.'
          : body.includes('Invalid token')
            ? 'Invalid or expired FIGMA_PAT. Generate a new Personal Access Token in Figma settings.'
            : 'Access denied. Verify your FIGMA_PAT has read access to this file and has not expired.';
        throw new FigmaApiError(403, endpoint, hint);
      }

      if (response.status === 404) {
        throw new FigmaApiError(
          404,
          endpoint,
          'File not found. Check the file key in the URL. The file may have been deleted or moved.',
        );
      }

      if (response.status === 429) {
        lastError = new FigmaRateLimitError(endpoint, body);
        if (attempt < maxRetries) {
          await backoff(attempt);
          continue;
        }
        throw lastError;
      }

      if (response.status >= 500) {
        lastError = new FigmaApiError(response.status, endpoint, body);
        if (attempt < maxRetries) {
          await backoff(attempt);
          continue;
        }
        throw lastError;
      }

      // Non-retryable client error
      throw new FigmaApiError(response.status, endpoint, body);
    }

    throw lastError ?? new Error(`Request failed after ${maxRetries} retries`);
  }

  async function backoff(attempt: number): Promise<void> {
    const ms = Math.min(1000 * 2 ** attempt, 30_000);
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  return {
    async getFile(fileKey, params) {
      const query = new URLSearchParams();
      if (params?.version) query.set('version', params.version);
      if (params?.depth != null) query.set('depth', String(params.depth));
      const qs = query.toString();
      return request(
        `/v1/files/${fileKey}${qs ? `?${qs}` : ''}`,
        GetFileResponseSchema,
      );
    },

    async getFileVersions(fileKey, params) {
      const query = new URLSearchParams();
      if (params?.cursor != null) query.set('before', String(params.cursor));
      const qs = query.toString();
      return request(
        `/v1/files/${fileKey}/versions${qs ? `?${qs}` : ''}`,
        GetFileVersionsResponseSchema,
      );
    },

    async getFileComponents(fileKey) {
      return request(
        `/v1/files/${fileKey}/components`,
        GetFileComponentsResponseSchema,
      );
    },

    async getFileStyles(fileKey) {
      return request(
        `/v1/files/${fileKey}/styles`,
        GetFileStylesResponseSchema,
      );
    },

    async getFileNodes(fileKey, ids, params) {
      const query = new URLSearchParams();
      query.set('ids', ids.join(','));
      if (params?.version) query.set('version', params.version);
      return request(
        `/v1/files/${fileKey}/nodes?${query.toString()}`,
        GetFileNodesResponseSchema,
      );
    },

    async getImages(fileKey, ids, params) {
      const query = new URLSearchParams();
      query.set('ids', ids.join(','));
      if (params?.scale != null) query.set('scale', String(params.scale));
      if (params?.format) query.set('format', params.format);
      return request(
        `/v1/images/${fileKey}?${query.toString()}`,
        GetImagesResponseSchema,
      );
    },
  };
}
