/**
 * @file mode-constants.test.ts
 * @description Contract test for src/content/modes/mode-constants.ts
 *
 * Pins the contract that every value in MODE_NAMES is a valid V2 mode
 * (per ModeTypeSchema). Catches:
 *  - V1 names leaking back in (walk/sprint/vault/neural)
 *  - Typo'd mode names that don't match the schema
 *  - Drift between MODE_NAMES and ModeTypeSchema
 *
 * The current V2 mode set is { ephemeral, local, cloud, ai } per
 * docs/superpowers/specs/2026-06-04-full-legacy-ds-purge.md.
 */
import { describe, it, expect } from 'vitest';

import { ModeTypeSchema } from '@/shared/schemas/mode-state-schemas';

import { MODE_NAMES, MODE_DISPLAY_NAMES } from '@/content/modes/mode-constants';

describe('mode-constants — V2 contract', () => {
  it('every MODE_NAMES value is a valid V2 mode (per ModeTypeSchema)', () => {
    const values = Object.values(MODE_NAMES);
    expect(values.length).toBeGreaterThan(0);
    for (const value of values) {
      const result = ModeTypeSchema.safeParse(value);
      expect(
        result.success,
        `MODE_NAMES value "${value}" is not a valid V2 mode`,
      ).toBe(true);
    }
  });
});
