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

  if (details.length === 0) {
    details.push(`Structural changes in "${changed.name}"`);
  }

  return details;
}
