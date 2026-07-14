import { describe, expect, it } from 'vitest';

import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import {
  canUseFeature,
  getCapabilitiesForMode,
  type FeatureKey,
} from '@/shared/utils/mode-capabilities';

const BOOLEAN_FEATURES: FeatureKey[] = [
  'undo',
  'sync',
  'collections',
  'tags',
  'export',
  'ai',
  'mcp',
  'search',
  'multiSelector',
];

const MODES: ModeType[] = ['basic', 'pro', 'pro_xai'];

/** Independent spec: which boolean features each mode advertises. */
const SPEC_ALLOWED: Record<ModeType, ReadonlySet<FeatureKey>> = {
  basic: new Set(['undo', 'collections', 'tags', 'search']),
  pro: new Set(['undo', 'sync', 'collections', 'tags', 'export', 'search', 'multiSelector']),
  pro_xai: new Set([
    'undo',
    'sync',
    'collections',
    'tags',
    'export',
    'search',
    'multiSelector',
    'ai',
    'mcp',
  ]),
};

function happyContext(mode: ModeType) {
  const isProFamily = mode === 'pro' || mode === 'pro_xai';
  return {
    mode,
    capabilities: getCapabilitiesForMode(mode),
    isAuthenticated: isProFamily,
    storageScope: isProFamily ? ('pro' as const) : ('basic' as const),
  };
}

describe('canUseFeature capability matrix', () => {
  const cases = MODES.flatMap((mode) =>
    BOOLEAN_FEATURES.map((feature) => ({ mode, feature })),
  );

  it.each(cases)(
    '$mode allows $feature only when the mode spec permits it',
    ({ mode, feature }) => {
      const result = canUseFeature(feature, happyContext(mode));
      const shouldAllow = SPEC_ALLOWED[mode].has(feature);

      expect(result.allowed).toBe(shouldAllow);
      if (!shouldAllow) {
        const expectedReason =
          feature === 'ai' || feature === 'mcp' ? 'WRONG_MODE' : 'CAPABILITY_DENIED';
        expect(result.reason).toBe(expectedReason);
      }
    },
  );
});
