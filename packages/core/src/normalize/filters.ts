/**
 * Strip volatile fields from Figma node data to produce stable,
 * comparable structures. Removes IDs, absolute positions, timestamps,
 * and user metadata that would cause false diffs.
 */

/** Fields to remove from any node object */
const VOLATILE_KEYS = new Set([
  // Identifiers that change across files/duplicates
  'id',
  'key',
  'componentSetId',
  'transitionNodeID',
  'flowStartingPoints',
  // Absolute positioning (changes on move, irrelevant for comparison)
  'absoluteBoundingBox',
  'absoluteRenderBounds',
  // Timestamps / user metadata
  'lastModified',
  'thumbnailUrl',
  'created_at',
  'updated_at',
  'thumbnail_url',
  // Remote reference metadata
  'remote',
  'file_key',
  'node_id',
]);

/**
 * Deep-clone an object while stripping volatile fields.
 * Works recursively on nested objects and arrays.
 */
export function stripVolatileFields<T>(value: T): T {
  return stripRecursive(value) as T;
}

function stripRecursive(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map(stripRecursive);
  }

  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (VOLATILE_KEYS.has(k)) continue;
    result[k] = stripRecursive(v);
  }
  return result;
}

/**
 * Round floating point color values to avoid false diffs
 * from precision differences (e.g. 0.39215686274509803 vs 0.392157).
 */
export function roundColorValues(
  color: { r: number; g: number; b: number; a: number },
  decimals = 4,
): { r: number; g: number; b: number; a: number } {
  const factor = 10 ** decimals;
  return {
    r: Math.round(color.r * factor) / factor,
    g: Math.round(color.g * factor) / factor,
    b: Math.round(color.b * factor) / factor,
    a: Math.round(color.a * factor) / factor,
  };
}

/**
 * Convert Figma RGBA (0-1 float) to hex string.
 */
export function rgbaToHex(color: {
  r: number;
  g: number;
  b: number;
  a: number;
}): string {
  const to255 = (v: number) =>
    Math.round(Math.max(0, Math.min(1, v)) * 255);
  const r = to255(color.r).toString(16).padStart(2, '0');
  const g = to255(color.g).toString(16).padStart(2, '0');
  const b = to255(color.b).toString(16).padStart(2, '0');
  if (color.a < 1) {
    const a = to255(color.a).toString(16).padStart(2, '0');
    return `#${r}${g}${b}${a}`;
  }
  return `#${r}${g}${b}`;
}
