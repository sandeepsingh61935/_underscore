/**
 * @file fractional-position.ts
 * @description Fractional ordering keys for Page Groups (ADR-032 §8).
 *
 * Generates lexicographically sortable position strings so groups and items
 * can be reordered without rewriting sibling rows. Room always remains on
 * both sides of a generated key for keys produced by this module.
 */

const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const BASE = DIGITS.length;
const MID_INDEX = Math.floor(BASE / 2);

function digitValue(ch: string): number {
  const value = DIGITS.indexOf(ch);
  if (value < 0) {
    throw new Error(`fractional-position: invalid character ${JSON.stringify(ch)}`);
  }
  return value;
}

function validateKey(key: string): void {
  for (const ch of key) digitValue(ch);
}

/**
 * Core midpoint generator. `null` means unbounded (-inf / +inf).
 * Exhausted lower bounds behave as -inf at that level; an exhausted upper
 * bound means the caller holds exactly the prefix (handled by validation).
 */
function gen(lo: string | null, hi: string | null): string {
  const a = lo ?? '';
  const b = hi ?? '';
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  const prefix = a.slice(0, i);
  const loHas = lo !== null && i < lo.length;
  const hiHas = hi !== null && i < hi.length;

  if (!hiHas && hi !== null) {
    throw new Error('fractional-position: no room between adjacent keys');
  }

  const loD = loHas ? digitValue(lo![i]!) : -1;
  const hiD = hiHas ? digitValue(hi![i]!) : BASE;

  if (!loHas && hiD <= 1) {
    // Lower side is open and the upper digit is 0/1: a terminating pick
    // would leave no room below, so descend into the upper key (or below
    // a trailing '1') to preserve room on both sides.
    const hiRest = hi!.slice(i + 1);
    if (hiRest.length > 0) {
      return prefix + hi![i]! + gen(null, hiRest);
    }
    if (hiD === 0) {
      throw new Error('fractional-position: no room between adjacent keys');
    }
    return `${prefix}0${DIGITS[MID_INDEX]!}`;
  }

  if (hiD - loD > 1) {
    if (!loHas) {
      return prefix + DIGITS[Math.floor(hiD / 2)]!;
    }
    return prefix + DIGITS[(loD + hiD) >> 1]!;
  }

  // Adjacent digits (equality is rejected up front): keep the lower digit
  // and extend right against +inf, which always has room.
  if (!loHas) {
    throw new Error('fractional-position: no room between adjacent keys');
  }
  return prefix + lo![i]! + gen(lo!.slice(i + 1), null);
}

/**
 * Return a position string strictly between `a` and `b`.
 * Omit `a` to append, omit `b` to prepend, omit both for the first key.
 */
export function positionBetween(a?: string | null, b?: string | null): string {
  const lo = a ?? null;
  const hi = b ?? null;
  if (lo !== null) validateKey(lo);
  if (hi !== null) validateKey(hi);
  if (lo !== null && hi !== null && lo >= hi) {
    throw new Error(`fractional-position: bounds out of order ${JSON.stringify(lo)} >= ${JSON.stringify(hi)}`);
  }
  if (lo === null && hi === null) return DIGITS[MID_INDEX]!;
  return gen(lo, hi);
}
