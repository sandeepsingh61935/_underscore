/**
 * @file realtime-group-ingest-service.ts
 * @description Applies Supabase Realtime Page Groups events to the local
 * Pro IndexedDB partition (plan Phase 2 Task 2.3, ADR-032 §8).
 *
 * Mirrors `realtime-highlight-ingest-service.ts` with two group-specific
 * differences:
 * - Writes go straight to the local `IGroupRepository` (the Pro partition).
 *   That bypasses `GroupService`, so no cloud dual-write fires — the exact
 *   equivalent of the highlight path's `{ skipSync: true }` (the group
 *   repository contract has no such option; sync lives in the service).
 * - Conflict resolution uses the Task 1.2 `mergeRow` (last-write-wins on
 *   `updatedAt`, tombstone-wins on ties) instead of `isRemoteHighlightNewer`.
 */

import { notifyLibraryDataChanged } from '@/background/services/library-change-notifier';
import type { LocalWriteEchoTracker } from '@/background/services/local-write-echo-tracker';
import type { IEventBus } from '@/shared/interfaces/i-event-bus';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { IGroupRepository } from '@/shared/repositories/i-group-repository';
import { EventName } from '@/shared/types/events';
import type { PageGroupItem } from '@/shared/types/page-group';
import { mergeRow } from '@/shared/utils/page-group-merge';
import {
  transformGroupItemRow,
  transformGroupRow,
  type SupabaseGroupItemRow,
  type SupabaseGroupRow,
} from '@/shared/utils/supabase-group-row';

function nowIso(): string {
  return new Date().toISOString();
}

export class RealtimeGroupIngestService {
  constructor(
    private readonly eventBus: IEventBus,
    /**
     * Pro local group store. Realtime channels are owner-filtered and only
     * subscribed while signed in, so ingest always lands in Pro.
     */
    private readonly groupRepository: IGroupRepository,
    private readonly echoTracker: LocalWriteEchoTracker,
    private readonly logger: ILogger
  ) {}

  initialize(): void {
    this.eventBus.on(EventName.REMOTE_GROUP_CREATED, async (payload) => {
      await this.applyRemoteGroup(payload as SupabaseGroupRow, 'created');
    });
    this.eventBus.on(EventName.REMOTE_GROUP_UPDATED, async (payload) => {
      await this.applyRemoteGroup(payload as SupabaseGroupRow, 'updated');
    });
    this.eventBus.on(EventName.REMOTE_GROUP_DELETED, async (payload) => {
      await this.handleGroupDeleted(payload as { id?: string });
    });
    this.eventBus.on(EventName.REMOTE_GROUP_ITEM_CREATED, async (payload) => {
      await this.applyRemoteItem(payload as SupabaseGroupItemRow, 'created');
    });
    this.eventBus.on(EventName.REMOTE_GROUP_ITEM_UPDATED, async (payload) => {
      await this.applyRemoteItem(payload as SupabaseGroupItemRow, 'updated');
    });
    this.eventBus.on(EventName.REMOTE_GROUP_ITEM_DELETED, async (payload) => {
      await this.handleItemDeleted(payload as { id?: string; groupId?: string });
    });

    this.logger.info('[RealtimeGroupIngest] Subscribed to remote group events');
  }

  private async applyRemoteGroup(
    row: SupabaseGroupRow,
    source: 'created' | 'updated'
  ): Promise<void> {
    try {
      const id = row?.id;
      if (!id) {
        return;
      }

      if (this.echoTracker.isEcho(id)) {
        this.logger.debug('[RealtimeGroupIngest] Skipping echo', { id, source });
        return;
      }

      const remote = transformGroupRow(row);
      const local = await this.groupRepository.getGroup(id);

      if (local && mergeRow(local, remote) !== remote) {
        this.logger.debug('[RealtimeGroupIngest] Skipping stale remote group', {
          id,
          source,
        });
        return;
      }

      // putGroup is an upsert: creates, updates, and tombstones all land.
      await this.groupRepository.putGroup(remote);
      notifyLibraryDataChanged({ source: `realtime-group-${source}` });
    } catch (error) {
      this.logger.error(
        '[RealtimeGroupIngest] Failed to apply remote group',
        error as Error,
        { id: row?.id, source }
      );
    }
  }

  private async applyRemoteItem(
    row: SupabaseGroupItemRow,
    source: 'created' | 'updated'
  ): Promise<void> {
    try {
      const id = row?.id;
      if (!id) {
        return;
      }

      if (this.echoTracker.isEcho(id)) {
        this.logger.debug('[RealtimeGroupIngest] Skipping item echo', { id, source });
        return;
      }

      const remote = transformGroupItemRow(row);
      const local = await this.findLocalItem(remote.groupId, id);

      if (local && mergeRow(local, remote) !== remote) {
        this.logger.debug('[RealtimeGroupIngest] Skipping stale remote item', {
          id,
          source,
        });
        return;
      }

      await this.groupRepository.putItem(remote);
      notifyLibraryDataChanged({ source: `realtime-group-item-${source}` });
    } catch (error) {
      this.logger.error(
        '[RealtimeGroupIngest] Failed to apply remote item',
        error as Error,
        { id: row?.id, source }
      );
    }
  }

  private async handleGroupDeleted(payload: { id?: string }): Promise<void> {
    const id = payload?.id;
    if (!id) {
      return;
    }

    if (this.echoTracker.isEcho(id)) {
      this.logger.debug('[RealtimeGroupIngest] Skipping group delete echo', { id });
      return;
    }

    try {
      const local = await this.groupRepository.getGroup(id);
      if (!local || local.deletedAt !== null) {
        return;
      }

      const now = nowIso();
      await this.groupRepository.putGroup({ ...local, deletedAt: now, updatedAt: now });
      notifyLibraryDataChanged({ source: 'realtime-group-delete' });
    } catch (error) {
      this.logger.error(
        '[RealtimeGroupIngest] Failed to apply group delete',
        error as Error,
        { id }
      );
    }
  }

  private async handleItemDeleted(payload: { id?: string; groupId?: string }): Promise<void> {
    const id = payload?.id;
    if (!id) {
      return;
    }

    if (this.echoTracker.isEcho(id)) {
      this.logger.debug('[RealtimeGroupIngest] Skipping item delete echo', { id });
      return;
    }

    try {
      const found = await this.findLocalItemAnywhere(id, payload?.groupId);
      if (!found || found.item.deletedAt !== null) {
        return;
      }

      const now = nowIso();
      await this.groupRepository.putItem({
        ...found.item,
        deletedAt: now,
        updatedAt: now,
      });
      notifyLibraryDataChanged({ source: 'realtime-group-item-delete' });
    } catch (error) {
      this.logger.error(
        '[RealtimeGroupIngest] Failed to apply item delete',
        error as Error,
        { id }
      );
    }
  }

  private async findLocalItem(
    groupId: string,
    id: string
  ): Promise<PageGroupItem | null> {
    const items = await this.groupRepository.listItems(groupId, {
      includeDeleted: true,
    });
    return items.find((candidate) => candidate.id === id) ?? null;
  }

  /**
   * Locate an item when the delete payload carries no group id (Supabase
   * DELETE payloads only carry the PK under the default replica identity).
   */
  private async findLocalItemAnywhere(
    id: string,
    groupId?: string
  ): Promise<{ item: PageGroupItem } | null> {
    if (groupId) {
      const item = await this.findLocalItem(groupId, id);
      return item ? { item } : null;
    }
    const groups = await this.groupRepository.listGroups({ includeDeleted: true });
    for (const group of groups) {
      const item = await this.findLocalItem(group.id, id);
      if (item) {
        return { item };
      }
    }
    return null;
  }
}
