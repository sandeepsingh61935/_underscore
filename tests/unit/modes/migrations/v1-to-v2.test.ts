/**
 * @file v1-to-v2.test.ts
 * @description Tests for v1→v2 state migration
 *
 * Tests migrating from v1 state ({ defaultMode }) to v2 state
 * ({ currentMode, version, metadata }).
 *
 * Follows testing-strategy-v2 Principle #6: Real, tricky test cases.
 */

import { describe, it, expect } from 'vitest';

import { migrateV1ToV2 } from '@/content/modes/migrations/v1-to-v2';

describe('v1 → v2 Migration', () => {
  describe('Valid v1 states', () => {
    it('should migrate walk mode correctly', async () => {
      const v1State = { defaultMode: 'walk' };

      const result = await migrateV1ToV2(v1State);

      expect(result.currentMode).toBe('walk');
      expect(result.version).toBe(2);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.version).toBe(2);
      expect(result.metadata.lastModified).toBeGreaterThan(0);
    });

    it('should migrate sprint mode correctly', async () => {
      const v1State = { defaultMode: 'sprint' };

      const result = await migrateV1ToV2(v1State);

      expect(result.currentMode).toBe('sprint');
      expect(result.version).toBe(2);
      expect(result.metadata).toBeDefined();
    });

    it('should migrate vault mode correctly', async () => {
      const v1State = { defaultMode: 'vault' };

      const result = await migrateV1ToV2(v1State);

      expect(result.currentMode).toBe('vault');
      expect(result.version).toBe(2);
      expect(result.metadata).toBeDefined();
    });
  });

  describe('Corrupted v1 states', () => {
    it('should fallback to walk for invalid mode', async () => {
      const v1State = { defaultMode: 'invalid-mode' };

      const result = await migrateV1ToV2(v1State);

      // Should fallback to safe default
      expect(result.currentMode).toBe('walk');
      expect(result.version).toBe(2);
      expect(result.metadata).toBeDefined();
    });

    it('should handle missing defaultMode field', async () => {
      const v1State = {};

      const result = await migrateV1ToV2(v1State);

      // Should fallback to default state
      expect(result.currentMode).toBe('walk');
      expect(result.version).toBe(2);
      expect(result.metadata).toBeDefined();
    });

    it('should handle null/undefined state', async () => {
      const result1 = await migrateV1ToV2(null as any);
      const result2 = await migrateV1ToV2(undefined as any);

      expect(result1.currentMode).toBe('walk');
      expect(result1.version).toBe(2);

      expect(result2.currentMode).toBe('walk');
      expect(result2.version).toBe(2);
    });
  });

  describe('Preference preservation', () => {
    it('should preserve user mode choice through migration', async () => {
      // User had chosen 'vault' in v1
      const v1State = { defaultMode: 'vault' };

      const result = await migrateV1ToV2(v1State);

      // Their choice should be preserved
      expect(result.currentMode).toBe('vault');
    });

    it('should generate fresh timestamp on migration', async () => {
      const before = Date.now();

      const v1State = { defaultMode: 'sprint' };
      const result = await migrateV1ToV2(v1State);

      const after = Date.now();

      expect(result.metadata.lastModified).toBeGreaterThanOrEqual(before);
      expect(result.metadata.lastModified).toBeLessThanOrEqual(after);
    });
  });

  describe('Edge cases', () => {
    it('should handle extra v1 fields gracefully', async () => {
      const v1State = {
        defaultMode: 'walk',
        someOldField: 'value',
        anotherField: 123,
      };

      const result = await migrateV1ToV2(v1State);

      // Should extract only what's needed
      expect(result.currentMode).toBe('walk');
      expect(result.version).toBe(2);
      // Extra fields not migrated (v2 has stricter schema)
    });

    it('should handle case-sensitive mode values', async () => {
      const v1State = { defaultMode: 'Walk' }; // Wrong case

      const result = await migrateV1ToV2(v1State);

      // Should normalize or fallback
      expect(result.currentMode).toBe('walk'); // Fallback to safe default
    });
  });
});
