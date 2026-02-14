/**
 * Variable-specific three-way diff.
 * Compares valuesByMode, type changes.
 */

import type { NormalizedVariable, NormalizedVariableMap } from '../normalize/variables.js';
import type { DiffEntry } from './types.js';
import { threeWayDiff } from './three-way.js';

export function diffVariables(
  base: NormalizedVariableMap,
  upstream: NormalizedVariableMap,
  local: NormalizedVariableMap,
): DiffEntry<NormalizedVariable>[] {
  return threeWayDiff(base, upstream, local, {
    isEqual: variablesEqual,
    describeChanges: describeVariableChanges,
  });
}

function variablesEqual(a: NormalizedVariable, b: NormalizedVariable): boolean {
  if (a.type !== b.type) return false;
  if (a.name !== b.name) return false;
  if (a.collection !== b.collection) return false;
  return JSON.stringify(a.valuesByMode) === JSON.stringify(b.valuesByMode);
}

function describeVariableChanges(
  key: string,
  base: NormalizedVariable | undefined,
  upstream: NormalizedVariable | undefined,
  local: NormalizedVariable | undefined,
): string[] {
  const details: string[] = [];

  if (!base) {
    details.push(`New variable "${key}"`);
    return details;
  }

  if (!upstream) {
    details.push(`Variable "${key}" deleted upstream`);
    return details;
  }

  if (!local) {
    details.push(`Variable "${key}" deleted locally`);
    return details;
  }

  // Type change
  if (upstream.type !== base.type) {
    details.push(`Upstream type: "${base.type}" → "${upstream.type}"`);
  }
  if (local.type !== base.type) {
    details.push(`Local type: "${base.type}" → "${local.type}"`);
  }

  // Value changes per mode
  const allModes = new Set([
    ...Object.keys(base.valuesByMode),
    ...Object.keys(upstream.valuesByMode),
    ...Object.keys(local.valuesByMode),
  ]);

  for (const mode of allModes) {
    const baseStr = JSON.stringify(base.valuesByMode[mode]);
    const upStr = JSON.stringify(upstream.valuesByMode[mode]);
    const locStr = JSON.stringify(local.valuesByMode[mode]);

    if (baseStr !== upStr) {
      details.push(
        `Upstream [${mode}]: ${baseStr ?? 'undefined'} → ${upStr ?? 'undefined'}`,
      );
    }
    if (baseStr !== locStr) {
      details.push(
        `Local [${mode}]: ${baseStr ?? 'undefined'} → ${locStr ?? 'undefined'}`,
      );
    }
  }

  if (details.length === 0) {
    details.push(`Variable "${key}" changed`);
  }

  return details;
}
