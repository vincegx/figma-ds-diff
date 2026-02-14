import { join } from 'node:path';

/**
 * Resolve the reports directory at the project root.
 * Works in both dev and production.
 */
export function getReportsDir(): string {
  // process.cwd() in Next.js is the web package root during dev
  // Navigate up to project root
  return join(process.cwd(), '..', '..', 'reports');
}
