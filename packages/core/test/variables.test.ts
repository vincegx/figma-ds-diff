import { describe, it, expect } from 'vitest';
import { normalizeVariables } from '../src/normalize/variables.js';

describe('normalizeVariables', () => {
  // ── W3C DTCG (Tokens Studio) format ─────────────────────────────────

  describe('DTCG format', () => {
    it('normalizes flat DTCG tokens', () => {
      const data = {
        'primary': { $type: 'color', $value: '#6459ea' },
        'font-size-sm': { $type: 'dimension', $value: '14px' },
      };

      const result = normalizeVariables(data);
      expect(result.size).toBe(2);

      const primary = result.get('tokens/primary')!;
      expect(primary.collection).toBe('tokens');
      expect(primary.name).toBe('primary');
      expect(primary.type).toBe('color');
      expect(primary.valuesByMode).toEqual({ default: '#6459ea' });
    });

    it('normalizes nested DTCG tokens', () => {
      const data = {
        color: {
          primary: {
            '500': { $type: 'color', $value: '#6459ea' },
            '600': { $type: 'color', $value: '#5043d1' },
          },
          neutral: {
            '100': { $type: 'color', $value: '#f5f5f5' },
          },
        },
      };

      const result = normalizeVariables(data);
      expect(result.size).toBe(3);
      expect(result.has('tokens/color/primary/500')).toBe(true);
      expect(result.has('tokens/color/primary/600')).toBe(true);
      expect(result.has('tokens/color/neutral/100')).toBe(true);

      const token = result.get('tokens/color/primary/500')!;
      expect(token.type).toBe('color');
      expect(token.valuesByMode).toEqual({ default: '#6459ea' });
    });

    it('skips $ prefixed group keys', () => {
      const data = {
        $description: 'Design tokens',
        color: {
          $type: 'color',
          primary: { $value: '#6459ea' },
        },
      };

      const result = normalizeVariables(data);
      expect(result.size).toBe(1);
      expect(result.has('tokens/color/primary')).toBe(true);
    });
  });

  // ── Figma native export format ──────────────────────────────────────

  describe('Figma native format', () => {
    it('normalizes collections with modes', () => {
      const data = {
        collections: [
          {
            name: 'Colors',
            modes: [
              { name: 'Light', modeId: 'm1' },
              { name: 'Dark', modeId: 'm2' },
            ],
            variables: [
              {
                name: 'bg-primary',
                type: 'COLOR',
                valuesByMode: {
                  m1: '#ffffff',
                  m2: '#1a1a1a',
                },
              },
              {
                name: 'text-primary',
                type: 'COLOR',
                valuesByMode: {
                  m1: '#000000',
                  m2: '#ffffff',
                },
              },
            ],
          },
        ],
      };

      const result = normalizeVariables(data);
      expect(result.size).toBe(2);

      const bg = result.get('Colors/bg-primary')!;
      expect(bg.collection).toBe('Colors');
      expect(bg.name).toBe('bg-primary');
      expect(bg.type).toBe('COLOR');
      expect(bg.valuesByMode).toEqual({
        Light: '#ffffff',
        Dark: '#1a1a1a',
      });
    });

    it('handles multiple collections', () => {
      const data = {
        collections: [
          {
            name: 'Colors',
            modes: [{ name: 'Default', modeId: 'm1' }],
            variables: [
              { name: 'primary', type: 'COLOR', valuesByMode: { m1: '#ff0000' } },
            ],
          },
          {
            name: 'Spacing',
            modes: [{ name: 'Default', modeId: 'm1' }],
            variables: [
              { name: 'sm', type: 'FLOAT', valuesByMode: { m1: 8 } },
            ],
          },
        ],
      };

      const result = normalizeVariables(data);
      expect(result.size).toBe(2);
      expect(result.has('Colors/primary')).toBe(true);
      expect(result.has('Spacing/sm')).toBe(true);
    });
  });

  // ── Flat typed format ───────────────────────────────────────────────

  describe('Flat typed format', () => {
    it('normalizes key-value pairs with type and value', () => {
      const data = {
        'colors/primary': { type: 'color', value: '#6459ea' },
        'spacing/sm': { type: 'dimension', value: '8px' },
      };

      const result = normalizeVariables(data);
      expect(result.size).toBe(2);

      const primary = result.get('colors/primary')!;
      expect(primary.collection).toBe('colors');
      expect(primary.name).toBe('primary');
      expect(primary.type).toBe('color');
      expect(primary.valuesByMode).toEqual({ default: '#6459ea' });
    });

    it('uses "default" collection when no slash in key', () => {
      const data = {
        primary: { type: 'color', value: '#6459ea' },
      };

      const result = normalizeVariables(data);
      const primary = result.get('default/primary')!;
      expect(primary.collection).toBe('default');
    });
  });

  // ── Flat simple format ──────────────────────────────────────────────

  describe('Flat simple format', () => {
    it('normalizes plain key-value pairs', () => {
      const data = {
        'colors/primary': '#6459ea',
        'spacing/sm': 8,
        'font/enabled': true,
      };

      const result = normalizeVariables(data);
      expect(result.size).toBe(3);

      const primary = result.get('colors/primary')!;
      expect(primary.type).toBe('color');
      expect(primary.valuesByMode).toEqual({ default: '#6459ea' });

      const spacing = result.get('spacing/sm')!;
      expect(spacing.type).toBe('number');

      const font = result.get('font/enabled')!;
      expect(font.type).toBe('boolean');
    });

    it('infers color type from hex strings', () => {
      const data = { 'c/bg': '#fff' };
      const result = normalizeVariables(data);
      expect(result.get('c/bg')!.type).toBe('color');
    });

    it('infers dimension type from px/rem values', () => {
      const data = { 's/gap': '16px' };
      const result = normalizeVariables(data);
      expect(result.get('s/gap')!.type).toBe('dimension');
    });
  });

  // ── Edge cases ──────────────────────────────────────────────────────

  it('handles empty input', () => {
    const result = normalizeVariables({});
    expect(result.size).toBe(0);
  });

  it('produces deterministic output (same input = same result)', () => {
    const data = {
      color: {
        primary: { $type: 'color', $value: '#6459ea' },
        secondary: { $type: 'color', $value: '#ff6b6b' },
      },
    };

    const r1 = normalizeVariables(data);
    const r2 = normalizeVariables(data);

    expect([...r1.entries()]).toEqual([...r2.entries()]);
  });
});
