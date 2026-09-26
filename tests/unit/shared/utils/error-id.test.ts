import { describe, it, expect } from 'vitest';

import { newErrorId } from '@/shared/utils/error-id';

describe('newErrorId', () => {
  it('returns short relayable ids with the err_ prefix', () => {
    const id = newErrorId();
    expect(id).toMatch(/^err_[a-z0-9]+$/);
    expect(id.length).toBeLessThan(24);
  });

  it('is unique across calls', () => {
    expect(new Set([newErrorId(), newErrorId(), newErrorId()]).size).toBe(3);
  });
});
