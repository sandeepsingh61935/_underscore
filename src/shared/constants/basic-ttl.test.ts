import { describe, expect, it } from 'vitest';

import {
  BASIC_TTL_DEFAULT,
  basicTtlConfigToMs,
  formatBasicTtlConfig,
  isBasicTtlConfig,
  parseBasicTtlStorage,
  validateCustomTtl,
} from '@/shared/constants/basic-ttl';

describe('basic-ttl config', () => {
  it('parses legacy string presets', () => {
    expect(parseBasicTtlStorage('24h')).toEqual({ kind: 'preset', preset: '24h' });
    expect(parseBasicTtlStorage('forever')).toEqual({ kind: 'forever' });
  });

  it('parses custom config objects', () => {
    const config = { kind: 'custom' as const, amount: 30, unit: 'minutes' as const };
    expect(parseBasicTtlStorage(config)).toEqual(config);
    expect(isBasicTtlConfig(config)).toBe(true);
  });

  it('converts config to milliseconds', () => {
    expect(basicTtlConfigToMs({ kind: 'forever' })).toBeNull();
    expect(basicTtlConfigToMs({ kind: 'custom', amount: 2, unit: 'hours' })).toBe(7_200_000);
  });

  it('formats config for display', () => {
    expect(formatBasicTtlConfig(BASIC_TTL_DEFAULT)).toBe('24 hours');
    expect(formatBasicTtlConfig({ kind: 'custom', amount: 1, unit: 'days' })).toBe('1 day');
    expect(formatBasicTtlConfig({ kind: 'custom', amount: 3, unit: 'hours' })).toBe('3 hours');
  });

  it('validates custom TTL bounds', () => {
    expect(validateCustomTtl(0, 'minutes').valid).toBe(false);
    expect(validateCustomTtl(45, 'minutes').valid).toBe(true);
    expect(validateCustomTtl(4000, 'days').valid).toBe(false);
  });
});
