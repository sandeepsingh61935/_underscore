/**
 * @file cloud-hydration-service.ts
 * @description Pulls account highlights from Supabase into local IndexedDB on auth.
 */

import type { IAuthManager } from '@/background/auth/interfaces/i-auth-manager';
import type { SupabaseHighlightRepository } from '@/background/repositories/supabase-highlight-repository';
import type { IHighlightRepository } from '@/shared/repositories/i-highlight-repository';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import type { ILogger } from '@/shared/interfaces/i-logger';
import { RepositoryFacade } from '@/shared/repositories/repository-facade';
import {
  highlightTimestampMs,
  isRemoteHighlightNewer,
} from '@/shared/utils/supabase-highlight-row';
import { notifyLibraryDataChanged } from '@/background/services/library-change-notifier';
import type { LibrarySyncCursor } from '@/background/services/library-sync-cursor';
import type {
  CloudHydrationProgress,
  CloudHydrationResult,
  ICloudHydrationService,
} from '@/background/services/interfaces/i-cloud-hydration-service';

const LARGE_LIBRARY_WARN_THRESHOLD = 500;

export class CloudHydrationService implements ICloudHydrationService {
  private hydrationInFlight: Promise<CloudHydrationResult> | null = null;

  constructor(
    private readonly authManager: IAuthManager,
    private readonly highlightRepository: IHighlightRepository,
    private readonly cloudRepository: SupabaseHighlightRepository,
    private readonly repositoryFacade: RepositoryFacade,
    private readonly syncCursor: LibrarySyncCursor,
    private readonly logger: ILogger
  ) {}

  hydrate(onProgress?: CloudHydrationProgress): Promise<CloudHydrationResult> {
    if (this.hydrationInFlight) {
      return this.hydrationInFlight;
    }

    this.hydrationInFlight = this.runHydrate(onProgress).finally(() => {
      this.hydrationInFlight = null;
    });

    return this.hydrationInFlight;
  }

  private emptyResult(localCountBefore = 0): CloudHydrationResult {
    return {
      localCountBefore,
      cloudCount: 0,
      backfilledCount: 0,
      updatedCount: 0,
      deletedCount: 0,
      skippedCount: 0,
      failedCount: 0,
    };
  }

  private async runHydrate(onProgress?: CloudHydrationProgress): Promise<CloudHydrationResult> {
    const report = (percent: number, phase?: string): void => {
      onProgress?.(Math.min(100, Math.max(0, Math.round(percent))), phase);
    };

    report(5, 'starting');

    if (!this.authManager.currentUser) {
      this.logger.debug('[CloudHydration] Skipping hydration (not authenticated)');
      report(100, 'done');
      return this.emptyResult();
    }

    const userId = this.authManager.currentUser.id;
    let localHighlights: HighlightDataV2[] = [];

    try {
      localHighlights = await this.highlightRepository.findAll();
    } catch (error) {
      const message = (error as Error).message;
      this.logger.error('[CloudHydration] Failed to read local highlights', error as Error);
      return { ...this.emptyResult(), error: message };
    }

    const localCountBefore = localHighlights.length;
    const localById = new Map(localHighlights.map((h) => [h.id, h]));
    const cursor = await this.syncCursor.get();

    this.logger.info('[CloudHydration] Starting hydration', {
      userId,
      localCountBefore,
      incremental: !!cursor,
      cursor: cursor?.toISOString(),
    });

    report(12, 'fetching');

    let cloudHighlights: HighlightDataV2[] = [];
    let deletedIds: string[] = [];

    try {
      cloudHighlights = await this.cloudRepository.findChangedSince(cursor);
      deletedIds = await this.cloudRepository.findDeletedIdsSince(cursor);
    } catch (error) {
      const message = (error as Error).message;
      this.logger.error('[CloudHydration] Cloud fetch failed', error as Error, {
        userId,
        localCountBefore,
      });
      return { ...this.emptyResult(localCountBefore), error: message };
    }

    report(20, 'merging');

    if (cloudHighlights.length >= LARGE_LIBRARY_WARN_THRESHOLD) {
      this.logger.warn('[CloudHydration] Large library detected', {
        cloudCount: cloudHighlights.length,
        threshold: LARGE_LIBRARY_WARN_THRESHOLD,
      });
    }

    let backfilledCount = 0;
    let updatedCount = 0;
    let deletedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    let maxUpdatedAt = cursor?.getTime() ?? 0;

    const totalWork = cloudHighlights.length + deletedIds.length;
    let processed = 0;
    const bump = (): void => {
      processed += 1;
      if (totalWork <= 0) return;
      // Merge phase occupies 20% → 90%
      report(20 + (processed / totalWork) * 70, 'merging');
    };

    for (const highlight of cloudHighlights) {
      if (!this.authManager.currentUser) {
        this.logger.warn('[CloudHydration] Auth lost mid-hydration; aborting remaining backfill');
        break;
      }

      const updatedTs = highlightTimestampMs(
        highlight.updatedAt as Date | string | undefined,
        highlight.createdAt as Date | string | undefined
      );
      if (updatedTs > maxUpdatedAt) {
        maxUpdatedAt = updatedTs;
      }

      const local = localById.get(highlight.id);

      try {
        if (!local) {
          await this.highlightRepository.add(highlight, { skipSync: true });
          localById.set(highlight.id, highlight);
          backfilledCount++;
          bump();
          continue;
        }

        if (!isRemoteHighlightNewer(highlight, local)) {
          skippedCount++;
          bump();
          continue;
        }

        await this.highlightRepository.update(highlight.id, highlight, { skipSync: true });
        localById.set(highlight.id, highlight);
        updatedCount++;
      } catch (error) {
        failedCount++;
        this.logger.error('[CloudHydration] Failed to merge highlight', error as Error, {
          id: highlight.id,
        });
      }
      bump();
    }

    for (const id of deletedIds) {
      if (!localById.has(id)) {
        bump();
        continue;
      }

      try {
        await this.highlightRepository.remove(id, { skipSync: true });
        localById.delete(id);
        deletedCount++;
      } catch (error) {
        failedCount++;
        this.logger.error('[CloudHydration] Failed to remove deleted highlight', error as Error, { id });
      }
      bump();
    }

    report(92, 'reloading');

    try {
      await this.repositoryFacade.reload();
    } catch (error) {
      const message = (error as Error).message;
      this.logger.error('[CloudHydration] Facade reload failed after backfill', error as Error);
      return {
        localCountBefore,
        cloudCount: cloudHighlights.length,
        backfilledCount,
        updatedCount,
        deletedCount,
        skippedCount,
        failedCount,
        error: message,
      };
    }

    if (maxUpdatedAt > 0) {
      await this.syncCursor.set(new Date(maxUpdatedAt));
    } else if (!cursor) {
      await this.syncCursor.set(new Date());
    }

    const result: CloudHydrationResult = {
      localCountBefore,
      cloudCount: cloudHighlights.length,
      backfilledCount,
      updatedCount,
      deletedCount,
      skippedCount,
      failedCount,
    };

    this.logger.info('[CloudHydration] Hydration complete', {
      userId,
      ...result,
      finalCacheSize: this.repositoryFacade.count(),
    });

    notifyLibraryDataChanged(result);
    report(100, 'done');

    return result;
  }
}
