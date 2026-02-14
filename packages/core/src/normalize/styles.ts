/**
 * Normalize style data from a Figma file.
 *
 * Figma's /styles endpoint only returns metadata (name, type, node_id).
 * To get actual style values we need to fetch node data via /nodes?ids=.
 * This module handles both: extracting metadata from the file response,
 * and enriching with resolved values from node data.
 */

import type {
  GetFileResponse,
  GetFileNodesResponse,
  StyleType,
} from '../figma/types.js';
import { rgbaToHex, roundColorValues } from './filters.js';

// ── Normalized types ───────────────────────────────────────────────────

export interface NormalizedColorStyle {
  type: 'FILL';
  name: string;
  nodeId: string;
  description: string;
  /** Resolved fill values */
  fills: NormalizedFill[];
}

export interface NormalizedFill {
  type: string;
  hex?: string;
  rgba?: { r: number; g: number; b: number; a: number };
  opacity?: number;
  visible?: boolean;
}

export interface NormalizedTextStyle {
  type: 'TEXT';
  name: string;
  nodeId: string;
  description: string;
  /** Resolved typography values */
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  lineHeightPx?: number;
  lineHeightPercent?: number;
  letterSpacing?: number;
  textCase?: string;
  textDecoration?: string;
}

export interface NormalizedEffectStyle {
  type: 'EFFECT';
  name: string;
  nodeId: string;
  description: string;
  /** Resolved effect values */
  effects: NormalizedEffect[];
}

export interface NormalizedEffect {
  type: string;
  visible?: boolean;
  radius?: number;
  spread?: number;
  color?: string;
  offset?: { x: number; y: number };
}

export interface NormalizedGridStyle {
  type: 'GRID';
  name: string;
  nodeId: string;
  description: string;
}

export type NormalizedStyle =
  | NormalizedColorStyle
  | NormalizedTextStyle
  | NormalizedEffectStyle
  | NormalizedGridStyle;

/** Map keyed by style name */
export type NormalizedStyleMap = Map<string, NormalizedStyle>;

// ── Main functions ─────────────────────────────────────────────────────

/**
 * Extract style metadata from a file response (no resolved values yet).
 * Returns a map and the list of node IDs that need fetching for values.
 */
export function extractStyleMetadata(file: GetFileResponse): {
  styles: NormalizedStyleMap;
  nodeIdsToFetch: string[];
} {
  const styles: NormalizedStyleMap = new Map();
  const nodeIdsToFetch: string[] = [];

  for (const [nodeId, meta] of Object.entries(file.styles)) {
    const base = {
      name: meta.name,
      nodeId,
      description: meta.description,
    };

    switch (meta.styleType) {
      case 'FILL':
        styles.set(meta.name, { ...base, type: 'FILL', fills: [] });
        nodeIdsToFetch.push(nodeId);
        break;
      case 'TEXT':
        styles.set(meta.name, { ...base, type: 'TEXT' });
        nodeIdsToFetch.push(nodeId);
        break;
      case 'EFFECT':
        styles.set(meta.name, { ...base, type: 'EFFECT', effects: [] });
        nodeIdsToFetch.push(nodeId);
        break;
      case 'GRID':
        styles.set(meta.name, { ...base, type: 'GRID' });
        break;
    }
  }

  return { styles, nodeIdsToFetch };
}

/**
 * Enrich style metadata with resolved values from node data.
 * Mutates the styles map in place.
 */
export function enrichStylesWithNodeData(
  styles: NormalizedStyleMap,
  nodesResponse: GetFileNodesResponse,
): void {
  for (const style of styles.values()) {
    const nodeEntry = nodesResponse.nodes[style.nodeId];
    if (!nodeEntry) continue;

    const doc = nodeEntry.document as Record<string, unknown>;

    switch (style.type) {
      case 'FILL':
        enrichFillStyle(style, doc);
        break;
      case 'TEXT':
        enrichTextStyle(style, doc);
        break;
      case 'EFFECT':
        enrichEffectStyle(style, doc);
        break;
    }
  }
}

/**
 * Full pipeline: extract metadata + enrich from node data.
 */
export function normalizeStyles(
  file: GetFileResponse,
  nodesResponse?: GetFileNodesResponse,
): NormalizedStyleMap {
  const { styles, nodeIdsToFetch: _ } = extractStyleMetadata(file);
  if (nodesResponse) {
    enrichStylesWithNodeData(styles, nodesResponse);
  }
  return styles;
}

// ── Enrichment helpers ─────────────────────────────────────────────────

function enrichFillStyle(
  style: NormalizedColorStyle,
  doc: Record<string, unknown>,
): void {
  const fills = doc['fills'];
  if (!Array.isArray(fills)) return;

  style.fills = fills.map((fill) => {
    const result: NormalizedFill = {
      type: (fill['type'] as string) ?? 'SOLID',
      visible: fill['visible'] as boolean | undefined,
    };

    const color = fill['color'] as
      | { r: number; g: number; b: number; a: number }
      | undefined;
    if (color) {
      const rounded = roundColorValues(color);
      result.rgba = rounded;
      result.hex = rgbaToHex(rounded);
    }

    if (fill['opacity'] != null) {
      result.opacity = fill['opacity'] as number;
    }

    return result;
  });
}

function enrichTextStyle(
  style: NormalizedTextStyle,
  doc: Record<string, unknown>,
): void {
  // Text style properties can be on the node itself or in a "style" sub-object
  const styleObj = (doc['style'] as Record<string, unknown>) ?? doc;

  style.fontFamily = styleObj['fontFamily'] as string | undefined;
  style.fontSize = styleObj['fontSize'] as number | undefined;
  style.fontWeight = styleObj['fontWeight'] as number | undefined;
  style.lineHeightPx = styleObj['lineHeightPx'] as number | undefined;
  style.lineHeightPercent = styleObj['lineHeightPercent'] as number | undefined;
  style.letterSpacing = styleObj['letterSpacing'] as number | undefined;
  style.textCase = styleObj['textCase'] as string | undefined;
  style.textDecoration = styleObj['textDecoration'] as string | undefined;
}

function enrichEffectStyle(
  style: NormalizedEffectStyle,
  doc: Record<string, unknown>,
): void {
  const effects = doc['effects'];
  if (!Array.isArray(effects)) return;

  style.effects = effects.map((effect) => {
    const result: NormalizedEffect = {
      type: (effect['type'] as string) ?? 'DROP_SHADOW',
      visible: effect['visible'] as boolean | undefined,
      radius: effect['radius'] as number | undefined,
      spread: effect['spread'] as number | undefined,
    };

    const color = effect['color'] as
      | { r: number; g: number; b: number; a: number }
      | undefined;
    if (color) {
      result.color = rgbaToHex(roundColorValues(color));
    }

    const offset = effect['offset'] as
      | { x: number; y: number }
      | undefined;
    if (offset) {
      result.offset = offset;
    }

    return result;
  });
}
