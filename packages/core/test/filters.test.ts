import { describe, it, expect } from 'vitest';
import {
  stripVolatileFields,
  roundColorValues,
  rgbaToHex,
} from '../src/normalize/filters.js';

describe('stripVolatileFields', () => {
  it('removes volatile keys from a flat object', () => {
    const input = {
      id: '1:2',
      name: 'Button',
      type: 'COMPONENT',
      key: 'abc123',
      absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 40 },
      fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 } }],
    };

    const result = stripVolatileFields(input);
    expect(result).toEqual({
      name: 'Button',
      type: 'COMPONENT',
      fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 } }],
    });
  });

  it('strips recursively through nested objects', () => {
    const input = {
      name: 'Frame',
      children: [
        {
          id: '2:3',
          name: 'Child',
          absoluteRenderBounds: { x: 10, y: 10 },
          fills: [],
        },
      ],
    };

    const result = stripVolatileFields(input) as Record<string, unknown>;
    const children = result['children'] as Array<Record<string, unknown>>;
    expect(children[0]).toEqual({ name: 'Child', fills: [] });
  });

  it('strips through arrays', () => {
    const input = [
      { id: '1', name: 'A' },
      { id: '2', name: 'B', key: 'xyz' },
    ];

    const result = stripVolatileFields(input);
    expect(result).toEqual([{ name: 'A' }, { name: 'B' }]);
  });

  it('handles null and primitives', () => {
    expect(stripVolatileFields(null)).toBeNull();
    expect(stripVolatileFields(undefined)).toBeUndefined();
    expect(stripVolatileFields(42)).toBe(42);
    expect(stripVolatileFields('hello')).toBe('hello');
  });

  it('removes timestamps and remote metadata', () => {
    const input = {
      name: 'Style',
      lastModified: '2024-01-01',
      created_at: '2024-01-01',
      updated_at: '2024-01-02',
      remote: true,
      file_key: 'abc',
      node_id: '1:2',
      thumbnail_url: 'https://example.com/thumb.png',
      thumbnailUrl: 'https://example.com/thumb.png',
    };

    const result = stripVolatileFields(input);
    expect(result).toEqual({ name: 'Style' });
  });
});

describe('roundColorValues', () => {
  it('rounds to 4 decimal places by default', () => {
    const result = roundColorValues({
      r: 0.39215686274509803,
      g: 0.35294117647058826,
      b: 0.9176470588235294,
      a: 1,
    });
    expect(result).toEqual({ r: 0.3922, g: 0.3529, b: 0.9176, a: 1 });
  });

  it('supports custom precision', () => {
    const result = roundColorValues({ r: 0.123456, g: 0.654321, b: 0, a: 1 }, 2);
    expect(result).toEqual({ r: 0.12, g: 0.65, b: 0, a: 1 });
  });
});

describe('rgbaToHex', () => {
  it('converts solid red', () => {
    expect(rgbaToHex({ r: 1, g: 0, b: 0, a: 1 })).toBe('#ff0000');
  });

  it('converts solid white', () => {
    expect(rgbaToHex({ r: 1, g: 1, b: 1, a: 1 })).toBe('#ffffff');
  });

  it('converts black', () => {
    expect(rgbaToHex({ r: 0, g: 0, b: 0, a: 1 })).toBe('#000000');
  });

  it('includes alpha when < 1', () => {
    expect(rgbaToHex({ r: 1, g: 0, b: 0, a: 0.5 })).toBe('#ff000080');
  });

  it('handles fractional values', () => {
    expect(rgbaToHex({ r: 0.392, g: 0.353, b: 0.918, a: 1 })).toBe('#645aea');
  });

  it('clamps out-of-range values', () => {
    expect(rgbaToHex({ r: 1.5, g: -0.1, b: 0.5, a: 1 })).toBe('#ff0080');
  });
});
