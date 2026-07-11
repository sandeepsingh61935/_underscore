/**
 * @file normalize-mode.ts
 * @description Shared shim that maps any historical mode name (v1 motif
 * names, v2 ephemeral/local/cloud/ai names) forward to the current v3
 * internal IDs ('basic' | 'pro' | 'pro_xai'). Idempotent — already-current
 * names pass through unchanged.
 *
 * Use this at every storage/IPC read boundary so legacy stored values keep
 * working without a one-time data migration.
 */

import { ModeTypeSchema, type ModeType } from '@/shared/schemas/mode-state-schemas';

const DEFAULT_MODE: ModeType = 'basic';

/**
 * Legacy name → current ModeType.
 * Covers both v1 motif names (walk/sprint/vault/neural) and v2 names
 * (ephemeral/local/cloud/ai).
 */
const LEGACY_MODE_MAP: Record<string, ModeType> = {
  // v1 motif names
  walk: 'basic',
  sprint: 'basic',
  vault: 'pro',
  neural: 'pro_xai',
  // v2 names
  ephemeral: 'basic',
  local: 'basic',
  cloud: 'pro',
  ai: 'pro_xai',
};

/**
 * Normalize a raw mode value (from storage, IPC, or user input) to the
 * current ModeType vocabulary.
 *
 * Order of resolution:
 * 1. Already a current-vocabulary value → returned as-is.
 * 2. A known legacy name → mapped forward.
 * 3. Unknown/invalid → falls back to the default mode ('basic').
 */
export function normalizeMode(raw: unknown): ModeType {
  if (typeof raw !== 'string') {
    return DEFAULT_MODE;
  }

  const validation = ModeTypeSchema.safeParse(raw);
  if (validation.success) {
    return validation.data;
  }

  const legacy = LEGACY_MODE_MAP[raw.toLowerCase()];
  if (legacy) {
    return legacy;
  }

  return DEFAULT_MODE;
}

/** True if the raw value is a legacy (pre-v3) mode name that needs translation. */
export function isLegacyModeName(raw: unknown): boolean {
  if (typeof raw !== 'string') return false;
  return !ModeTypeSchema.safeParse(raw).success && raw.toLowerCase() in LEGACY_MODE_MAP;
}
