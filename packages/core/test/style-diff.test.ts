import { describe, it, expect } from 'vitest';
import { diffStyles } from '../src/diff/style-diff.js';
import type { NormalizedStyle, NormalizedStyleMap } from '../src/normalize/styles.js';

function makeFillStyle(hex: string, name = 'Primary/500'): NormalizedStyle {
  return {
    type: 'FILL',
    name,
    nodeId: '1:1',
    description: '',
    fills: [{ type: 'SOLID', hex, rgba: { r: 0, g: 0, b: 0, a: 1 } }],
  };
}

function makeTextStyle(overrides: Partial<Extract<NormalizedStyle, { type: 'TEXT' }>> = {}): NormalizedStyle {
  return {
    type: 'TEXT',
    name: 'Heading/H1',
    nodeId: '2:1',
    description: '',
    fontFamily: 'Roboto',
    fontSize: 32,
    fontWeight: 700,
    lineHeightPx: 40,
    ...overrides,
  };
}

describe('diffStyles', () => {
  it('detects no changes when identical', () => {
    const style = makeFillStyle('#ff0000');
    const base: NormalizedStyleMap = new Map([['Primary/500', style]]);
    const upstream: NormalizedStyleMap = new Map([['Primary/500', style]]);
    const local: NormalizedStyleMap = new Map([['Primary/500', style]]);

    const result = diffStyles(base, upstream, local);
    expect(result).toHaveLength(0);
  });

  it('detects upstream color change', () => {
    const base: NormalizedStyleMap = new Map([['Primary/500', makeFillStyle('#ff0000')]]);
    const upstream: NormalizedStyleMap = new Map([['Primary/500', makeFillStyle('#0000ff')]]);
    const local: NormalizedStyleMap = new Map([['Primary/500', makeFillStyle('#ff0000')]]);

    const result = diffStyles(base, upstream, local);
    expect(result).toHaveLength(1);
    expect(result[0]!.changeType).toBe('upstream_changed');
    expect(result[0]!.details.some((d) => d.includes('#ff0000') && d.includes('#0000ff'))).toBe(true);
  });

  it('detects local font change', () => {
    const base: NormalizedStyleMap = new Map([['Heading/H1', makeTextStyle()]]);
    const upstream: NormalizedStyleMap = new Map([['Heading/H1', makeTextStyle()]]);
    const local: NormalizedStyleMap = new Map([['Heading/H1', makeTextStyle({ fontFamily: 'Inter' })]]);

    const result = diffStyles(base, upstream, local);
    expect(result).toHaveLength(1);
    expect(result[0]!.changeType).toBe('local_changed');
    expect(result[0]!.details.some((d) => d.includes('font') && d.includes('Inter'))).toBe(true);
  });

  it('detects conflict on font size', () => {
    const base: NormalizedStyleMap = new Map([['Heading/H1', makeTextStyle()]]);
    const upstream: NormalizedStyleMap = new Map([['Heading/H1', makeTextStyle({ fontSize: 36 })]]);
    const local: NormalizedStyleMap = new Map([['Heading/H1', makeTextStyle({ fontSize: 28 })]]);

    const result = diffStyles(base, upstream, local);
    expect(result).toHaveLength(1);
    expect(result[0]!.changeType).toBe('conflict');
  });

  it('detects new upstream style', () => {
    const base: NormalizedStyleMap = new Map();
    const upstream: NormalizedStyleMap = new Map([['New/Color', makeFillStyle('#00ff00', 'New/Color')]]);
    const local: NormalizedStyleMap = new Map();

    const result = diffStyles(base, upstream, local);
    expect(result).toHaveLength(1);
    expect(result[0]!.changeType).toBe('new_upstream');
  });

  it('detects deleted upstream style', () => {
    const base: NormalizedStyleMap = new Map([['Old/Color', makeFillStyle('#ff0000', 'Old/Color')]]);
    const upstream: NormalizedStyleMap = new Map();
    const local: NormalizedStyleMap = new Map([['Old/Color', makeFillStyle('#ff0000', 'Old/Color')]]);

    const result = diffStyles(base, upstream, local);
    expect(result).toHaveLength(1);
    expect(result[0]!.changeType).toBe('deleted_upstream');
  });
});
