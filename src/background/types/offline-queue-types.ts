
/**
 * @file offline-queue-types.ts
 * @description Type definitions for the offline retry queue
 */

import type { HighlightDataV2 } from '@/background/schemas/highlight-schema';

export type OfflineOperationType = 'add' | 'update' | 'remove';

export interface OfflineOperation {
    id: string;              // Unique ID for the operation
    type: OfflineOperationType;
    targetId: string;       // ID of the highlight being operated on
    payload?: HighlightDataV2 | Partial<HighlightDataV2>; // Data needed for operation
    timestamp: number;
    retryCount: number;
}
