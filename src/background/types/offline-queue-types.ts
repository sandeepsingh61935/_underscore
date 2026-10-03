/**
 * @file offline-queue-types.ts
 * @description Type definitions for the offline retry queue
 */

import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import type { PageGroup, PageGroupItem } from '@/shared/types/page-group';

export type OfflineOperationType = 'add' | 'update' | 'remove';

/**
 * Entity discriminator for queued operations (Task 2.2, ADR-032 §8).
 * Absent means `highlight` — the pre-groups shape is preserved so existing
 * queued rows replay exactly as before.
 */
export type OfflineOperationEntity = 'highlight' | 'group' | 'group_item';

export interface OfflineOperation {
  id: string; // Unique ID for the operation
  type: OfflineOperationType;
  targetId: string; // ID of the highlight/group/item being operated on
  /** Full row for group entities; highlight data for highlight entities. */
  payload?: HighlightDataV2 | Partial<HighlightDataV2> | PageGroup | PageGroupItem;
  entity?: OfflineOperationEntity;
  timestamp: number;
  retryCount: number;
}
