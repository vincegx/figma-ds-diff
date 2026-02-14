/**
 * Style-specific three-way diff.
 * Compares fill values, typography specs, effect specs.
 * Includes rename detection for delete+add pairs with same values.
 */

import type { NormalizedStyle, NormalizedStyleMap } from '../normalize/styles.js';
import type { DiffEntry } from './types.js';
import { threeWayDiff } from './three-way.js';
import { detectRenames } from './rename-detector.js';

export function diffStyles(
  base: NormalizedStyleMap,
  upstream: NormalizedStyleMap,
  local: NormalizedStyleMap,
): DiffEntry<NormalizedStyle>[] {
  const entries = threeWayDiff(base, upstream, local, {
    isEqual: stylesEqual,
    describeChanges: describeStyleChanges,
  });

  return detectRenames(entries, {
    similarity: styleSimilarity,
  });
}

/**
 * Compute structural similarity between two styles, ignoring name.
 * Must be same type to match. Returns 0–1.
 */
export function styleSimilarity(a: NormalizedStyle, b: NormalizedStyle): number {
  // Different types → no match
  if (a.type !== b.type) return 0;

  switch (a.type) {
    case 'FILL': {
      const bFill = b as typeof a;
      return JSON.stringify(a.fills) === JSON.stringify(bFill.fills) ? 1 : 0;
    }
    case 'TEXT': {
      const bText = b as typeof a;
      let match = 0;
      let total = 4;
      if (a.fontFamily === bText.fontFamily) match++;
      if (a.fontSize === bText.fontSize) match++;
      if (a.fontWeight === bText.fontWeight) match++;
      if (a.lineHeightPx === bText.lineHeightPx) match++;
      return match / total;
    }
    case 'EFFECT': {
      const bEffect = b as typeof a;
      return JSON.stringify(a.effects) === JSON.stringify(bEffect.effects) ? 1 : 0;
    }
    case 'GRID':
      return 1; // Grid styles only differ by name, so any grid→grid is a match
  }
}

function stylesEqual(a: NormalizedStyle, b: NormalizedStyle): boolean {
  if (a.type !== b.type) return false;
  if (a.name !== b.name) return false;

  switch (a.type) {
    case 'FILL': {
      const bFill = b as typeof a;
      return JSON.stringify(a.fills) === JSON.stringify(bFill.fills);
    }
    case 'TEXT': {
      const bText = b as typeof a;
      return (
        a.fontFamily === bText.fontFamily &&
        a.fontSize === bText.fontSize &&
        a.fontWeight === bText.fontWeight &&
        a.lineHeightPx === bText.lineHeightPx &&
        a.lineHeightPercent === bText.lineHeightPercent &&
        a.letterSpacing === bText.letterSpacing &&
        a.textCase === bText.textCase &&
        a.textDecoration === bText.textDecoration
      );
    }
    case 'EFFECT': {
      const bEffect = b as typeof a;
      return JSON.stringify(a.effects) === JSON.stringify(bEffect.effects);
    }
    case 'GRID':
      return true; // Grid styles have no comparable values beyond name
  }
}

function describeStyleChanges(
  key: string,
  base: NormalizedStyle | undefined,
  upstream: NormalizedStyle | undefined,
  local: NormalizedStyle | undefined,
): string[] {
  const details: string[] = [];

  if (!base) {
    details.push(`New style "${key}"`);
    return details;
  }

  if (!upstream) {
    details.push(`Style "${key}" deleted upstream`);
    return details;
  }

  if (!local) {
    details.push(`Style "${key}" deleted locally`);
    return details;
  }

  if (base.type === 'FILL' && upstream.type === 'FILL') {
    const baseFills = base.fills.map((f) => f.hex ?? f.type).join(', ');
    const upFills = upstream.fills.map((f) => f.hex ?? f.type).join(', ');
    if (baseFills !== upFills) {
      details.push(`Upstream fill: ${baseFills} → ${upFills}`);
    }
  }

  if (base.type === 'FILL' && local.type === 'FILL') {
    const baseFills = base.fills.map((f) => f.hex ?? f.type).join(', ');
    const locFills = local.fills.map((f) => f.hex ?? f.type).join(', ');
    if (baseFills !== locFills) {
      details.push(`Local fill: ${baseFills} → ${locFills}`);
    }
  }

  if (base.type === 'TEXT' && upstream.type === 'TEXT') {
    if (base.fontFamily !== upstream.fontFamily) {
      details.push(`Upstream font: "${base.fontFamily}" → "${upstream.fontFamily}"`);
    }
    if (base.fontSize !== upstream.fontSize) {
      details.push(`Upstream size: ${base.fontSize} → ${upstream.fontSize}`);
    }
    if (base.fontWeight !== upstream.fontWeight) {
      details.push(`Upstream weight: ${base.fontWeight} → ${upstream.fontWeight}`);
    }
    if (base.lineHeightPx !== upstream.lineHeightPx) {
      details.push(`Upstream line-height: ${base.lineHeightPx} → ${upstream.lineHeightPx}`);
    }
  }

  if (base.type === 'TEXT' && local.type === 'TEXT') {
    if (base.fontFamily !== local.fontFamily) {
      details.push(`Local font: "${base.fontFamily}" → "${local.fontFamily}"`);
    }
    if (base.fontSize !== local.fontSize) {
      details.push(`Local size: ${base.fontSize} → ${local.fontSize}`);
    }
    if (base.fontWeight !== local.fontWeight) {
      details.push(`Local weight: ${base.fontWeight} → ${local.fontWeight}`);
    }
    if (base.lineHeightPx !== local.lineHeightPx) {
      details.push(`Local line-height: ${base.lineHeightPx} → ${local.lineHeightPx}`);
    }
  }

  if (base.type === 'EFFECT' && upstream.type === 'EFFECT') {
    if (JSON.stringify(base.effects) !== JSON.stringify(upstream.effects)) {
      details.push(`Upstream effects changed (${upstream.effects.length} effects)`);
    }
  }

  if (base.type === 'EFFECT' && local.type === 'EFFECT') {
    if (JSON.stringify(base.effects) !== JSON.stringify(local.effects)) {
      details.push(`Local effects changed (${local.effects.length} effects)`);
    }
  }

  if (details.length === 0) {
    details.push(`Style "${key}" changed`);
  }

  return details;
}
