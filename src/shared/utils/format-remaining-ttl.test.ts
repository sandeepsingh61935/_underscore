import { describe, expect, it } from 'vitest';

import {
  ONE_DAY_MS,
  ONE_HOUR_MS,
  formatRemainingTtl,
  formatRemainingTtlCompact,
  usesClockTtlFormat,
} from './format-remaining-ttl';

describe('usesClockTtlFormat', () => {
  it('returns true under 24 hours', () => {
    expect(usesClockTtlFormat(ONE_HOUR_MS)).toBe(true);
    expect(usesClockTtlFormat(ONE_DAY_MS - 1)).toBe(true);
  });

  it('returns false at or above 24 hours', () => {
    expect(usesClockTtlFormat(ONE_DAY_MS)).toBe(false);
    expect(usesClockTtlFormat(2 * ONE_DAY_MS)).toBe(false);
  });
});

describe('formatRemainingTtl', () => {
  it('shows clock format under one day', () => {
    expect(formatRemainingTtl(2 * ONE_HOUR_MS + 5 * 60_000 + 3_000)).toBe('02:05:03');
  });

  it('shows days when between one day and one month', () => {
    expect(formatRemainingTtl(3 * ONE_DAY_MS)).toBe('3 days');
    expect(formatRemainingTtl(ONE_DAY_MS)).toBe('1 day');
  });

  it('shows months when between one month and one year', () => {
    expect(formatRemainingTtl(45 * ONE_DAY_MS)).toBe('1 month 15d');
    expect(formatRemainingTtl(60 * ONE_DAY_MS)).toBe('2 months');
  });

  it('shows years when above one year', () => {
    expect(formatRemainingTtl(365 * ONE_DAY_MS)).toBe('1 year');
    expect(formatRemainingTtl(730 * ONE_DAY_MS)).toBe('2 years');
    expect(formatRemainingTtl(800 * ONE_DAY_MS)).toBe('2 years 2 months');
  });

  it('returns Expired for non-positive values', () => {
    expect(formatRemainingTtl(0)).toBe('Expired');
    expect(formatRemainingTtl(-100)).toBe('Expired');
  });
});

describe('formatRemainingTtlCompact', () => {
  it('uses h/m under one day', () => {
    expect(formatRemainingTtlCompact(90 * 60_000)).toBe('1h 30m');
    expect(formatRemainingTtlCompact(45 * 60_000)).toBe('45m');
  });

  it('uses d/mo/y above one day', () => {
    expect(formatRemainingTtlCompact(5 * ONE_DAY_MS)).toBe('5d');
    expect(formatRemainingTtlCompact(60 * ONE_DAY_MS)).toBe('2mo');
    expect(formatRemainingTtlCompact(400 * ONE_DAY_MS)).toBe('1y');
  });
});
