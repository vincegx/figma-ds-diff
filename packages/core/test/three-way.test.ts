import { describe, it, expect } from 'vitest';
import { threeWayDiff } from '../src/diff/three-way.js';

describe('threeWayDiff', () => {
  // ── Attribution tests (per spec table) ──────────────────────────────

  it('skips unchanged items', () => {
    const base = new Map([['a', 1], ['b', 2]]);
    const upstream = new Map([['a', 1], ['b', 2]]);
    const local = new Map([['a', 1], ['b', 2]]);

    const result = threeWayDiff(base, upstream, local);
    expect(result).toHaveLength(0);
  });

  it('detects upstream_changed', () => {
    const base = new Map([['a', 1]]);
    const upstream = new Map([['a', 99]]);
    const local = new Map([['a', 1]]);

    const result = threeWayDiff(base, upstream, local);
    expect(result).toHaveLength(1);
    expect(result[0]!.changeType).toBe('upstream_changed');
    expect(result[0]!.base).toBe(1);
    expect(result[0]!.upstream).toBe(99);
    expect(result[0]!.local).toBe(1);
  });

  it('detects local_changed', () => {
    const base = new Map([['a', 1]]);
    const upstream = new Map([['a', 1]]);
    const local = new Map([['a', 99]]);

    const result = threeWayDiff(base, upstream, local);
    expect(result).toHaveLength(1);
    expect(result[0]!.changeType).toBe('local_changed');
  });

  it('detects conflict (both changed differently)', () => {
    const base = new Map([['a', 1]]);
    const upstream = new Map([['a', 50]]);
    const local = new Map([['a', 99]]);

    const result = threeWayDiff(base, upstream, local);
    expect(result).toHaveLength(1);
    expect(result[0]!.changeType).toBe('conflict');
  });

  it('detects new_upstream', () => {
    const base = new Map<string, number>();
    const upstream = new Map([['a', 1]]);
    const local = new Map<string, number>();

    const result = threeWayDiff(base, upstream, local);
    expect(result).toHaveLength(1);
    expect(result[0]!.changeType).toBe('new_upstream');
  });

  it('detects new_local', () => {
    const base = new Map<string, number>();
    const upstream = new Map<string, number>();
    const local = new Map([['a', 1]]);

    const result = threeWayDiff(base, upstream, local);
    expect(result).toHaveLength(1);
    expect(result[0]!.changeType).toBe('new_local');
  });

  it('detects deleted_upstream', () => {
    const base = new Map([['a', 1]]);
    const upstream = new Map<string, number>();
    const local = new Map([['a', 1]]);

    const result = threeWayDiff(base, upstream, local);
    expect(result).toHaveLength(1);
    expect(result[0]!.changeType).toBe('deleted_upstream');
  });

  it('detects deleted_local', () => {
    const base = new Map([['a', 1]]);
    const upstream = new Map([['a', 1]]);
    const local = new Map<string, number>();

    const result = threeWayDiff(base, upstream, local);
    expect(result).toHaveLength(1);
    expect(result[0]!.changeType).toBe('deleted_local');
  });

  it('treats identical additions as new_upstream (harmless duplicate)', () => {
    const base = new Map<string, number>();
    const upstream = new Map([['a', 1]]);
    const local = new Map([['a', 1]]);

    const result = threeWayDiff(base, upstream, local);
    expect(result).toHaveLength(1);
    expect(result[0]!.changeType).toBe('new_upstream');
  });

  it('treats different additions as conflict', () => {
    const base = new Map<string, number>();
    const upstream = new Map([['a', 1]]);
    const local = new Map([['a', 2]]);

    const result = threeWayDiff(base, upstream, local);
    expect(result).toHaveLength(1);
    expect(result[0]!.changeType).toBe('conflict');
  });

  it('skips items deleted from both', () => {
    const base = new Map([['a', 1]]);
    const upstream = new Map<string, number>();
    const local = new Map<string, number>();

    const result = threeWayDiff(base, upstream, local);
    expect(result).toHaveLength(0);
  });

  // ── Complex scenarios ───────────────────────────────────────────────

  it('handles mixed changes across multiple keys', () => {
    const base = new Map([
      ['unchanged', 1],
      ['up-change', 2],
      ['loc-change', 3],
      ['conflict', 4],
      ['del-up', 5],
      ['del-loc', 6],
    ]);
    const upstream = new Map([
      ['unchanged', 1],
      ['up-change', 20],
      ['loc-change', 3],
      ['conflict', 40],
      // del-up removed
      ['del-loc', 6],
      ['new-up', 7],
    ]);
    const local = new Map([
      ['unchanged', 1],
      ['up-change', 2],
      ['loc-change', 30],
      ['conflict', 44],
      ['del-up', 5],
      // del-loc removed
      ['new-loc', 8],
    ]);

    const result = threeWayDiff(base, upstream, local);
    const types = new Map(result.map((r) => [r.key, r.changeType]));

    expect(types.get('up-change')).toBe('upstream_changed');
    expect(types.get('loc-change')).toBe('local_changed');
    expect(types.get('conflict')).toBe('conflict');
    expect(types.get('del-up')).toBe('deleted_upstream');
    expect(types.get('del-loc')).toBe('deleted_local');
    expect(types.get('new-up')).toBe('new_upstream');
    expect(types.get('new-loc')).toBe('new_local');
    expect(types.has('unchanged')).toBe(false);
  });

  it('sorts results by key', () => {
    const base = new Map<string, number>();
    const upstream = new Map([['c', 1], ['a', 2], ['b', 3]]);
    const local = new Map<string, number>();

    const result = threeWayDiff(base, upstream, local);
    const keys = result.map((r) => r.key);
    expect(keys).toEqual(['a', 'b', 'c']);
  });

  // ── Custom comparison ───────────────────────────────────────────────

  it('uses custom isEqual function', () => {
    const base = new Map([['a', { x: 1, noise: 'foo' }]]);
    const upstream = new Map([['a', { x: 1, noise: 'bar' }]]);
    const local = new Map([['a', { x: 1, noise: 'baz' }]]);

    // Ignore the 'noise' field
    const result = threeWayDiff(base, upstream, local, {
      isEqual: (a, b) => a.x === b.x,
    });
    expect(result).toHaveLength(0); // considered unchanged
  });

  it('uses custom describeChanges', () => {
    const base = new Map([['a', 1]]);
    const upstream = new Map([['a', 2]]);
    const local = new Map([['a', 1]]);

    const result = threeWayDiff(base, upstream, local, {
      describeChanges: (_key, base, upstream) => [
        `value changed from ${base} to ${upstream}`,
      ],
    });
    expect(result[0]!.details).toEqual(['value changed from 1 to 2']);
  });

  // ── Object deep equality ────────────────────────────────────────────

  it('uses JSON.stringify for deep object equality by default', () => {
    const base = new Map([['a', { x: 1, y: [2, 3] }]]);
    const upstream = new Map([['a', { x: 1, y: [2, 3] }]]);
    const local = new Map([['a', { x: 1, y: [2, 3] }]]);

    const result = threeWayDiff(base, upstream, local);
    expect(result).toHaveLength(0);
  });

  it('detects deep object changes', () => {
    const base = new Map([['a', { x: 1, y: [2, 3] }]]);
    const upstream = new Map([['a', { x: 1, y: [2, 4] }]]);
    const local = new Map([['a', { x: 1, y: [2, 3] }]]);

    const result = threeWayDiff(base, upstream, local);
    expect(result).toHaveLength(1);
    expect(result[0]!.changeType).toBe('upstream_changed');
  });
});
