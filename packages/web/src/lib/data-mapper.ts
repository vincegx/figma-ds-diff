import type { ChangeType } from '@/lib/change-types';
import type { ReportData, ComponentDiff, VariableDiff, VariableModeValue } from '@/types/report';

/* ── Core → UI change-type mapping ── */
const CHANGE_TYPE_MAP: Record<string, ChangeType> = {
  upstream_changed: 'upstream',
  renamed_upstream: 'upstream',
  local_changed: 'local',
  new_local: 'local',
  renamed_local: 'local',
  deleted_local: 'local',
  conflict: 'conflict',
  new_upstream: 'new_upstream',
  deleted_upstream: 'deleted_upstream',
};

/**
 * Sanitize a component key to produce the image filename base.
 * Must match core's `sanitizeFilename()` in images/downloader.ts.
 */
function sanitizeKey(path: string): string {
  return path
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 100);
}

/** Extract group from component path — first segment, emoji stripped. */
function extractGroup(path: string): string {
  const first = path.split('/')[0] ?? '';
  // Strip emoji: remove surrogate pairs and common emoji codepoints
  return first.replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|[\u{200D}]|[\u{20E3}]|[\u{E0020}-\u{E007F}]/gu, '').trim();
}

/** Pick the best name from the three versions. */
function pickName(comp: CoreComponent): string {
  return comp.upstream?.name ?? comp.base?.name ?? comp.local?.name ?? comp.key;
}

/** Count variants in a version (or 0 if absent). */
function countVariants(version: CoreVersion | undefined): number {
  return version?.variants?.length ?? 0;
}

/* ── Raw types from core's data.json ── */

interface CoreVersion {
  name: string;
  path: string;
  nodeId: string;
  description?: string;
  variants?: unknown[];
  properties?: unknown[];
  strippedNode?: unknown;
}

interface CoreComponent {
  key: string;
  changeType: string;
  base?: CoreVersion;
  upstream?: CoreVersion;
  local?: CoreVersion;
  details?: unknown[];
}

interface CoreSummary {
  total: number;
  unchanged?: number;
  upstreamChanges: number;
  localChanges: number;
  conflicts: number;
  newUpstream: number;
  newLocal: number;
  deletedUpstream: number;
  deletedLocal: number;
  renamedUpstream?: number;
  renamedLocal?: number;
}

interface CoreVariableVersion {
  collection: string;
  name: string;
  type: string;
  valuesByMode: Record<string, unknown>;
}

interface CoreVariable {
  key: string;
  changeType: string;
  base?: CoreVariableVersion;
  upstream?: CoreVariableVersion;
  local?: CoreVariableVersion;
}

interface CoreData {
  constructorName: string;
  forkName: string;
  constructorFileKey?: string;
  forkFileKey?: string;
  baselineVersionId?: string;
  baselineVersionDate?: string;
  generatedAt: string;
  components: CoreComponent[];
  styles: unknown[];
  variables: CoreVariable[];
  summary: CoreSummary;
}

/**
 * Transform core's data.json into the UI ReportData shape.
 * Strips strippedNode and other heavy fields.
 */
export function mapReportData(raw: unknown): ReportData {
  const data = raw as CoreData;
  const s = data.summary;

  const components: ComponentDiff[] = data.components.map((comp) => {
    const sanitized = sanitizeKey(comp.key);
    const type = CHANGE_TYPE_MAP[comp.changeType] ?? 'upstream';

    return {
      id: comp.key,
      name: pickName(comp),
      group: extractGroup(comp.key),
      type,
      diffPct: 0,
      upstreamNodeId: comp.upstream?.nodeId,
      localNodeId: comp.local?.nodeId,
      variants: {
        base: countVariants(comp.base),
        upstream: countVariants(comp.upstream),
        local: countVariants(comp.local),
      },
      details: (comp.details as string[] | undefined) ?? [],
      props: [],
      images: {
        base: undefined, // Figma Images API cannot render historical versions
        upstream: comp.upstream ? `${sanitized}_upstream.png` : undefined,
        local: comp.local ? `${sanitized}_local.png` : undefined,
        diff: `${sanitized}_diff.png`,
      },
    };
  });

  // Map variables
  const variables: VariableDiff[] = (data.variables ?? []).map((v) => {
    const ct = CHANGE_TYPE_MAP[v.changeType];
    const status: VariableDiff['status'] =
      ct === 'conflict' ? 'conflict' : ct === 'local' ? 'local' : 'upstream';

    const stringify = (val: unknown): string => {
      if (val == null) return '—';
      if (typeof val !== 'object') return String(val);
      return JSON.stringify(val);
    };

    /** Flatten nested valuesByMode into a flat Record<modeName, stringValue>. */
    const flattenModes = (vbm: Record<string, unknown>): Record<string, string> => {
      const result: Record<string, string> = {};
      for (const [key, val] of Object.entries(vbm)) {
        if (val != null && typeof val === 'object' && !Array.isArray(val)) {
          // Nested: { "default": { "SDS Light": "...", "SDS Dark": "..." } }
          for (const [subKey, subVal] of Object.entries(val as Record<string, unknown>)) {
            result[subKey] = stringify(subVal);
          }
        } else {
          result[key] = stringify(val);
        }
      }
      return result;
    };

    const upModes = v.upstream ? flattenModes(v.upstream.valuesByMode) : {};
    const localModes = v.local ? flattenModes(v.local.valuesByMode) : {};
    const allModeNames = [...new Set([...Object.keys(upModes), ...Object.keys(localModes)])];

    const upstreamValues: VariableModeValue[] = allModeNames.map((mode) => ({
      mode,
      value: upModes[mode] ?? '—',
      changed: upModes[mode] !== localModes[mode],
    }));
    const localValues: VariableModeValue[] = allModeNames.map((mode) => ({
      mode,
      value: localModes[mode] ?? '—',
      changed: upModes[mode] !== localModes[mode],
    }));

    return {
      name: v.base?.name ?? v.upstream?.name ?? v.local?.name ?? v.key,
      collection: v.base?.collection ?? v.upstream?.collection ?? v.local?.collection ?? '',
      upstream: upstreamValues,
      local: localValues,
      status,
    };
  });

  return {
    meta: {
      constructorName: data.constructorName,
      forkName: data.forkName,
      constructorFileKey: data.constructorFileKey,
      forkFileKey: data.forkFileKey,
      baseline: data.baselineVersionDate ?? 'Unknown',
      date: data.generatedAt,
      summary: {
        upstream: s.upstreamChanges + s.newUpstream + (s.renamedUpstream ?? 0),
        local: s.localChanges + s.newLocal + (s.renamedLocal ?? 0),
        conflicts: s.conflicts,
        total: s.total,
      },
    },
    components,
    styles: [],
    variables,
  };
}
