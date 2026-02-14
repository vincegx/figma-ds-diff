import { join } from 'node:path';

/**
 * Resolve the path to the quota tracking JSON file.
 * Located at project root under figma-data/.
 */
export function getQuotaFilePath(): string {
  return join(process.cwd(), '..', '..', 'figma-data', 'api-quota.json');
}
