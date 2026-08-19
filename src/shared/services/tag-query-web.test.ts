import { describe, expect, it } from 'vitest';

import { toTagError } from './tag-query-web';

describe('toTagError', () => {
  it('passes through Error instances', () => {
    const err = new Error('boom');
    expect(toTagError(err)).toBe(err);
  });

  it('formats PostgREST-shaped plain objects (not instanceof Error)', () => {
    const err = toTagError({
      message: 'permission denied for table tags',
      code: '42501',
      details: null,
    });
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toContain('permission denied for table tags');
    expect(err.message).toContain('42501');
  });

  it('uses fallback for empty unknowns', () => {
    expect(toTagError(null, 'Failed to save tags').message).toBe('Failed to save tags');
  });
});
