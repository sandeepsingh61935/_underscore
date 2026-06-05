/**
 * @file mode-config-schema.test.ts
 * @description Contract test asserting ModeConfigSchema uses V2 mode names.
 *
 * Pin the contract: every mode-typed schema in the codebase must agree with
 * the canonical V2 enum (ModeTypeSchema in @/shared/schemas/mode-state-schemas).
 * A new mode-related schema that drifts back to V1 names fails this test.
 */
import { describe, it, expect } from 'vitest';

import { ModeConfigSchema } from '@/shared/schemas/validation';

describe('ModeConfigSchema — V2 mode agreement', () => {
  it('accepts V2 mode names', () => {
    for (const v2Name of ['ephemeral', 'local', 'cloud', 'ai']) {
      const result = ModeConfigSchema.shape.modeName.safeParse(v2Name);
      expect(result.success, `ModeConfigSchema should accept "${v2Name}"`).toBe(true);
    }
  });

  it('rejects V1 mode names (walk/sprint/vault/neural)', () => {
    for (const v1Name of ['walk', 'sprint', 'vault', 'neural']) {
      const result = ModeConfigSchema.shape.modeName.safeParse(v1Name);
      expect(
        result.success,
        `ModeConfigSchema must reject V1 name "${v1Name}"`,
      ).toBe(false);
    }
  });
});
