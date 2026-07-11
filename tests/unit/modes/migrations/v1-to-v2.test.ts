/**
 * @file v1-to-v2.test.ts
 * @description Tests for v1→v2 state migration
 *
 * Tests migrating from v1 state ({ defaultMode }) to v2 state
 * ({ currentMode, version, metadata }). As of the mode consolidation,
 * this migration maps legacy v1 names directly to the v3 mode vocabulary
 * (basic/pro/pro_xai), skipping the intermediate v2 names.
 *
 * Follows testing-strategy-v2 Principle #6: Real, tricky test cases.
 */

import { describe, it, expect } from 'vitest';

import { migrateV1ToV2 } from '@/content/modes/migrations/v1-to-v2';

describe('v1 → v2 Migration', () => {
  describe('Valid v1 states (V1 names → V3 names)', () => {
    it('should migrate walk (v1) → basic (v3)', async () => {
      const v1State = { defaultMode: 'walk' };

      const result = await migrateV1ToV2(v1State);

      expect(result.currentMode).toBe('basic');
      expect(result.version).toBe(2);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.version).toBe(2);
      expect(result.metadata.lastModified).toBeGreaterThan(0);
    });

    it('should migrate sprint (v1) → basic (v3)', async () => {
      const v1State = { defaultMode: 'sprint' };

      const result = await migrateV1ToV2(v1State);

      expect(result.currentMode).toBe('basic');
      expect(result.version).toBe(2);
      expect(result.metadata).toBeDefined();
    });

    it('should migrate vault (v1) → pro (v3)', async () => {
      const v1State = { defaultMode: 'vault' };

      const result = await migrateV1ToV2(v1State);

      expect(result.currentMode).toBe('pro');
      expect(result.version).toBe(2);
      expect(result.metadata).toBeDefined();
    });

    it('should migrate neural (v1) → pro_xai (v3)', async () => {
      const v1State = { defaultMode: 'neural' };

      const result = await migrateV1ToV2(v1State);

      expect(result.currentMode).toBe('pro_xai');
      expect(result.version).toBe(2);
    });
  });

  describe('Corrupted v1 states', () => {
    it('should fallback to basic for invalid mode', async () => {
      const v1State = { defaultMode: 'invalid-mode' };

      const result = await migrateV1ToV2(v1State);

      // Should fallback to safe default
      expect(result.currentMode).toBe('basic');
      expect(result.version).toBe(2);
      expect(result.metadata).toBeDefined();
    });

    it('should handle missing defaultMode field', async () => {
      const v1State = {};

      const result = await migrateV1ToV2(v1State);

      // Should fallback to default state
      expect(result.currentMode).toBe('basic');
      expect(result.version).toBe(2);
      expect(result.metadata).toBeDefined();
    });

    it('should handle null/undefined state', async () => {
      const result1 = await migrateV1ToV2(null as any);
      const result2 = await migrateV1ToV2(undefined as any);

      expect(result1.currentMode).toBe('basic');
      expect(result1.version).toBe(2);

      expect(result2.currentMode).toBe('basic');
      expect(result2.version).toBe(2);
    });
  });

  describe('Preference preservation', () => {
    it('should preserve user mode choice through migration', async () => {
      // User had chosen 'vault' in v1 (now 'pro' in v3)
      const v1State = { defaultMode: 'vault' };

      const result = await migrateV1ToV2(v1State);

      // Their choice should be preserved (mapped to v3 name)
      expect(result.currentMode).toBe('pro');
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
      expect(result.currentMode).toBe('basic');
      expect(result.version).toBe(2);
      // Extra fields not migrated (v2 has stricter schema)
    });

    it('should handle case-sensitive mode values', async () => {
      const v1State = { defaultMode: 'Walk' }; // Wrong case

      const result = await migrateV1ToV2(v1State);

      // Should normalize or fallback
      expect(result.currentMode).toBe('basic'); // Fallback to safe default
    });
  });
});
