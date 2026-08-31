/**
 * @file v2-to-v3.ts
 * @description Migration from v2 mode names (ephemeral/local/cloud/ai) —
 * plus the older v1 motif names (walk/sprint/vault/neural) — to the v3
 * consolidated vocabulary ('basic' | 'pro' | 'pro_xai').
 */

import { ModeTypeSchema, type ModeType } from '@/shared/schemas/mode-state-schemas';

export interface V2ToV3Result {
  mode: ModeType;
}

const LEGACY_TO_V3: Record<string, ModeType> = {
  ephemeral: 'basic',
  local: 'basic',
  cloud: 'pro',
  ai: 'pro_xai',
  walk: 'basic',
  sprint: 'basic',
  vault: 'pro',
  neural: 'pro_xai',
};

const V3_DEFAULT: V2ToV3Result = { mode: 'basic' };

export function migrateV2ToV3(rawMode: unknown): V2ToV3Result {
  if (typeof rawMode !== 'string') {
    return V3_DEFAULT;
  }

  const validation = ModeTypeSchema.safeParse(rawMode);
  if (validation.success) {
    return { mode: validation.data };
  }

  const translated = LEGACY_TO_V3[rawMode.toLowerCase()];
  if (translated) {
    return { mode: translated };
  }

  return V3_DEFAULT;
}

export function needsV2ToV3Migration(rawMode: unknown): boolean {
  if (typeof rawMode !== 'string') return false;
  return (
    !ModeTypeSchema.safeParse(rawMode).success && rawMode.toLowerCase() in LEGACY_TO_V3
  );
}
