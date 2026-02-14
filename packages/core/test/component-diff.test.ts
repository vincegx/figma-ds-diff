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

  it('describes structural color changes with hex values', () => {
    const baseNode = {
      children: [{
        fills: [{ color: { r: 1, g: 0, b: 0, a: 1 } }],
        backgroundColor: { r: 1, g: 0, b: 0, a: 1 },
      }],
    };
    const upstreamNode = {
      children: [{
        fills: [{ color: { r: 0, g: 0, b: 1, a: 1 } }],
        backgroundColor: { r: 0, g: 0, b: 1, a: 1 },
      }],
    };

    const base: NormalizedComponentMap = new Map([
      ['Page/Card', makeComp({ name: 'Card', path: 'Page/Card', strippedNode: baseNode })],
    ]);
    const upstream: NormalizedComponentMap = new Map([
      ['Page/Card', makeComp({ name: 'Card', path: 'Page/Card', strippedNode: upstreamNode })],
    ]);
    const local: NormalizedComponentMap = new Map([
      ['Page/Card', makeComp({ name: 'Card', path: 'Page/Card', strippedNode: baseNode })],
    ]);

    const result = diffComponents(base, upstream, local);
    expect(result).toHaveLength(1);
    expect(result[0]!.changeType).toBe('upstream_changed');
    // Should have hex color details, not generic "Structural changes"
    const details = result[0]!.details;
    expect(details.some((d) => d.includes('#'))).toBe(true);
    expect(details.some((d) => d.includes('Structural changes'))).toBe(false);
  });

  it('describes cornerRadius and padding changes', () => {
    const baseNode = {
      cornerRadius: 8,
      paddingLeft: 16,
      paddingTop: 12,
    };
    const upstreamNode = {
      cornerRadius: 16,
      paddingLeft: 24,
      paddingTop: 12,
    };

    const base: NormalizedComponentMap = new Map([
      ['Page/Card', makeComp({ name: 'Card', path: 'Page/Card', strippedNode: baseNode })],
    ]);
    const upstream: NormalizedComponentMap = new Map([
      ['Page/Card', makeComp({ name: 'Card', path: 'Page/Card', strippedNode: upstreamNode })],
    ]);
    const local: NormalizedComponentMap = new Map([
      ['Page/Card', makeComp({ name: 'Card', path: 'Page/Card', strippedNode: baseNode })],
    ]);

    const result = diffComponents(base, upstream, local);
    expect(result).toHaveLength(1);
    const details = result[0]!.details;
    expect(details.some((d) => d.includes('cornerRadius') && d.includes('8') && d.includes('16'))).toBe(true);
    expect(details.some((d) => d.includes('paddingLeft') && d.includes('24'))).toBe(true);
  });

  it('describes added cornerRadius property', () => {
    const baseNode = { children: [{ name: 'Frame' }] };
    const upstreamNode = { children: [{ name: 'Frame', cornerRadius: 30, cornerSmoothing: 0.6 }] };

    const base: NormalizedComponentMap = new Map([
      ['Page/Card', makeComp({ name: 'Card', path: 'Page/Card', strippedNode: baseNode })],
    ]);
    const upstream: NormalizedComponentMap = new Map([
      ['Page/Card', makeComp({ name: 'Card', path: 'Page/Card', strippedNode: upstreamNode })],
    ]);
    const local: NormalizedComponentMap = new Map([
      ['Page/Card', makeComp({ name: 'Card', path: 'Page/Card', strippedNode: baseNode })],
    ]);

    const result = diffComponents(base, upstream, local);
    expect(result).toHaveLength(1);
    const details = result[0]!.details;
    expect(details.some((d) => d.includes('cornerRadius') && d.includes('30'))).toBe(true);
  });

  it('handles deep nested color + radius like real Figma data', () => {
    const baseNode = {
      children: [{
        backgroundColor: { r: 0.9725, g: 0.8510, b: 0, a: 1 },
        fills: [{ color: { r: 0.9725, g: 0.8510, b: 0, a: 1 } }],
        children: [{
          children: [{
            children: [{
              children: [{
                cornerRadius: undefined as number | undefined,
              }],
            }],
          }],
        }],
      }],
      layoutGrids: [{ sectionSize: 84.67 }],
    };
    const upstreamNode = {
      children: [{
        backgroundColor: { r: 0.4214, g: 0.9725, b: 0, a: 1 },
        fills: [{ color: { r: 0.4214, g: 0.9725, b: 0, a: 1 } }],
        children: [{
          children: [{
            children: [{
              children: [{
                cornerRadius: 30,
                cornerSmoothing: 0.6,
              }],
            }],
          }],
        }],
      }],
      layoutGrids: [{ sectionSize: 124.67 }],
    };

    const base: NormalizedComponentMap = new Map([
      ['404/Error', makeComp({ name: 'Error 404', path: '404/Error', strippedNode: baseNode })],
    ]);
    const upstream: NormalizedComponentMap = new Map([
      ['404/Error', makeComp({ name: 'Error 404', path: '404/Error', strippedNode: upstreamNode })],
    ]);
    const local: NormalizedComponentMap = new Map([
      ['404/Error', makeComp({ name: 'Error 404', path: '404/Error', strippedNode: baseNode })],
    ]);

    const result = diffComponents(base, upstream, local);
    expect(result).toHaveLength(1);
    const details = result[0]!.details;
    // Should contain specific info, not generic message
    expect(details.some((d) => d.includes('Structural changes'))).toBe(false);
    expect(details.some((d) => d.includes('color'))).toBe(true);
    expect(details.some((d) => d.includes('cornerRadius'))).toBe(true);
    expect(details.some((d) => d.includes('grid'))).toBe(true);
  });
});
