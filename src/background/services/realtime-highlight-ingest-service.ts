/**
 * @file realtime-highlight-ingest-service.ts
 * @description Applies Supabase Realtime highlight events to background IndexedDB.
 */

import type { IHighlightRepository } from '@/shared/repositories/i-highlight-repository';
import type { RepositoryFacade } from '@/shared/repositories/repository-facade';
import type { IEventBus } from '@/shared/interfaces/i-event-bus';
import type { ILogger } from '@/shared/interfaces/i-logger';
import { EventName } from '@/shared/types/events';
import {
  isRemoteHighlightNewer,
  transformHighlightRow,
  type SupabaseHighlightRow,
} from '@/shared/utils/supabase-highlight-row';

import { notifyLibraryDataChanged } from '@/background/services/library-change-notifier';
import type { LocalWriteEchoTracker } from '@/background/services/local-write-echo-tracker';
import type { RealtimeIngestStats } from '@/background/services/interfaces/i-realtime-highlight-ingest-service';

export class RealtimeHighlightIngestService {
  constructor(
    private readonly eventBus: IEventBus,
    private readonly highlightRepository: IHighlightRepository,
    private readonly repositoryFacade: RepositoryFacade,
    private readonly echoTracker: LocalWriteEchoTracker,
    private readonly logger: ILogger
  ) {}

  initialize(): void {
    this.eventBus.on(EventName.REMOTE_HIGHLIGHT_CREATED, async (payload) => {
      await this.handleCreated(payload as SupabaseHighlightRow);
    });
    this.eventBus.on(EventName.REMOTE_HIGHLIGHT_UPDATED, async (payload) => {
      await this.handleUpdated(payload as SupabaseHighlightRow);
    });
    this.eventBus.on(EventName.REMOTE_HIGHLIGHT_DELETED, async (payload) => {
      await this.handleDeleted(payload as { id?: string });
    });

    this.logger.info('[RealtimeIngest] Subscribed to remote highlight events');
  }

  private async handleCreated(row: SupabaseHighlightRow): Promise<void> {
    await this.applyRemoteRow(row, 'created');
  }

  private async handleUpdated(row: SupabaseHighlightRow): Promise<void> {
    await this.applyRemoteRow(row, 'updated');
  }

  private async handleDeleted(payload: { id?: string }): Promise<void> {
    const id = payload?.id;
    if (!id) {
      return;
    }

    if (this.echoTracker.isEcho(id)) {
      this.logger.debug('[RealtimeIngest] Skipping delete echo', { id });
      return;
    }

    const stats: RealtimeIngestStats = {
      applied: 0,
      skippedEcho: 0,
      skippedStale: 0,
      removed: 0,
      failed: 0,
    };

    try {
      const exists = await this.highlightRepository.exists(id);
      if (!exists) {
        return;
      }

      await this.highlightRepository.remove(id, { skipSync: true });
      stats.removed = 1;
      await this.repositoryFacade.reload();
      notifyLibraryDataChanged({ source: 'realtime-delete' });
    } catch (error) {
      stats.failed = 1;
      this.logger.error('[RealtimeIngest] Failed to apply delete', error as Error, { id });
    }
  }

  private async applyRemoteRow(
    row: SupabaseHighlightRow,
    source: 'created' | 'updated'
  ): Promise<void> {
    const stats: RealtimeIngestStats = {
      applied: 0,
      skippedEcho: 0,
      skippedStale: 0,
      removed: 0,
      failed: 0,
    };

    try {
      const id = row?.id;
      if (!id) {
        return;
      }

      if (this.echoTracker.isEcho(id)) {
        stats.skippedEcho = 1;
        this.logger.debug('[RealtimeIngest] Skipping echo', { id, source });
        return;
      }

      const highlight = transformHighlightRow(row);

      const local = await this.highlightRepository.findById(id);

      if (local && !isRemoteHighlightNewer(highlight, local)) {
        stats.skippedStale = 1;
        this.logger.debug('[RealtimeIngest] Skipping stale remote row', { id, source });
        return;
      }

      if (!local) {
        await this.highlightRepository.add(highlight, { skipSync: true });
      } else {
        await this.highlightRepository.update(id, highlight, { skipSync: true });
      }

      stats.applied = 1;
      await this.repositoryFacade.reload();
      notifyLibraryDataChanged({ source: `realtime-${source}` });
    } catch (error) {
      stats.failed = 1;
      this.logger.error('[RealtimeIngest] Failed to apply remote row', error as Error, {
        id: row?.id,
        source,
      });
    }
  }
}
