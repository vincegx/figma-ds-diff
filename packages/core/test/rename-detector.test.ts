import { describe, it, expect } from 'vitest';
import { detectRenames } from '../src/diff/rename-detector.js';
import { componentSimilarity } from '../src/diff/component-diff.js';
import { styleSimilarity } from '../src/diff/style-diff.js';
import type { DiffEntry } from '../src/diff/types.js';
import type { NormalizedComponent } from '../src/normalize/components.js';
import type { NormalizedStyle } from '../src/normalize/styles.js';

// ── Component rename detection ──────────────────────────────────────

function makeComponent(overrides: Partial<NormalizedComponent> = {}): NormalizedComponent {
  return {
    name: 'Button',
    path: 'Page/Button',
    nodeId: '1:1',
    description: '',
    variants: [
      { name: 'Type=Primary', nodeId: '1:2', properties: { Type: 'Primary' } },
      { name: 'Type=Secondary', nodeId: '1:3', properties: { Type: 'Secondary' } },
    ],
    properties: [
      { name: 'label', type: 'TEXT', defaultValue: 'Click' },
    ],
    strippedNode: { type: 'COMPONENT_SET', children: [] },
    ...overrides,
  };
}

describe('detectRenames', () => {
  it('should detect upstream rename (delete_upstream + new_upstream with same structure)', () => {
    const base = makeComponent({ name: 'OldButton', path: 'Page/OldButton' });
    const renamed = makeComponent({ name: 'NewButton', path: 'Page/NewButton', nodeId: '2:1' });

    const entries: DiffEntry<NormalizedComponent>[] = [
      {
        key: 'Page/OldButton',
        changeType: 'deleted_upstream',
        base,
        upstream: undefined,
        local: base,
        details: ['Component "OldButton" deleted upstream'],
      },
      {
        key: 'Page/NewButton',
        changeType: 'new_upstream',
        base: undefined,
        upstream: renamed,
        local: undefined,
        details: ['New component "NewButton"'],
      },
    ];

    const result = detectRenames(entries, { similarity: componentSimilarity });

    expect(result).toHaveLength(1);
    expect(result[0]!.changeType).toBe('renamed_upstream');
    expect(result[0]!.key).toBe('Page/NewButton');
    expect(result[0]!.base).toBe(base);
    expect(result[0]!.upstream).toBe(renamed);
    expect(result[0]!.details[0]).toContain('Renamed from');
  });

  it('should detect local rename (deleted_local + new_local with same structure)', () => {
    const base = makeComponent({ name: 'OldInput', path: 'Page/OldInput' });
    const renamed = makeComponent({ name: 'NewInput', path: 'Page/NewInput', nodeId: '3:1' });

    const entries: DiffEntry<NormalizedComponent>[] = [
      {
        key: 'Page/OldInput',
        changeType: 'deleted_local',
        base,
        upstream: base,
        local: undefined,
        details: ['Component "OldInput" deleted locally'],
      },
      {
        key: 'Page/NewInput',
        changeType: 'new_local',
        base: undefined,
        upstream: undefined,
        local: renamed,
        details: ['New component "NewInput"'],
      },
    ];

    const result = detectRenames(entries, { similarity: componentSimilarity });

    expect(result).toHaveLength(1);
    expect(result[0]!.changeType).toBe('renamed_local');
    expect(result[0]!.key).toBe('Page/NewInput');
    expect(result[0]!.base).toBe(base);
    expect(result[0]!.local).toBe(renamed);
  });

  it('should NOT detect rename when structures are different', () => {
    const base = makeComponent({
      name: 'Button',
      path: 'Page/Button',
      variants: [{ name: 'Type=Primary', nodeId: '1:2', properties: { Type: 'Primary' } }],
    });
    const newComp = makeComponent({
      name: 'Card',
      path: 'Page/Card',
      nodeId: '5:1',
      variants: [
        { name: 'Size=Small', nodeId: '5:2', properties: { Size: 'Small' } },
        { name: 'Size=Large', nodeId: '5:3', properties: { Size: 'Large' } },
      ],
      properties: [
        { name: 'title', type: 'TEXT', defaultValue: 'Title' },
        { name: 'subtitle', type: 'TEXT', defaultValue: '' },
      ],
      strippedNode: { type: 'COMPONENT_SET', children: [{ type: 'RECTANGLE' }] },
    });

    const entries: DiffEntry<NormalizedComponent>[] = [
      {
        key: 'Page/Button',
        changeType: 'deleted_upstream',
        base,
        upstream: undefined,
        local: base,
        details: [],
      },
      {
        key: 'Page/Card',
        changeType: 'new_upstream',
        base: undefined,
        upstream: newComp,
        local: undefined,
        details: [],
      },
    ];

    const result = detectRenames(entries, { similarity: componentSimilarity });

    // Should remain as separate delete+add, not merged
    expect(result).toHaveLength(2);
    expect(result.find(e => e.changeType === 'deleted_upstream')).toBeDefined();
    expect(result.find(e => e.changeType === 'new_upstream')).toBeDefined();
  });

  it('should leave non-delete/add entries untouched', () => {
    const comp = makeComponent();
    const entries: DiffEntry<NormalizedComponent>[] = [
      { key: 'A', changeType: 'upstream_changed', base: comp, upstream: comp, local: comp, details: [] },
      { key: 'B', changeType: 'conflict', base: comp, upstream: comp, local: comp, details: [] },
    ];

    const result = detectRenames(entries, { similarity: componentSimilarity });

    expect(result).toHaveLength(2);
    expect(result[0]!.changeType).toBe('upstream_changed');
    expect(result[1]!.changeType).toBe('conflict');
  });

  it('should handle empty entries', () => {
    const result = detectRenames([], { similarity: componentSimilarity });
    expect(result).toHaveLength(0);
  });

  it('should handle custom threshold', () => {
    const base = makeComponent({ name: 'A', path: 'Page/A' });
    const newComp = makeComponent({
      name: 'B',
      path: 'Page/B',
      nodeId: '9:1',
      // Same variants and properties, different strippedNode
      strippedNode: { type: 'COMPONENT_SET', children: [{ type: 'FRAME' }] },
    });

    const entries: DiffEntry<NormalizedComponent>[] = [
      { key: 'Page/A', changeType: 'deleted_upstream', base, upstream: undefined, local: base, details: [] },
      { key: 'Page/B', changeType: 'new_upstream', base: undefined, upstream: newComp, local: undefined, details: [] },
    ];

    // With very high threshold — should NOT match
    const strict = detectRenames(entries, { similarity: componentSimilarity, threshold: 1.0 });
    expect(strict).toHaveLength(2);

    // With lower threshold — should match (variants + properties match)
    const relaxed = detectRenames(entries, { similarity: componentSimilarity, threshold: 0.5 });
    expect(relaxed).toHaveLength(1);
    expect(relaxed[0]!.changeType).toBe('renamed_upstream');
  });

  it('should pick best match when multiple candidates exist', () => {
    const compA = makeComponent({
      name: 'A',
      path: 'Page/A',
      variants: [{ name: 'V1', nodeId: '1:1', properties: { V: '1' } }],
    });
    const compB = makeComponent({
      name: 'B',
      path: 'Page/B',
      nodeId: '2:1',
      // Identical structure to A
      variants: [{ name: 'V1', nodeId: '2:2', properties: { V: '1' } }],
    });
    const compC = makeComponent({
      name: 'C',
      path: 'Page/C',
      nodeId: '3:1',
      // Very different structure
      variants: [
        { name: 'X=1', nodeId: '3:2', properties: { X: '1' } },
        { name: 'X=2', nodeId: '3:3', properties: { X: '2' } },
      ],
      properties: [{ name: 'foo', type: 'TEXT', defaultValue: '' }, { name: 'bar', type: 'BOOLEAN', defaultValue: true }],
      strippedNode: { type: 'DIFFERENT' },
    });

    const entries: DiffEntry<NormalizedComponent>[] = [
      { key: 'Page/A', changeType: 'deleted_upstream', base: compA, upstream: undefined, local: compA, details: [] },
      { key: 'Page/B', changeType: 'new_upstream', base: undefined, upstream: compB, local: undefined, details: [] },
      { key: 'Page/C', changeType: 'new_upstream', base: undefined, upstream: compC, local: undefined, details: [] },
    ];

    const result = detectRenames(entries, { similarity: componentSimilarity });

    // A should match B (high similarity), C remains as new_upstream
    const rename = result.find(e => e.changeType === 'renamed_upstream');
    expect(rename).toBeDefined();
    expect(rename!.key).toBe('Page/B');

    const remaining = result.find(e => e.changeType === 'new_upstream');
    expect(remaining).toBeDefined();
    expect(remaining!.key).toBe('Page/C');
  });
});

// ── Component similarity function ──────────────────────────────────

describe('componentSimilarity', () => {
  it('should return 1 for identical components (ignoring name)', () => {
    const a = makeComponent({ name: 'A' });
    const b = makeComponent({ name: 'B' });
    expect(componentSimilarity(a, b)).toBe(1);
  });

  it('should return 0 for completely different components', () => {
    const a = makeComponent({
      variants: [{ name: 'V1', nodeId: '1:1', properties: { V: '1' } }],
      properties: [{ name: 'x', type: 'TEXT', defaultValue: '' }],
      strippedNode: { type: 'A' },
    });
    const b = makeComponent({
      variants: [{ name: 'V2', nodeId: '2:1', properties: { V: '2' } }],
      properties: [{ name: 'y', type: 'BOOLEAN', defaultValue: true }],
      strippedNode: { type: 'B' },
    });
    expect(componentSimilarity(a, b)).toBeLessThan(0.3);
  });

  it('should return high score for partially matching structure', () => {
    const a = makeComponent({
      variants: [
        { name: 'Type=Primary', nodeId: '1:1', properties: { Type: 'Primary' } },
        { name: 'Type=Secondary', nodeId: '1:2', properties: { Type: 'Secondary' } },
      ],
    });
    const b = makeComponent({
      variants: [
        { name: 'Type=Primary', nodeId: '2:1', properties: { Type: 'Primary' } },
        { name: 'Type=Tertiary', nodeId: '2:2', properties: { Type: 'Tertiary' } },
      ],
    });
    const score = componentSimilarity(a, b);
    expect(score).toBeGreaterThan(0.5);
    expect(score).toBeLessThan(1);
  });
});

// ── Style similarity function ──────────────────────────────────────

describe('styleSimilarity', () => {
  it('should return 0 for different style types', () => {
    const fill: NormalizedStyle = {
      name: 'A', type: 'FILL', fills: [{ type: 'SOLID', hex: '#FF0000', opacity: 1 }],
    };
    const text: NormalizedStyle = {
      name: 'B', type: 'TEXT', fontFamily: 'Arial', fontSize: 16,
      fontWeight: 400, lineHeightPx: 24, lineHeightPercent: 150,
      letterSpacing: 0, textCase: 'ORIGINAL', textDecoration: 'NONE',
    };
    expect(styleSimilarity(fill, text)).toBe(0);
  });

  it('should return 1 for identical fills with different names', () => {
    const a: NormalizedStyle = {
      name: 'Primary', type: 'FILL', fills: [{ type: 'SOLID', hex: '#3B82F6', opacity: 1 }],
    };
    const b: NormalizedStyle = {
      name: 'Brand Blue', type: 'FILL', fills: [{ type: 'SOLID', hex: '#3B82F6', opacity: 1 }],
    };
    expect(styleSimilarity(a, b)).toBe(1);
  });

  it('should return 0 for different fills', () => {
    const a: NormalizedStyle = {
      name: 'A', type: 'FILL', fills: [{ type: 'SOLID', hex: '#FF0000', opacity: 1 }],
    };
    const b: NormalizedStyle = {
      name: 'B', type: 'FILL', fills: [{ type: 'SOLID', hex: '#00FF00', opacity: 1 }],
    };
    expect(styleSimilarity(a, b)).toBe(0);
  });

  it('should return partial score for text styles with some matching fields', () => {
    const a: NormalizedStyle = {
      name: 'A', type: 'TEXT', fontFamily: 'Inter', fontSize: 16,
      fontWeight: 400, lineHeightPx: 24, lineHeightPercent: 150,
      letterSpacing: 0, textCase: 'ORIGINAL', textDecoration: 'NONE',
    };
    const b: NormalizedStyle = {
      name: 'B', type: 'TEXT', fontFamily: 'Inter', fontSize: 18,
      fontWeight: 400, lineHeightPx: 28, lineHeightPercent: 150,
      letterSpacing: 0, textCase: 'ORIGINAL', textDecoration: 'NONE',
    };
    const score = styleSimilarity(a, b);
    expect(score).toBe(0.5); // fontFamily + fontWeight match, fontSize + lineHeight don't
  });
});
