/**
 * @file v1-to-v2.ts
 * @description Migration from v1 to v2 state format
 * 
 * V1 format: { defaultMode: 'walk' | 'sprint' | 'vault' }
 * V2 format: { currentMode, version, metadata: { version, lastModified } }
 * 
 * Handles:
 * - Mode value validation and normalization
 * - Fallback to safe defaults for corrupted data
 * - Timestamp generation
 * - Metadata creation
 */

import { ModeTypeSchema, type ModeType, type StateMetadata } from '@/shared/schemas/mode-state-schemas';

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
    [key: string]: any; // May have extra fields
}

/**
 * Migrate state from v1 to v2
 * 
 * @param v1State - V1 state object
 * @returns V2 state object
 */
export async function migrateV1ToV2(v1State: V1State | null | undefined): Promise<V2State> {
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
 * Validate and normalize mode value
 * 
 * @param rawMode - Raw mode value from v1 state
 * @returns Validated ModeType or 'walk' as fallback
 */
function validateAndNormalizeMode(rawMode: any): ModeType {
    // Try to validate with Zod
    const validation = ModeTypeSchema.safeParse(rawMode);

    if (validation.success) {
        return validation.data;
    }

    // Handle case-insensitive matches
    if (typeof rawMode === 'string') {
        const normalized = rawMode.toLowerCase();
        const retryValidation = ModeTypeSchema.safeParse(normalized);

        if (retryValidation.success) {
            return retryValidation.data;
        }
    }

    // Fallback to safe default
    return 'walk';
}

/**
 * Create default v2 state (used for corrupted v1 states)
 * 
 * @returns Default v2 state
 */
function createDefaultV2State(): V2State {
    return {
        currentMode: 'walk',
        version: 2,
        metadata: {
            version: 2,
            lastModified: Date.now(),
        },
    };
}
