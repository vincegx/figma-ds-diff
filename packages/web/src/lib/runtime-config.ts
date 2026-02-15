import { join } from 'node:path';
import { readFile, writeFile, copyFile, access } from 'node:fs/promises';

const ENV_PATH = join(process.cwd(), '..', '..', '.env');
const ENV_EXAMPLE_PATH = join(process.cwd(), '..', '..', '.env.example');

let cachedPat: string | null = null;
let cacheTime = 0;
const CACHE_TTL = 5_000; // 5 seconds

/**
 * Read FIGMA_PAT directly from the .env file with a short-lived cache.
 * Bypasses process.env so token updates take effect without restart.
 */
export async function getFigmaPat(): Promise<string | undefined> {
  const now = Date.now();
  if (cachedPat !== null && now - cacheTime < CACHE_TTL) {
    return cachedPat || undefined;
  }

  try {
    const content = await readFile(ENV_PATH, 'utf-8');
    const match = content.match(/^FIGMA_PAT=(.+)$/m);
    cachedPat = match?.[1]?.trim() ?? '';
    cacheTime = now;
    return cachedPat || undefined;
  } catch {
    cachedPat = '';
    cacheTime = now;
    return undefined;
  }
}

/** Clear the in-memory cache so the next read picks up changes. */
export function invalidateConfig(): void {
  cachedPat = null;
  cacheTime = 0;
}

/** Mask a token for display: show prefix + last 4 chars. */
export function maskToken(token: string): string {
  if (token.length <= 10) return '••••••••';
  return `${token.slice(0, 5)}…${token.slice(-4)}`;
}

/**
 * Write a FIGMA_PAT value to the .env file.
 * If .env doesn't exist, copies from .env.example first.
 * Updates in-place if FIGMA_PAT line already exists.
 */
export async function writeFigmaPat(token: string): Promise<void> {
  let content: string;

  try {
    content = await readFile(ENV_PATH, 'utf-8');
  } catch {
    // .env doesn't exist — try copying from .env.example
    try {
      await access(ENV_EXAMPLE_PATH);
      await copyFile(ENV_EXAMPLE_PATH, ENV_PATH);
      content = await readFile(ENV_PATH, 'utf-8');
    } catch {
      // No .env.example either — create from scratch
      content = '';
    }
  }

  if (/^FIGMA_PAT=.*/m.test(content)) {
    content = content.replace(/^FIGMA_PAT=.*/m, `FIGMA_PAT=${token}`);
  } else {
    content = content.trimEnd() + (content.length > 0 ? '\n' : '') + `FIGMA_PAT=${token}\n`;
  }

  await writeFile(ENV_PATH, content, 'utf-8');
  invalidateConfig();
}
