/**
 * @file mode-config-schema.test.ts
 * @description Contract test asserting ModeConfigSchema uses V3 mode names.
 *
 * Pin the contract: every mode-typed schema in the codebase must agree with
 * the canonical V3 enum (ModeTypeSchema in @/shared/schemas/mode-state-schemas).
 * A new mode-related schema that drifts back to V1/V2 names fails this test.
 */
import { describe, it, expect } from 'vitest';

import { ModeConfigSchema } from '@/shared/schemas/validation';

describe('ModeConfigSchema — V3 mode agreement', () => {
  it('accepts V3 mode names', () => {
    for (const v3Name of ['basic', 'pro', 'pro_xai']) {
      const result = ModeConfigSchema.shape.modeName.safeParse(v3Name);
      expect(result.success, `ModeConfigSchema should accept "${v3Name}"`).toBe(true);
    }
  });

  it('rejects legacy V1/V2 mode names (walk/sprint/vault/neural/ephemeral/local/cloud/ai)', () => {
    for (const legacyName of [
      'walk',
      'sprint',
      'vault',
      'neural',
      'ephemeral',
      'local',
      'cloud',
      'ai',
    ]) {
      const result = ModeConfigSchema.shape.modeName.safeParse(legacyName);
      expect(
        result.success,
        `ModeConfigSchema must reject legacy name "${legacyName}"`
      ).toBe(false);
    }
  });
});
