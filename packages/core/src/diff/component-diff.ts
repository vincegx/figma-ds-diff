/**
 * Component-specific three-way diff.
 * Deep-compares variants, properties, and description.
 * Includes rename detection for delete+add pairs with high structural similarity.
 */

import type { NormalizedComponent, NormalizedComponentMap } from '../normalize/components.js';
import type { DiffEntry } from './types.js';
import { threeWayDiff } from './three-way.js';
import { detectRenames } from './rename-detector.js';

export function diffComponents(
  base: NormalizedComponentMap,
  upstream: NormalizedComponentMap,
  local: NormalizedComponentMap,
): DiffEntry<NormalizedComponent>[] {
  const entries = threeWayDiff(base, upstream, local, {
    isEqual: componentsEqual,
    describeChanges: describeComponentChanges,
  });

  return detectRenames(entries, {
    similarity: componentSimilarity,
  });
}

/**
 * Compute structural similarity between two components, ignoring name.
 * Returns 0–1, where 1 = structurally identical (probable rename).
 */
export function componentSimilarity(a: NormalizedComponent, b: NormalizedComponent): number {
  let score = 0;
  let weights = 0;

  // Variant overlap (Jaccard similarity) — weight 2
  const aVariantNames = new Set(a.variants.map(v => v.name));
  const bVariantNames = new Set(b.variants.map(v => v.name));
  if (aVariantNames.size > 0 || bVariantNames.size > 0) {
    const intersection = [...aVariantNames].filter(n => bVariantNames.has(n)).length;
    const union = new Set([...aVariantNames, ...bVariantNames]).size;
    score += 2 * (intersection / union);
    weights += 2;
  } else {
    // Both have no variants — that's a match
    score += 2;
    weights += 2;
  }

  // Property overlap (Jaccard similarity) — weight 2
  const aProps = new Set(a.properties.map(p => p.name));
  const bProps = new Set(b.properties.map(p => p.name));
  if (aProps.size > 0 || bProps.size > 0) {
    const intersection = [...aProps].filter(n => bProps.has(n)).length;
    const union = new Set([...aProps, ...bProps]).size;
    score += 2 * (intersection / union);
    weights += 2;
  } else {
    score += 2;
    weights += 2;
  }

  // Structural node data (exact match) — weight 1
  weights += 1;
  if (JSON.stringify(a.strippedNode) === JSON.stringify(b.strippedNode)) {
    score += 1;
  }

  return weights > 0 ? score / weights : 0;
}

function componentsEqual(a: NormalizedComponent, b: NormalizedComponent): boolean {
  // Compare name
  if (a.name !== b.name) return false;

  // Compare description
  if (a.description !== b.description) return false;

  // Compare variants (already sorted)
  if (a.variants.length !== b.variants.length) return false;
  for (let i = 0; i < a.variants.length; i++) {
    const va = a.variants[i]!;
    const vb = b.variants[i]!;
    if (va.name !== vb.name) return false;
    if (JSON.stringify(va.properties) !== JSON.stringify(vb.properties)) return false;
  }

  // Compare component properties (already sorted)
  if (a.properties.length !== b.properties.length) return false;
  for (let i = 0; i < a.properties.length; i++) {
    const pa = a.properties[i]!;
    const pb = b.properties[i]!;
    if (pa.name !== pb.name || pa.type !== pb.type) return false;
    if (JSON.stringify(pa.defaultValue) !== JSON.stringify(pb.defaultValue)) return false;
  }

  // Compare stripped node data for deep structural changes
  if (JSON.stringify(a.strippedNode) !== JSON.stringify(b.strippedNode)) return false;

  return true;
}

function describeComponentChanges(
  key: string,
  base: NormalizedComponent | undefined,
  upstream: NormalizedComponent | undefined,
  local: NormalizedComponent | undefined,
): string[] {
  const details: string[] = [];

  if (!base) {
    // New item
    const item = upstream ?? local;
    details.push(`New component "${item?.name ?? key}"`);
    return details;
  }

  if (!upstream) {
    details.push(`Component "${base.name}" deleted upstream`);
    return details;
  }

  if (!local) {
    details.push(`Component "${base.name}" deleted locally`);
    return details;
  }

  // Compare the two changed versions against base
  const changed = upstream; // or local, depending on changeType
  const compareTo = base;

  // Name change
  if (upstream.name !== compareTo.name || local.name !== compareTo.name) {
    details.push(
      `Name: "${compareTo.name}" → upstream="${upstream.name}", local="${local.name}"`,
    );
  }

  // Description change
  if (upstream.description !== compareTo.description) {
    details.push(`Upstream description changed`);
  }
  if (local.description !== compareTo.description) {
    details.push(`Local description changed`);
  }

  // Variant changes
  const baseVariantNames = new Set(compareTo.variants.map((v) => v.name));
  const upstreamVariantNames = new Set(upstream.variants.map((v) => v.name));
  const localVariantNames = new Set(local.variants.map((v) => v.name));

  for (const name of upstreamVariantNames) {
    if (!baseVariantNames.has(name)) {
      details.push(`Upstream added variant "${name}"`);
    }
  }
  for (const name of baseVariantNames) {
    if (!upstreamVariantNames.has(name)) {
      details.push(`Upstream removed variant "${name}"`);
    }
  }
  for (const name of localVariantNames) {
    if (!baseVariantNames.has(name)) {
      details.push(`Local added variant "${name}"`);
    }
  }
  for (const name of baseVariantNames) {
    if (!localVariantNames.has(name)) {
      details.push(`Local removed variant "${name}"`);
    }
  }

  // Property changes
  const baseProps = new Map(compareTo.properties.map((p) => [p.name, p]));
  const upstreamProps = new Map(upstream.properties.map((p) => [p.name, p]));
  const localProps = new Map(local.properties.map((p) => [p.name, p]));

  for (const [name, upProp] of upstreamProps) {
    const baseProp = baseProps.get(name);
    if (!baseProp) {
      details.push(`Upstream added property "${name}" (${upProp.type})`);
    } else if (
      baseProp.type !== upProp.type ||
      JSON.stringify(baseProp.defaultValue) !== JSON.stringify(upProp.defaultValue)
    ) {
      details.push(`Upstream changed property "${name}"`);
    }
  }
  for (const name of baseProps.keys()) {
    if (!upstreamProps.has(name)) {
      details.push(`Upstream removed property "${name}"`);
    }
  }
  for (const [name, locProp] of localProps) {
    const baseProp = baseProps.get(name);
    if (!baseProp) {
      details.push(`Local added property "${name}" (${locProp.type})`);
    } else if (
      baseProp.type !== locProp.type ||
      JSON.stringify(baseProp.defaultValue) !== JSON.stringify(locProp.defaultValue)
    ) {
      details.push(`Local changed property "${name}"`);
    }
  }
  for (const name of baseProps.keys()) {
    if (!localProps.has(name)) {
      details.push(`Local removed property "${name}"`);
    }
  }

  // Deep structural diff when no high-level metadata changes explain it
  if (details.length === 0 || onlyHasMetadataDetails(details)) {
    const upDiffs = describeStructuralDiffs(compareTo.strippedNode, upstream.strippedNode, 'Upstream');
    const locDiffs = describeStructuralDiffs(compareTo.strippedNode, local.strippedNode, 'Local');
    details.push(...upDiffs, ...locDiffs);
  }

  if (details.length === 0) {
    details.push(`Structural changes in "${changed.name}"`);
  }

  return details;
}

/** Returns true if existing details are only high-level (name/desc) and structural info would help */
function onlyHasMetadataDetails(details: string[]): boolean {
  return details.every(d => d.includes('description changed'));
}

/* ── Structural deep diff ── */

interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

type Category = 'color' | 'radius' | 'spacing' | 'dimension' | 'typography' | 'effect' | 'grid' | 'layout' | 'visibility' | 'config';

interface StructuralChange {
  category: Category;
  label: string;
  oldValue?: string;
  newValue?: string;
  count: number;
}

/** RGBA float (0-1) → hex string "#RRGGBB" or "#RRGGBBAA" */
function rgbaToHex(c: RgbaColor): string {
  const r = Math.round(c.r * 255);
  const g = Math.round(c.g * 255);
  const b = Math.round(c.b * 255);
  const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  if (c.a !== undefined && c.a < 0.995) {
    const a = Math.round(c.a * 255);
    return `${hex}${a.toString(16).padStart(2, '0')}`.toUpperCase();
  }
  return hex.toUpperCase();
}

function isRgba(v: unknown): v is RgbaColor {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o['r'] === 'number' && typeof o['g'] === 'number' && typeof o['b'] === 'number';
}

function rgbaEqual(a: RgbaColor, b: RgbaColor): boolean {
  return Math.abs(a.r - b.r) < 0.002
    && Math.abs(a.g - b.g) < 0.002
    && Math.abs(a.b - b.b) < 0.002
    && Math.abs((a.a ?? 1) - (b.a ?? 1)) < 0.002;
}

function numClose(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.5;
}

/** Map a leaf key to a change category */
function categorize(key: string, parentPath: string): Category {
  // Color-related
  if (key === 'color' || key === 'backgroundColor') return 'color';
  if (key === 'opacity') return 'visibility';
  if (key === 'visible') return 'visibility';
  // Radius
  if (key === 'cornerRadius' || key === 'cornerSmoothing'
    || key === 'topLeftRadius' || key === 'topRightRadius'
    || key === 'bottomLeftRadius' || key === 'bottomRightRadius') return 'radius';
  // Spacing / padding
  if (key === 'paddingLeft' || key === 'paddingRight' || key === 'paddingTop' || key === 'paddingBottom'
    || key === 'itemSpacing' || key === 'counterAxisSpacing') return 'spacing';
  // Dimensions
  if (key === 'width' || key === 'height'
    || key === 'minWidth' || key === 'minHeight'
    || key === 'maxWidth' || key === 'maxHeight') return 'dimension';
  // Typography
  if (key === 'fontSize' || key === 'fontFamily' || key === 'fontWeight'
    || key === 'lineHeightPx' || key === 'lineHeightPercent'
    || key === 'letterSpacing' || key === 'textCase' || key === 'textDecoration'
    || key === 'textAlignHorizontal' || key === 'textAlignVertical') return 'typography';
  // Effects
  if (key === 'effects' || parentPath.includes('.effects[')) return 'effect';
  // Grid
  if (key === 'layoutGrids' || key === 'sectionSize' || parentPath.includes('.layoutGrids[')) return 'grid';
  // Layout config
  if (key === 'layoutMode' || key === 'primaryAxisSizingMode' || key === 'counterAxisSizingMode'
    || key === 'primaryAxisAlignItems' || key === 'counterAxisAlignItems'
    || key === 'layoutAlign' || key === 'layoutGrow' || key === 'layoutPositioning') return 'layout';
  // Component config (overrides, boundVariables, componentProperties)
  if (key === 'overrides' || key === 'boundVariables' || key === 'componentProperties'
    || parentPath.includes('.overrides[') || parentPath.includes('.boundVariables')
    || parentPath.includes('.componentProperties')) return 'config';

  // Fills/strokes context
  if (parentPath.includes('.fills[') || parentPath.includes('.strokes[')
    || parentPath.includes('.background[')) return 'color';

  return 'config';
}

const CATEGORY_LABELS: Record<Category, string> = {
  color: 'Fill/stroke colors',
  radius: 'Corner radius',
  spacing: 'Padding/spacing',
  dimension: 'Dimensions',
  typography: 'Typography',
  effect: 'Effects (shadow/blur)',
  grid: 'Layout grids',
  layout: 'Auto-layout config',
  visibility: 'Visibility/opacity',
  config: 'Component config',
};

/**
 * Recursively diff two strippedNode trees.
 * Collects changes into categories, aggregates, and returns human-readable lines.
 * Performance: depth-limited, early-exits on equal subtrees via JSON.stringify check.
 */
function describeStructuralDiffs(
  a: unknown,
  b: unknown,
  label: string,
): string[] {
  if (a === undefined || b === undefined || a === null || b === null) return [];
  // Quick exit if identical
  const aJson = JSON.stringify(a);
  const bJson = JSON.stringify(b);
  if (aJson === bJson) return [];

  // Collect raw changes
  const colorTransitions = new Map<string, number>(); // "hex→hex" => count
  const radiusChanges: string[] = [];
  const categoryCounts = new Map<Category, number>();
  const specificDetails: string[] = [];

  function walk(av: unknown, bv: unknown, path: string, depth: number): void {
    if (depth > 20) return;

    // Both RGBA objects — compare as colors
    if (isRgba(av) && isRgba(bv)) {
      if (!rgbaEqual(av, bv)) {
        const key = `${rgbaToHex(av)} → ${rgbaToHex(bv)}`;
        colorTransitions.set(key, (colorTransitions.get(key) ?? 0) + 1);
      }
      return;
    }

    // Both arrays
    if (Array.isArray(av) && Array.isArray(bv)) {
      const len = Math.max(av.length, bv.length);
      if (av.length !== bv.length) {
        const lastKey = path.split('.').pop() ?? '';
        const cat = categorize(lastKey, path);
        const diff = bv.length - av.length;
        const verb = diff > 0 ? `added ${diff}` : `removed ${-diff}`;
        specificDetails.push(`${label} ${verb} ${lastKey} entries`);
        categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + Math.abs(diff));
      }
      for (let i = 0; i < Math.min(av.length, bv.length); i++) {
        walk(av[i], bv[i], `${path}[${i}]`, depth + 1);
      }
      return;
    }

    // Both objects
    if (typeof av === 'object' && av !== null && typeof bv === 'object' && bv !== null
      && !Array.isArray(av) && !Array.isArray(bv)) {
      const ao = av as Record<string, unknown>;
      const bo = bv as Record<string, unknown>;
      // Quick equality check to skip identical subtrees
      if (JSON.stringify(ao) === JSON.stringify(bo)) return;
      const allKeys = new Set([...Object.keys(ao), ...Object.keys(bo)]);
      for (const k of allKeys) {
        const childPath = path ? `${path}.${k}` : k;
        if (!(k in ao)) {
          // Property added
          const cat = categorize(k, childPath);
          categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
          if (cat === 'radius' && typeof bo[k] === 'number') {
            radiusChanges.push(`${label} cornerRadius → ${Math.round(bo[k] as number)}`);
          } else if (cat === 'visibility') {
            specificDetails.push(`${label} ${k}: ${String(bo[k])}`);
          }
        } else if (!(k in bo)) {
          // Property removed
          const cat = categorize(k, childPath);
          categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
        } else {
          walk(ao[k], bo[k], childPath, depth + 1);
        }
      }
      return;
    }

    // Leaf values differ
    if (av !== bv) {
      const lastKey = path.split('.').pop() ?? '';
      const cat = categorize(lastKey, path);
      categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);

      // Capture specific details for important properties
      if (cat === 'radius' && typeof av === 'number' && typeof bv === 'number' && !numClose(av, bv)) {
        radiusChanges.push(`${label} cornerRadius: ${Math.round(av)} → ${Math.round(bv as number)}`);
      } else if (cat === 'spacing' && typeof av === 'number' && typeof bv === 'number' && !numClose(av, bv)) {
        specificDetails.push(`${label} ${lastKey}: ${Math.round(av)} → ${Math.round(bv as number)}`);
      } else if (cat === 'typography') {
        specificDetails.push(`${label} ${lastKey}: ${String(av)} → ${String(bv)}`);
      } else if (cat === 'dimension' && typeof av === 'number' && typeof bv === 'number' && !numClose(av, bv)) {
        specificDetails.push(`${label} ${lastKey}: ${Math.round(av)} → ${Math.round(bv as number)}`);
      } else if (cat === 'visibility') {
        specificDetails.push(`${label} ${lastKey}: ${String(av)} → ${String(bv)}`);
      } else if (cat === 'layout') {
        specificDetails.push(`${label} ${lastKey}: ${String(av)} → ${String(bv)}`);
      } else if (cat === 'grid' && typeof av === 'number' && typeof bv === 'number' && !numClose(av, bv)) {
        specificDetails.push(`${label} grid ${lastKey}: ${Math.round(av)} → ${Math.round(bv as number)}`);
      }
    }
  }

  walk(a, b, '', 0);

  // Assemble results
  const results: string[] = [];

  // Color transitions — deduplicated, most frequent first
  if (colorTransitions.size > 0) {
    const sorted = [...colorTransitions.entries()].sort((a, b) => b[1] - a[1]);
    const totalNodes = sorted.reduce((s, [, c]) => s + c, 0);
    if (sorted.length <= 3) {
      for (const [transition, count] of sorted) {
        const suffix = count > 1 ? ` (${count} nodes)` : '';
        results.push(`${label} color ${transition}${suffix}`);
      }
    } else {
      // Show top 2 and summarize
      for (const [transition, count] of sorted.slice(0, 2)) {
        const suffix = count > 1 ? ` (${count} nodes)` : '';
        results.push(`${label} color ${transition}${suffix}`);
      }
      const remaining = totalNodes - sorted[0]![1] - sorted[1]![1];
      if (remaining > 0) {
        results.push(`${label} +${sorted.length - 2} other color changes (${remaining} nodes)`);
      }
    }
  }

  // Radius — deduplicate
  const uniqueRadius = [...new Set(radiusChanges)];
  results.push(...uniqueRadius.slice(0, 3));

  // Specific details — deduplicate, cap at reasonable count
  const uniqueSpecific = [...new Set(specificDetails)];
  results.push(...uniqueSpecific.slice(0, 6));

  // Summary for categories with changes but no specific detail yet
  for (const [cat, count] of categoryCounts) {
    if (cat === 'color' || cat === 'radius') continue; // already handled above
    const hasSpecific = results.some(r => r.includes(CATEGORY_LABELS[cat]) || r.includes(cat));
    if (!hasSpecific && count > 0 && uniqueSpecific.filter(s => {
      const catLabel = CATEGORY_LABELS[cat];
      return s.includes(catLabel);
    }).length === 0) {
      // Only add summary if no specific details were emitted for this category
      const alreadyCovered = results.some(r => {
        // Check if any result line relates to this category
        switch (cat) {
          case 'spacing': return r.includes('padding') || r.includes('Spacing') || r.includes('itemSpacing');
          case 'dimension': return r.includes('width') || r.includes('height') || r.includes('Width') || r.includes('Height');
          case 'typography': return r.includes('font') || r.includes('Font') || r.includes('lineHeight') || r.includes('letterSpacing');
          case 'grid': return r.includes('grid');
          case 'layout': return r.includes('layout') || r.includes('Layout');
          case 'visibility': return r.includes('opacity') || r.includes('visible');
          case 'config': return r.includes('config') || r.includes('override') || r.includes('boundVariable');
          case 'effect': return r.includes('effect') || r.includes('shadow') || r.includes('blur');
          default: return false;
        }
      });
      if (!alreadyCovered) {
        results.push(`${label} ${CATEGORY_LABELS[cat]} changed (${count} updates)`);
      }
    }
  }

  return results.slice(0, 12); // Hard cap to avoid enormous lists
}
