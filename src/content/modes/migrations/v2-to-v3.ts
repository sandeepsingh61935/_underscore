/**
 * @file v2-to-v3.ts
 * @description Migration from v2 mode names (ephemeral/local/cloud/ai) —
 * plus the older v1 motif names (walk/sprint/vault/neural) — to the v3
 * consolidated vocabulary ('basic' | 'pro' | 'pro_xai').
 */

import { BASIC_TTL_DEFAULT, type BasicTtlConfig } from '@/shared/constants/basic-ttl';
import { ModeTypeSchema, type ModeType } from '@/shared/schemas/mode-state-schemas';

export interface V2ToV3Result {
  mode: ModeType;
  /** Only set when the source mode implies a specific Basic TTL default. */
  ttlConfig: BasicTtlConfig;
}

const LEGACY_TO_V3: Record<string, V2ToV3Result> = {
  ephemeral: { mode: 'basic', ttlConfig: { kind: 'preset', preset: '24h' } },
  local: { mode: 'basic', ttlConfig: { kind: 'forever' } },
  cloud: { mode: 'pro', ttlConfig: BASIC_TTL_DEFAULT },
  ai: { mode: 'pro_xai', ttlConfig: BASIC_TTL_DEFAULT },
  walk: { mode: 'basic', ttlConfig: { kind: 'preset', preset: '24h' } },
  sprint: { mode: 'basic', ttlConfig: { kind: 'forever' } },
  vault: { mode: 'pro', ttlConfig: BASIC_TTL_DEFAULT },
  neural: { mode: 'pro_xai', ttlConfig: BASIC_TTL_DEFAULT },
};

const V3_DEFAULT: V2ToV3Result = { mode: 'basic', ttlConfig: BASIC_TTL_DEFAULT };

export function migrateV2ToV3(rawMode: unknown): V2ToV3Result {
  if (typeof rawMode !== 'string') {
    return V3_DEFAULT;
  }

  const validation = ModeTypeSchema.safeParse(rawMode);
  if (validation.success) {
    return { mode: validation.data, ttlConfig: BASIC_TTL_DEFAULT };
  }

  const translated = LEGACY_TO_V3[rawMode.toLowerCase()];
  if (translated) {
    return translated;
  }

  return V3_DEFAULT;
}

export function needsV2ToV3Migration(rawMode: unknown): boolean {
  if (typeof rawMode !== 'string') return false;
  return !ModeTypeSchema.safeParse(rawMode).success && rawMode.toLowerCase() in LEGACY_TO_V3;
}
