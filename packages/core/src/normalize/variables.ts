/**
 * Normalize variable JSON data from various formats into a unified structure.
 *
 * Supports:
 * - W3C DTCG format (Tokens Studio): { group: { token: { $type, $value } } }
 * - Native Figma export: { collections: [{ name, modes, variables }] }
 * - Flat format: { "collection/name": { type, value } } or { "name": value }
 */

// ── Normalized types ───────────────────────────────────────────────────

export interface NormalizedVariable {
  collection: string;
  name: string;
  type: string;
  valuesByMode: Record<string, unknown>;
}

/** Map keyed by "collection/name" */
export type NormalizedVariableMap = Map<string, NormalizedVariable>;

// ── Format detection ───────────────────────────────────────────────────

type DetectedFormat = 'dtcg' | 'figma-native' | 'flat-typed' | 'flat-simple';

function detectFormat(data: Record<string, unknown>): DetectedFormat {
  // Figma native: has a "collections" array
  if (
    Array.isArray(data['collections']) &&
    data['collections'].length > 0
  ) {
    return 'figma-native';
  }

  // Check first-level values for flat-typed
  for (const value of Object.values(data)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>;
      // Flat-typed: { type, value }
      if ('type' in obj && 'value' in obj) return 'flat-typed';
    }
  }

  // Check recursively for DTCG ($value at any depth)
  if (hasDTCGToken(data)) return 'dtcg';

  return 'flat-simple';
}

/** Recursively check if an object contains a DTCG token ($value key) */
function hasDTCGToken(obj: Record<string, unknown>, depth = 0): boolean {
  if (depth > 10) return false;
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('$')) continue;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const record = value as Record<string, unknown>;
      if ('$value' in record) return true;
      if (hasDTCGToken(record, depth + 1)) return true;
    }
  }
  return false;
}

// ── Main function ──────────────────────────────────────────────────────

/**
 * Normalize variable JSON into a unified map.
 * Accepts the parsed JSON object.
 */
export function normalizeVariables(
  data: Record<string, unknown>,
): NormalizedVariableMap {
  const format = detectFormat(data);

  switch (format) {
    case 'dtcg':
      return normalizeDTCG(data);
    case 'figma-native':
      return normalizeFigmaNative(data);
    case 'flat-typed':
      return normalizeFlatTyped(data);
    case 'flat-simple':
      return normalizeFlatSimple(data);
  }
}

// ── DTCG (Tokens Studio W3C format) ────────────────────────────────────

function normalizeDTCG(data: Record<string, unknown>): NormalizedVariableMap {
  const result: NormalizedVariableMap = new Map();
  walkDTCG(data, [], 'tokens', result);
  return result;
}

function walkDTCG(
  obj: Record<string, unknown>,
  pathParts: string[],
  collection: string,
  result: NormalizedVariableMap,
  depth = 0,
): void {
  if (depth > 50) return; // Safety limit for deeply nested structures

  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('$')) continue; // skip $type, $description etc. at group level

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const record = value as Record<string, unknown>;

      if ('$value' in record) {
        // This is a token leaf
        const tokenType =
          (record['$type'] as string) ?? inferType(record['$value']);
        const name = [...pathParts, key].join('/');
        const fullKey = `${collection}/${name}`;

        result.set(fullKey, {
          collection,
          name,
          type: tokenType,
          valuesByMode: { default: record['$value'] },
        });
      } else {
        // This is a group — recurse
        walkDTCG(record, [...pathParts, key], collection, result, depth + 1);
      }
    }
  }
}

// ── Figma native export ────────────────────────────────────────────────

interface FigmaNativeCollection {
  name: string;
  modes: Array<{ name: string; modeId: string }>;
  variables: Array<{
    name: string;
    type: string;
    valuesByMode: Record<string, unknown>;
  }>;
}

function normalizeFigmaNative(
  data: Record<string, unknown>,
): NormalizedVariableMap {
  const result: NormalizedVariableMap = new Map();
  const collections = data['collections'] as FigmaNativeCollection[];

  for (const collection of collections) {
    // Build mode name lookup
    const modeNames = new Map<string, string>();
    for (const mode of collection.modes ?? []) {
      modeNames.set(mode.modeId, mode.name);
    }

    for (const variable of collection.variables ?? []) {
      const fullKey = `${collection.name}/${variable.name}`;

      // Remap modeId keys to mode names
      const valuesByMode: Record<string, unknown> = {};
      for (const [modeId, value] of Object.entries(
        variable.valuesByMode ?? {},
      )) {
        const modeName = modeNames.get(modeId) ?? modeId;
        valuesByMode[modeName] = value;
      }

      result.set(fullKey, {
        collection: collection.name,
        name: variable.name,
        type: variable.type,
        valuesByMode,
      });
    }
  }

  return result;
}

// ── Flat typed: { "name": { type, value } } ────────────────────────────

function normalizeFlatTyped(
  data: Record<string, unknown>,
): NormalizedVariableMap {
  const result: NormalizedVariableMap = new Map();

  for (const [key, val] of Object.entries(data)) {
    if (!val || typeof val !== 'object') continue;
    const record = val as Record<string, unknown>;

    const slashIdx = key.indexOf('/');
    const collection = slashIdx > 0 ? key.slice(0, slashIdx) : 'default';
    const name = slashIdx > 0 ? key.slice(slashIdx + 1) : key;
    const fullKey = `${collection}/${name}`;

    result.set(fullKey, {
      collection,
      name,
      type: (record['type'] as string) ?? 'unknown',
      valuesByMode: { default: record['value'] },
    });
  }

  return result;
}

// ── Flat simple: { "name": value } ─────────────────────────────────────

function normalizeFlatSimple(
  data: Record<string, unknown>,
): NormalizedVariableMap {
  const result: NormalizedVariableMap = new Map();

  for (const [key, value] of Object.entries(data)) {
    const slashIdx = key.indexOf('/');
    const collection = slashIdx > 0 ? key.slice(0, slashIdx) : 'default';
    const name = slashIdx > 0 ? key.slice(slashIdx + 1) : key;
    const fullKey = `${collection}/${name}`;

    result.set(fullKey, {
      collection,
      name,
      type: inferType(value),
      valuesByMode: { default: value },
    });
  }

  return result;
}

// ── Helpers ────────────────────────────────────────────────────────────

function inferType(value: unknown): string {
  if (typeof value === 'string') {
    // Check for color-like values
    if (/^#[0-9a-fA-F]{3,8}$/.test(value)) return 'color';
    if (/^rgba?\(/.test(value)) return 'color';
    // Check for dimension-like values
    if (/^\d+(\.\d+)?(px|rem|em|%)$/.test(value)) return 'dimension';
    return 'string';
  }
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (value && typeof value === 'object') {
    // Could be a color object { r, g, b, a }
    const obj = value as Record<string, unknown>;
    if ('r' in obj && 'g' in obj && 'b' in obj) return 'color';
    return 'object';
  }
  return 'unknown';
}
