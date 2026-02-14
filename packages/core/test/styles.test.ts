import { describe, it, expect } from 'vitest';
import {
  extractStyleMetadata,
  enrichStylesWithNodeData,
  normalizeStyles,
} from '../src/normalize/styles.js';
import type { GetFileResponse, GetFileNodesResponse } from '../src/figma/types.js';

function makeFileWithStyles(): GetFileResponse {
  return {
    name: 'Test',
    version: '1',
    document: { id: '0:0', name: 'Document', type: 'DOCUMENT' },
    components: {},
    styles: {
      '2:1': {
        key: 's1',
        name: 'Primary/500',
        description: 'Primary color',
        styleType: 'FILL',
      },
      '2:2': {
        key: 's2',
        name: 'Heading/H1',
        description: 'Main heading',
        styleType: 'TEXT',
      },
      '2:3': {
        key: 's3',
        name: 'Shadow/Soft',
        description: 'Soft shadow',
        styleType: 'EFFECT',
      },
      '2:4': {
        key: 's4',
        name: 'Grid/12col',
        description: '12 column grid',
        styleType: 'GRID',
      },
    },
  };
}

function makeNodesResponse(): GetFileNodesResponse {
  return {
    name: 'Test',
    nodes: {
      '2:1': {
        document: {
          id: '2:1',
          name: 'Primary/500',
          type: 'RECTANGLE',
          fills: [
            {
              type: 'SOLID',
              color: { r: 0.39, g: 0.35, b: 0.92, a: 1 },
              visible: true,
            },
          ],
        },
      },
      '2:2': {
        document: {
          id: '2:2',
          name: 'Heading/H1',
          type: 'TEXT',
          style: {
            fontFamily: 'Roboto',
            fontSize: 32,
            fontWeight: 700,
            lineHeightPx: 40,
            letterSpacing: 0.5,
          },
        },
      },
      '2:3': {
        document: {
          id: '2:3',
          name: 'Shadow/Soft',
          type: 'RECTANGLE',
          effects: [
            {
              type: 'DROP_SHADOW',
              visible: true,
              radius: 8,
              spread: 0,
              color: { r: 0, g: 0, b: 0, a: 0.15 },
              offset: { x: 0, y: 4 },
            },
          ],
        },
      },
    },
  };
}

describe('extractStyleMetadata', () => {
  it('extracts all styles with correct types', () => {
    const file = makeFileWithStyles();
    const { styles, nodeIdsToFetch } = extractStyleMetadata(file);

    expect(styles.size).toBe(4);
    expect(styles.get('Primary/500')!.type).toBe('FILL');
    expect(styles.get('Heading/H1')!.type).toBe('TEXT');
    expect(styles.get('Shadow/Soft')!.type).toBe('EFFECT');
    expect(styles.get('Grid/12col')!.type).toBe('GRID');

    // GRID styles don't need node fetching
    expect(nodeIdsToFetch).toHaveLength(3);
    expect(nodeIdsToFetch).toContain('2:1');
    expect(nodeIdsToFetch).toContain('2:2');
    expect(nodeIdsToFetch).toContain('2:3');
    expect(nodeIdsToFetch).not.toContain('2:4');
  });
});

describe('enrichStylesWithNodeData', () => {
  it('enriches FILL styles with color values', () => {
    const file = makeFileWithStyles();
    const { styles } = extractStyleMetadata(file);
    enrichStylesWithNodeData(styles, makeNodesResponse());

    const fill = styles.get('Primary/500')!;
    expect(fill.type).toBe('FILL');
    if (fill.type === 'FILL') {
      expect(fill.fills).toHaveLength(1);
      expect(fill.fills[0]!.hex).toBe('#6359eb');
      expect(fill.fills[0]!.rgba).toEqual({ r: 0.39, g: 0.35, b: 0.92, a: 1 });
    }
  });

  it('enriches TEXT styles with typography values', () => {
    const file = makeFileWithStyles();
    const { styles } = extractStyleMetadata(file);
    enrichStylesWithNodeData(styles, makeNodesResponse());

    const text = styles.get('Heading/H1')!;
    expect(text.type).toBe('TEXT');
    if (text.type === 'TEXT') {
      expect(text.fontFamily).toBe('Roboto');
      expect(text.fontSize).toBe(32);
      expect(text.fontWeight).toBe(700);
      expect(text.lineHeightPx).toBe(40);
      expect(text.letterSpacing).toBe(0.5);
    }
  });

  it('enriches EFFECT styles with shadow values', () => {
    const file = makeFileWithStyles();
    const { styles } = extractStyleMetadata(file);
    enrichStylesWithNodeData(styles, makeNodesResponse());

    const effect = styles.get('Shadow/Soft')!;
    expect(effect.type).toBe('EFFECT');
    if (effect.type === 'EFFECT') {
      expect(effect.effects).toHaveLength(1);
      expect(effect.effects[0]!.type).toBe('DROP_SHADOW');
      expect(effect.effects[0]!.radius).toBe(8);
      expect(effect.effects[0]!.offset).toEqual({ x: 0, y: 4 });
      expect(effect.effects[0]!.color).toBe('#00000026');
    }
  });

  it('handles missing node data gracefully', () => {
    const file = makeFileWithStyles();
    const { styles } = extractStyleMetadata(file);
    enrichStylesWithNodeData(styles, { name: 'Test', nodes: {} });

    // Styles should still exist but without enriched data
    const fill = styles.get('Primary/500')!;
    if (fill.type === 'FILL') {
      expect(fill.fills).toHaveLength(0);
    }
  });
});

describe('normalizeStyles', () => {
  it('combines extraction and enrichment', () => {
    const file = makeFileWithStyles();
    const styles = normalizeStyles(file, makeNodesResponse());

    expect(styles.size).toBe(4);
    const fill = styles.get('Primary/500')!;
    if (fill.type === 'FILL') {
      expect(fill.fills).toHaveLength(1);
    }
  });

  it('works without node data (metadata only)', () => {
    const file = makeFileWithStyles();
    const styles = normalizeStyles(file);

    expect(styles.size).toBe(4);
    const fill = styles.get('Primary/500')!;
    if (fill.type === 'FILL') {
      expect(fill.fills).toHaveLength(0);
    }
  });

  it('handles empty styles', () => {
    const file: GetFileResponse = {
      name: 'Test',
      version: '1',
      document: { id: '0:0', name: 'Document', type: 'DOCUMENT' },
      components: {},
      styles: {},
    };

    const styles = normalizeStyles(file);
    expect(styles.size).toBe(0);
  });
});
