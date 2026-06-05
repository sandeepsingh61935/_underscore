/**
 * @file v1-to-v2.ts
 * @description Migration from v1 to v2 state format
 *
 * V1 format: { defaultMode: <V1 name> } where V1 names are documented in
 *            V1_TO_V2_MODE below.
 * V2 format: { currentMode, version, metadata: { version, lastModified } }
 *
 * Handles:
 * - Mode value validation and normalization
 * - Fallback to safe defaults for corrupted data
 * - Timestamp generation
 * - Metadata creation
 */

import {
  ModeTypeSchema,
  type ModeType,
  type StateMetadata,
} from '@/shared/schemas/mode-state-schemas';

/**
 * V2 State format
 */
export interface V2State {
  currentMode: ModeType;
  version: 2;
  metadata: StateMetadata;
}

/**
 * V1 State format (legacy)
 */
interface V1State {
  defaultMode?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // May have extra fields
}

/**
 * Migrate state from v1 to v2
 *
 * @param v1State - V1 state object
 * @returns V2 state object
 */
export async function migrateV1ToV2(
  v1State: V1State | null | undefined
): Promise<V2State> {
  // Handle null/undefined
  if (!v1State || typeof v1State !== 'object') {
    return createDefaultV2State();
  }

  // Extract and validate mode
  // V1 might use 'mode' or 'defaultMode'
  const rawMode = v1State['mode'] || v1State.defaultMode;
  const validatedMode = validateAndNormalizeMode(rawMode);

  // Create v2 state with metadata
  return {
    currentMode: validatedMode,
    version: 2,
    metadata: {
      version: 2,
      lastModified: Date.now(),
    },
  };
}

/**
 * V1 mode name → V2 mode name.
 *
 * The keys of this map are intentionally V1 names — they are the
 * input vocabulary this migration translates FROM. Do not rename
 * the keys; rename the values if the V2 vocabulary shifts.
 */
const V1_TO_V2_MODE: Record<string, ModeType> = {
  walk: 'ephemeral',
  sprint: 'local',
  vault: 'cloud',
  neural: 'ai',
};

const V2_DEFAULT_MODE: ModeType = 'ephemeral';

/**
 * Validate and normalize mode value.
 *
 * Order: (1) accept already-V2 names; (2) map V1 names; (3) fallback.
 *
 * @param rawMode - Raw mode value from v1 state
 * @returns Validated V2 ModeType, with V1 names translated.
 */
function validateAndNormalizeMode(rawMode: unknown): ModeType {
  // 1. Accept already-V2 names (idempotent re-migration, future-proofing).
  if (typeof rawMode === 'string') {
    const validation = ModeTypeSchema.safeParse(rawMode);
    if (validation.success) {
      return validation.data;
    }
  }

  // 2. Translate V1 names to V2 names.
  if (typeof rawMode === 'string') {
    const translated = V1_TO_V2_MODE[rawMode.toLowerCase()];
    if (translated) {
      return translated;
    }
  }

  // 3. Fallback to V2 default.
  return V2_DEFAULT_MODE;
}

/**
 * Create default v2 state (used for corrupted v1 states)
 *
 * @returns Default v2 state
 */
function createDefaultV2State(): V2State {
  return {
    currentMode: V2_DEFAULT_MODE,
    version: 2,
    metadata: {
      version: 2,
      lastModified: Date.now(),
    },
  };
}
