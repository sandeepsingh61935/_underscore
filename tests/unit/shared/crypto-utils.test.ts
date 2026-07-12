import { describe, it, expect } from 'vitest';
import { hashDomain } from '@/shared/utils/crypto-utils';

describe('crypto-utils', () => {
  describe('hashDomain', () => {
    it('returns deterministic SHA-256 hex for the same domain', async () => {
      const hash1 = await hashDomain('example.com');
      const hash2 = await hashDomain('example.com');
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[0-9a-f]{64}$/);
    });

    it('returns different hashes for different domains', async () => {
      const hash1 = await hashDomain('example.com');
      const hash2 = await hashDomain('test.com');
      expect(hash1).not.toBe(hash2);
    });
  });
});
