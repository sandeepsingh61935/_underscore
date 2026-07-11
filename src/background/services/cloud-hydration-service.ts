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
import { isRemoteHighlightNewer } from '@/shared/utils/supabase-highlight-row';
import { notifyLibraryDataChanged } from '@/background/services/library-change-notifier';
import type { LibrarySyncCursor } from '@/background/services/library-sync-cursor';
import type {
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

  hydrate(): Promise<CloudHydrationResult> {
    if (this.hydrationInFlight) {
      return this.hydrationInFlight;
    }

    this.hydrationInFlight = this.runHydrate().finally(() => {
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

  private async runHydrate(): Promise<CloudHydrationResult> {
    if (!this.authManager.currentUser) {
      this.logger.debug('[CloudHydration] Skipping hydration (not authenticated)');
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

    for (const highlight of cloudHighlights) {
      if (!this.authManager.currentUser) {
        this.logger.warn('[CloudHydration] Auth lost mid-hydration; aborting remaining backfill');
        break;
      }

      const updatedTs = highlight.updatedAt?.getTime() ?? new Date(highlight.createdAt).getTime();
      if (updatedTs > maxUpdatedAt) {
        maxUpdatedAt = updatedTs;
      }

      const local = localById.get(highlight.id);

      try {
        if (!local) {
          await this.highlightRepository.add(highlight, { skipSync: true });
          localById.set(highlight.id, highlight);
          backfilledCount++;
          continue;
        }

        if (!isRemoteHighlightNewer(highlight, local)) {
          skippedCount++;
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
    }

    for (const id of deletedIds) {
      if (!localById.has(id)) {
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
    }

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

    return result;
  }
}
