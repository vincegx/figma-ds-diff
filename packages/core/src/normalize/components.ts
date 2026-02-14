/**
 * Normalize component and componentSet data from a Figma file response
 * into a stable, comparable map keyed by component path.
 */

import type { GetFileResponse, BaseNode } from '../figma/types.js';
import { stripVolatileFields } from './filters.js';

// ── Normalized types ───────────────────────────────────────────────────

export interface NormalizedVariant {
  name: string;
  nodeId: string;
  properties: Record<string, string>;
}

export interface NormalizedComponentProperty {
  name: string;
  type: string;
  defaultValue: string | boolean | undefined;
}

export interface NormalizedComponent {
  /** Display name (componentSet name or standalone component name) */
  name: string;
  /** Page > parent path for uniqueness */
  path: string;
  /** Node ID of the componentSet (or component if standalone) */
  nodeId: string;
  /** Description from Figma metadata */
  description: string;
  /** Variants if this is a componentSet */
  variants: NormalizedVariant[];
  /** Component properties (from componentPropertyDefinitions) */
  properties: NormalizedComponentProperty[];
  /** Stripped node data for deep comparison */
  strippedNode: unknown;
}

/** Map keyed by component path */
export type NormalizedComponentMap = Map<string, NormalizedComponent>;

// ── Main function ──────────────────────────────────────────────────────

/**
 * Extract and normalize all components from a Figma file response.
 *
 * Groups variant components under their componentSet parent.
 * Standalone components (no componentSetId) are treated individually.
 */
export function normalizeComponents(
  file: GetFileResponse,
): NormalizedComponentMap {
  const result: NormalizedComponentMap = new Map();

  // Build a node lookup from the document tree
  const nodeIndex = new Map<string, BaseNode>();
  const parentIndex = new Map<string, BaseNode>();
  indexNodes(file.document, nodeIndex, parentIndex);

  // Build page path index: nodeId → "PageName / ParentFrame / ..."
  const pathIndex = new Map<string, string>();
  buildPaths(file.document, [], pathIndex);

  // Process componentSets first (groups of variants)
  const processedVariantIds = new Set<string>();

  for (const [setNodeId, setMeta] of Object.entries(
    file.componentSets ?? {},
  )) {
    const setNode = nodeIndex.get(setNodeId);
    const fullPath = pathIndex.get(setNodeId) ?? setMeta.name;

    // Find variant components belonging to this set
    const variants: NormalizedVariant[] = [];
    for (const [compNodeId, compMeta] of Object.entries(file.components)) {
      if (compMeta.componentSetId === setNodeId) {
        processedVariantIds.add(compNodeId);
        variants.push({
          name: compMeta.name,
          nodeId: compNodeId,
          properties: parseVariantName(compMeta.name),
        });
      }
    }

    // Sort variants by name for stable ordering
    variants.sort((a, b) => a.name.localeCompare(b.name));

    // Extract component properties from node's componentPropertyDefinitions
    const properties = extractComponentProperties(setNode);

    result.set(fullPath, {
      name: setMeta.name,
      path: fullPath,
      nodeId: setNodeId,
      description: setMeta.description,
      variants,
      properties,
      strippedNode: setNode ? stripVolatileFields(setNode) : null,
    });
  }

  // Process standalone components (not part of a componentSet)
  for (const [compNodeId, compMeta] of Object.entries(file.components)) {
    if (processedVariantIds.has(compNodeId)) continue;

    const fullPath = pathIndex.get(compNodeId) ?? compMeta.name;
    const compNode = nodeIndex.get(compNodeId);
    const properties = extractComponentProperties(compNode);

    result.set(fullPath, {
      name: compMeta.name,
      path: fullPath,
      nodeId: compNodeId,
      description: compMeta.description,
      variants: [],
      properties,
      strippedNode: compNode ? stripVolatileFields(compNode) : null,
    });
  }

  return result;
}

// ── Helpers ────────────────────────────────────────────────────────────

/** Recursively index all nodes by their ID */
function indexNodes(
  node: BaseNode,
  index: Map<string, BaseNode>,
  parentIndex: Map<string, BaseNode>,
): void {
  index.set(node.id, node);
  if (node.children) {
    for (const child of node.children) {
      parentIndex.set(child.id, node);
      indexNodes(child, index, parentIndex);
    }
  }
}

/** Build path strings: "PageName / Frame / SubFrame" for each node */
function buildPaths(
  node: BaseNode,
  ancestors: string[],
  pathIndex: Map<string, string>,
): void {
  const currentPath =
    node.type === 'DOCUMENT' ? [] : [...ancestors, node.name];

  // Only store path for non-DOCUMENT nodes
  if (node.type !== 'DOCUMENT') {
    // For CANVAS (page), the path is just the page name
    // For deeper nodes, join ancestors excluding the DOCUMENT level
    pathIndex.set(node.id, currentPath.join('/'));
  }

  if (node.children) {
    for (const child of node.children) {
      buildPaths(child, currentPath, pathIndex);
    }
  }
}

/**
 * Parse Figma variant name like "Type=Primary, State=Hover"
 * into { Type: "Primary", State: "Hover" }
 */
function parseVariantName(name: string): Record<string, string> {
  const props: Record<string, string> = {};
  const parts = name.split(',').map((s) => s.trim());
  for (const part of parts) {
    const eqIdx = part.indexOf('=');
    if (eqIdx > 0) {
      const key = part.slice(0, eqIdx).trim();
      const value = part.slice(eqIdx + 1).trim();
      props[key] = value;
    }
  }
  return props;
}

/**
 * Extract componentPropertyDefinitions from a node.
 * These are defined on componentSet or component nodes.
 */
function extractComponentProperties(
  node: BaseNode | undefined,
): NormalizedComponentProperty[] {
  if (!node) return [];

  const defs = (node as Record<string, unknown>)[
    'componentPropertyDefinitions'
  ] as Record<string, { type: string; defaultValue?: string | boolean }> | undefined;

  if (!defs) return [];

  return Object.entries(defs)
    .map(([name, def]) => ({
      name,
      type: def.type,
      defaultValue: def.defaultValue,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
