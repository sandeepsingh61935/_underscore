/**
 * @file validation.ts
 * @description Central validation schemas using Zod
 */

import { z } from 'zod';

import { HighlightDataSchemaV2 } from './highlight-schema';

// ============================================================================
// Highlight Validation
// ============================================================================

/**
 * Validates highlight data structure
 * Re-exports the authoritative V2 schema
 */
export const HighlightSchema = HighlightDataSchemaV2;

export type Highlight = z.infer<typeof HighlightSchema>;

// ============================================================================
// Messaging Validation
// ============================================================================

/**
 * Validates inter-component messages
 */
export const MessageSchema = z.object({
    type: z.string().min(1, 'Message type is required'),
    payload: z.unknown().optional(),
});

export type Message = z.infer<typeof MessageSchema>;

// ============================================================================
// Mode Validation
// ============================================================================

/**
 * Validates mode configuration payload
 * (For switching modes or configuring them)
 */
export const ModeConfigSchema = z.object({
    modeName: z.enum(['walk', 'sprint', 'vault']),
    settings: z.any().optional(),
});

export type ModeConfig = z.infer<typeof ModeConfigSchema>;
