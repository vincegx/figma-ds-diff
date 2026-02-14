import { describe, it, expect } from 'vitest';
import { diffComponents } from '../src/diff/component-diff.js';
import type { NormalizedComponent, NormalizedComponentMap } from '../src/normalize/components.js';

function makeComp(overrides: Partial<NormalizedComponent> = {}): NormalizedComponent {
  return {
    name: 'Button',
    path: 'Page/Button',
    nodeId: '1:1',
    description: '',
    variants: [],
    properties: [],
    strippedNode: null,
    ...overrides,
  };
}

describe('diffComponents', () => {
  it('detects no changes when identical', () => {
    const base: NormalizedComponentMap = new Map([['Page/Button', makeComp()]]);
    const upstream: NormalizedComponentMap = new Map([['Page/Button', makeComp()]]);
    const local: NormalizedComponentMap = new Map([['Page/Button', makeComp()]]);

    const result = diffComponents(base, upstream, local);
    expect(result).toHaveLength(0);
  });

  it('detects upstream variant addition', () => {
    const base: NormalizedComponentMap = new Map([['Page/Button', makeComp()]]);
    const upstream: NormalizedComponentMap = new Map([
      ['Page/Button', makeComp({
        variants: [{ name: 'Type=Primary', nodeId: '2:1', properties: { Type: 'Primary' } }],
      })],
    ]);
    const local: NormalizedComponentMap = new Map([['Page/Button', makeComp()]]);

    const result = diffComponents(base, upstream, local);
    expect(result).toHaveLength(1);
    expect(result[0]!.changeType).toBe('upstream_changed');
    expect(result[0]!.details.some((d) => d.includes('variant'))).toBe(true);
  });

  it('detects local description change', () => {
    const base: NormalizedComponentMap = new Map([['Page/Button', makeComp({ description: 'Old' })]]);
    const upstream: NormalizedComponentMap = new Map([['Page/Button', makeComp({ description: 'Old' })]]);
    const local: NormalizedComponentMap = new Map([['Page/Button', makeComp({ description: 'New' })]]);

    const result = diffComponents(base, upstream, local);
    expect(result).toHaveLength(1);
    expect(result[0]!.changeType).toBe('local_changed');
  });

  it('detects conflict when both change properties', () => {
    const baseProp = { name: 'Label', type: 'TEXT', defaultValue: 'Click' as string | boolean | undefined };
    const base: NormalizedComponentMap = new Map([
      ['Page/Button', makeComp({ properties: [baseProp] })],
    ]);
    const upstream: NormalizedComponentMap = new Map([
      ['Page/Button', makeComp({ properties: [{ ...baseProp, defaultValue: 'Submit' }] })],
    ]);
    const local: NormalizedComponentMap = new Map([
      ['Page/Button', makeComp({ properties: [{ ...baseProp, defaultValue: 'Go' }] })],
    ]);

    const result = diffComponents(base, upstream, local);
    expect(result).toHaveLength(1);
    expect(result[0]!.changeType).toBe('conflict');
  });

  it('detects new upstream component', () => {
    const base: NormalizedComponentMap = new Map();
    const upstream: NormalizedComponentMap = new Map([['Page/Card', makeComp({ name: 'Card', path: 'Page/Card' })]]);
    const local: NormalizedComponentMap = new Map();

    const result = diffComponents(base, upstream, local);
    expect(result).toHaveLength(1);
    expect(result[0]!.changeType).toBe('new_upstream');
  });

  it('detects deleted local component', () => {
    const base: NormalizedComponentMap = new Map([['Page/Button', makeComp()]]);
    const upstream: NormalizedComponentMap = new Map([['Page/Button', makeComp()]]);
    const local: NormalizedComponentMap = new Map();

    const result = diffComponents(base, upstream, local);
    expect(result).toHaveLength(1);
    expect(result[0]!.changeType).toBe('deleted_local');
  });

  it('handles property addition in upstream', () => {
    const base: NormalizedComponentMap = new Map([['Page/Button', makeComp()]]);
    const upstream: NormalizedComponentMap = new Map([
      ['Page/Button', makeComp({
        properties: [{ name: 'Disabled', type: 'BOOLEAN', defaultValue: false }],
      })],
    ]);
    const local: NormalizedComponentMap = new Map([['Page/Button', makeComp()]]);

    const result = diffComponents(base, upstream, local);
    expect(result).toHaveLength(1);
    expect(result[0]!.changeType).toBe('upstream_changed');
    expect(result[0]!.details.some((d) => d.includes('property') && d.includes('Disabled'))).toBe(true);
  });
});
