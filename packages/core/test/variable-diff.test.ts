import { describe, it, expect } from 'vitest';
import { diffVariables } from '../src/diff/variable-diff.js';
import type { NormalizedVariable, NormalizedVariableMap } from '../src/normalize/variables.js';

function makeVar(overrides: Partial<NormalizedVariable> = {}): NormalizedVariable {
  return {
    collection: 'Colors',
    name: 'primary',
    type: 'color',
    valuesByMode: { default: '#6459ea' },
    ...overrides,
  };
}

describe('diffVariables', () => {
  it('detects no changes when identical', () => {
    const v = makeVar();
    const base: NormalizedVariableMap = new Map([['Colors/primary', v]]);
    const upstream: NormalizedVariableMap = new Map([['Colors/primary', v]]);
    const local: NormalizedVariableMap = new Map([['Colors/primary', v]]);

    const result = diffVariables(base, upstream, local);
    expect(result).toHaveLength(0);
  });

  it('detects upstream value change', () => {
    const base: NormalizedVariableMap = new Map([['Colors/primary', makeVar()]]);
    const upstream: NormalizedVariableMap = new Map([
      ['Colors/primary', makeVar({ valuesByMode: { default: '#ff0000' } })],
    ]);
    const local: NormalizedVariableMap = new Map([['Colors/primary', makeVar()]]);

    const result = diffVariables(base, upstream, local);
    expect(result).toHaveLength(1);
    expect(result[0]!.changeType).toBe('upstream_changed');
    expect(result[0]!.details.some((d) => d.includes('Upstream') && d.includes('#ff0000'))).toBe(true);
  });

  it('detects type change as conflict', () => {
    const base: NormalizedVariableMap = new Map([['Colors/primary', makeVar()]]);
    const upstream: NormalizedVariableMap = new Map([
      ['Colors/primary', makeVar({ type: 'string' })],
    ]);
    const local: NormalizedVariableMap = new Map([
      ['Colors/primary', makeVar({ type: 'number' })],
    ]);

    const result = diffVariables(base, upstream, local);
    expect(result).toHaveLength(1);
    expect(result[0]!.changeType).toBe('conflict');
  });

  it('detects mode-specific value changes', () => {
    const base: NormalizedVariableMap = new Map([
      ['Colors/bg', makeVar({
        name: 'bg',
        valuesByMode: { Light: '#fff', Dark: '#000' },
      })],
    ]);
    const upstream: NormalizedVariableMap = new Map([
      ['Colors/bg', makeVar({
        name: 'bg',
        valuesByMode: { Light: '#fff', Dark: '#111' },
      })],
    ]);
    const local: NormalizedVariableMap = new Map([
      ['Colors/bg', makeVar({
        name: 'bg',
        valuesByMode: { Light: '#fff', Dark: '#000' },
      })],
    ]);

    const result = diffVariables(base, upstream, local);
    expect(result).toHaveLength(1);
    expect(result[0]!.changeType).toBe('upstream_changed');
    expect(result[0]!.details.some((d) => d.includes('Dark'))).toBe(true);
  });

  it('detects new local variable', () => {
    const base: NormalizedVariableMap = new Map();
    const upstream: NormalizedVariableMap = new Map();
    const local: NormalizedVariableMap = new Map([['Spacing/sm', makeVar({ collection: 'Spacing', name: 'sm', type: 'number', valuesByMode: { default: 8 } })]]);

    const result = diffVariables(base, upstream, local);
    expect(result).toHaveLength(1);
    expect(result[0]!.changeType).toBe('new_local');
  });

  it('handles empty maps', () => {
    const result = diffVariables(new Map(), new Map(), new Map());
    expect(result).toHaveLength(0);
  });
});
