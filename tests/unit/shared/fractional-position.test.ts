import { describe, expect, it } from 'vitest';

import { positionBetween } from '@/shared/utils/fractional-position';

function isOrdered(keys: string[]): boolean {
  for (let i = 1; i < keys.length; i++) {
    if (!(keys[i - 1]! < keys[i]!)) return false;
  }
  return true;
}

describe('positionBetween', () => {
  it('generates a first key with no bounds', () => {
    const key = positionBetween();
    expect(typeof key).toBe('string');
    expect(key.length).toBeGreaterThan(0);
  });

  it('appends after a lower bound and prepends before an upper bound', () => {
    const first = positionBetween();
    const after = positionBetween(first);
    const before = positionBetween(undefined, first);
    expect(first < after).toBe(true);
    expect(before < first).toBe(true);
  });

  it('generates a key strictly between two bounds', () => {
    const a = positionBetween();
    const b = positionBetween(a);
    const mid = positionBetween(a, b);
    expect(a < mid && mid < b).toBe(true);
  });

  it('rejects inverted or equal bounds', () => {
    const a = positionBetween();
    const b = positionBetween(a);
    expect(() => positionBetween(b, a)).toThrow();
    expect(() => positionBetween(a, a)).toThrow();
  });

  it('keeps 1,000 repeated mid-inserts ordered and unique', () => {
    const keys: string[] = [positionBetween(), positionBetween(positionBetween())];
    keys.sort();
    for (let i = 0; i < 1000; i++) {
      const mid = positionBetween(keys[0], keys[1]);
      expect(keys[0]! < mid && mid < keys[1]!).toBe(true);
      keys.splice(1, 0, mid);
    }
    expect(keys).toHaveLength(1002);
    expect(new Set(keys).size).toBe(keys.length);
    expect(isOrdered(keys)).toBe(true);
  });

  it('keeps 1,000 appends ordered and unique', () => {
    const keys: string[] = [positionBetween()];
    for (let i = 0; i < 1000; i++) {
      keys.push(positionBetween(keys[keys.length - 1]));
    }
    expect(new Set(keys).size).toBe(keys.length);
    expect(isOrdered(keys)).toBe(true);
  });
});
