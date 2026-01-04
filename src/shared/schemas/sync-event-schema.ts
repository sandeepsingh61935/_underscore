/**
 * @file sync-event-schema.ts
 * @description Zod schemas for SyncEvent and related payloads
 * @see src/background/events/event-types.ts
 */

import { z } from 'zod';
import { HighlightDataSchemaV2 } from './highlight-schema';

/**
 * Vector Clock Schema
 * Maps device ID to logical timestamp
 */
export const VectorClockSchema = z.record(z.string(), z.number().int().nonnegative());
export type VectorClock = z.infer<typeof VectorClockSchema>;

/**
 * Sync Event Type Enum Schema
 */
export const SyncEventTypeSchema = z.enum([
    'highlight.created',
    'highlight.updated',
    'highlight.deleted',
    'collection.created',
    'collection.updated',
    'collection.deleted',
]);

/**
 * Highlight Created Payload Schema
 */
export const HighlightCreatedPayloadSchema = z.object({
    id: z.string().uuid(),
    data: HighlightDataSchemaV2,
    url: z.string().url(),
    pageTitle: z.string().optional(),
});

/**
 * Highlight Updated Payload Schema
 */
export const HighlightUpdatedPayloadSchema = z.object({
    id: z.string().uuid(),
    changes: HighlightDataSchemaV2.partial(),
    previousVersion: z.number().int().nonnegative(),
});

/**
 * Highlight Deleted Payload Schema
 */
export const HighlightDeletedPayloadSchema = z.object({
    id: z.string().uuid(),
    reason: z.enum(['user', 'ttl', 'sync']),
    deletedAt: z.number().int().positive(),
});

/**
 * Base Sync Event Schema
 * defined without payload to be extended
 */
const SyncEventBaseSchema = z.object({
    id: z.string().uuid(),
    type: SyncEventTypeSchema,
    timestamp: z.number().int().positive(),
    deviceId: z.string(),
    vectorClock: VectorClockSchema,
    checksum: z.string(),
    userId: z.string(),
});

/**
 * Full Sync Event Schema with discriminated union for payload
 */
export const SyncEventSchema = z.discriminatedUnion('type', [
    SyncEventBaseSchema.extend({
        type: z.literal('highlight.created'),
        payload: HighlightCreatedPayloadSchema,
    }),
    SyncEventBaseSchema.extend({
        type: z.literal('highlight.updated'),
        payload: HighlightUpdatedPayloadSchema,
    }),
    SyncEventBaseSchema.extend({
        type: z.literal('highlight.deleted'),
        payload: HighlightDeletedPayloadSchema,
    }),
    // Collection events omitted for brevity as they follow similar pattern
    // and are not primary focus of this phase
]);

export type SyncEvent = z.infer<typeof SyncEventSchema>;
