/**
 * @file realtime-highlight-ingest-service.ts
 * @description Applies Supabase Realtime highlight events to background IndexedDB.
 */

import type { IEncryptionService } from '@/background/auth/interfaces/i-encryption-service';
import type { IHighlightRepository } from '@/shared/repositories/i-highlight-repository';
import type { RepositoryFacade } from '@/shared/repositories/repository-facade';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
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
    private readonly logger: ILogger,
    private readonly encryptionService?: IEncryptionService
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

      let highlight = transformHighlightRow(row);
      highlight = await this.maybeDecryptLegacyHighlight(highlight);

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

  private async maybeDecryptLegacyHighlight(highlight: HighlightDataV2): Promise<HighlightDataV2> {
    if (!highlight.text.startsWith('[ENCRYPTED:') || !this.encryptionService) {
      return highlight;
    }

    try {
      const encryptedJson = highlight.text.substring(11, highlight.text.length - 1);
      const encryptedPayload = JSON.parse(encryptedJson);
      const decrypted = await this.encryptionService.decrypt(encryptedPayload);

      return {
        ...highlight,
        text: decrypted.text,
        url: decrypted.url || highlight.url,
        ranges: decrypted.selector ? JSON.parse(decrypted.selector) : highlight.ranges,
      };
    } catch (error) {
      this.logger.warn('[RealtimeIngest] Legacy decrypt failed', {
        id: highlight.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return highlight;
    }
  }
}
