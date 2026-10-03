/**
 * @file cloud-hydration-service.ts
 * @description Pulls account highlights from Supabase into local IndexedDB on auth.
 */

import type { IAuthManager } from '@/background/auth/interfaces/i-auth-manager';
import type { SupabaseHighlightRepository } from '@/background/repositories/supabase-highlight-repository';
import type {
  CloudHydrationProgress,
  CloudHydrationResult,
  GroupHydrationStats,
  ICloudHydrationService,
} from '@/background/services/interfaces/i-cloud-hydration-service';
import { notifyLibraryDataChanged } from '@/background/services/library-change-notifier';
import type {
  GroupSyncCursor,
  LibrarySyncCursor,
} from '@/background/services/library-sync-cursor';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { IGroupRepository } from '@/shared/repositories/i-group-repository';
import type { IHighlightRepository } from '@/shared/repositories/i-highlight-repository';
import type { ITagRepository } from '@/shared/repositories/i-tag-repository';
import type { RepositoryFacade } from '@/shared/repositories/repository-facade';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import type { PageGroup, PageGroupItem } from '@/shared/types/page-group';
import { mergeRow } from '@/shared/utils/page-group-merge';
import { tombstonePurgeCutoff } from '@/shared/utils/page-group-purge';
import {
  highlightTimestampMs,
  isRemoteHighlightNewer,
} from '@/shared/utils/supabase-highlight-row';

const LARGE_LIBRARY_WARN_THRESHOLD = 500;

/**
 * Page Groups side of cloud hydration (plan Phase 2 Task 2.3).
 * Structural cloud type keeps this decoupled from the Supabase adapter.
 */
export interface GroupHydrationDeps {
  /** Pro local group store (signed-in partition). */
  proGroupRepository: IGroupRepository;
  cloudGroupRepository: {
    findChangedGroupsSince(since: Date | null): Promise<PageGroup[]>;
    findChangedItemsSince(since: Date | null): Promise<PageGroupItem[]>;
    /**
     * Client-fallback cloud purge (Task 2.4). Optional so highlight-only
     * tests and fakes stay structural; the live SupabaseGroupRepository
     * provides it and the tombstone-only DELETE policy authorizes it.
     */
    purgeTombstones?(olderThan: Date): Promise<number>;
  };
  groupSyncCursor: GroupSyncCursor;
}

export class CloudHydrationService implements ICloudHydrationService {
  private hydrationInFlight: Promise<CloudHydrationResult> | null = null;

  constructor(
    private readonly authManager: IAuthManager,
    private readonly highlightRepository: IHighlightRepository,
    private readonly cloudRepository: SupabaseHighlightRepository,
    private readonly repositoryFacade: RepositoryFacade,
    private readonly syncCursor: LibrarySyncCursor,
    private readonly logger: ILogger,
    private readonly localTags?: ITagRepository,
    private readonly cloudTags?: ITagRepository,
    /**
     * Optional Page Groups hydration (Task 2.3). Absent = highlights-only,
     * preserving the pre-groups behavior.
     */
    private readonly groupDeps?: GroupHydrationDeps
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

  isHydrating(): boolean {
    return this.hydrationInFlight !== null;
  }

  async awaitHydration(): Promise<void> {
    if (this.hydrationInFlight) {
      try {
        await this.hydrationInFlight;
      } catch {
        // ignore hydration errors — callers will read whatever is available
      }
    }
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

  private async runHydrate(
    onProgress?: CloudHydrationProgress
  ): Promise<CloudHydrationResult> {
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
      this.logger.error(
        '[CloudHydration] Failed to read local highlights',
        error as Error
      );
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
        this.logger.warn(
          '[CloudHydration] Auth lost mid-hydration; aborting remaining backfill'
        );
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

        await this.highlightRepository.update(highlight.id, highlight, {
          skipSync: true,
        });
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
        this.logger.error(
          '[CloudHydration] Failed to remove deleted highlight',
          error as Error,
          { id }
        );
      }
      bump();
    }

    report(88, 'groups');
    const groupStats = await this.hydrateGroups();

    report(90, 'tags');
    await this.hydrateTags(Array.from(localById.keys()));

    report(92, 'reloading');

    try {
      await this.repositoryFacade.reload();
    } catch (error) {
      const message = (error as Error).message;
      this.logger.error(
        '[CloudHydration] Facade reload failed after backfill',
        error as Error
      );
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
      ...(groupStats ? { groups: groupStats } : {}),
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

  /**
   * Incremental Page Groups pull (`updated_at >= cursor`, tombstones
   * included). Each remote row is resolved against local with the Task 1.2
   * `mergeRow` and written straight to the Pro store — the same skipSync
   * semantics as the highlight path (GroupService dual-write is bypassed).
   * Runs on sign-in hydrate, on realtime connect, and on SYNC_LIBRARY,
   * because all three funnel through hydrate().
   */
  private async hydrateGroups(): Promise<GroupHydrationStats | null> {
    const stats: GroupHydrationStats = {
      backfilled: 0,
      updated: 0,
      deleted: 0,
      skipped: 0,
      failed: 0,
    };

    const deps = this.groupDeps;
    if (!deps || !this.authManager.currentUser) {
      return null;
    }

    const cursor = await deps.groupSyncCursor.get();
    this.logger.info('[CloudHydration] Starting groups hydration', {
      incremental: !!cursor,
      cursor: cursor?.toISOString(),
    });

    let cloudGroups: PageGroup[] = [];
    let cloudItems: PageGroupItem[] = [];
    try {
      cloudGroups = await deps.cloudGroupRepository.findChangedGroupsSince(cursor);
      cloudItems = await deps.cloudGroupRepository.findChangedItemsSince(cursor);
    } catch (error) {
      this.logger.error('[CloudHydration] Group fetch failed', error as Error);
      return { ...stats, failed: 1 };
    }

    let maxUpdatedAt = cursor?.getTime() ?? 0;
    const touch = (updatedAt: string): void => {
      const parsed = Date.parse(updatedAt);
      if (!Number.isNaN(parsed) && parsed > maxUpdatedAt) {
        maxUpdatedAt = parsed;
      }
    };

    for (const remote of cloudGroups) {
      if (!this.authManager.currentUser) {
        this.logger.warn('[CloudHydration] Auth lost mid-hydration; aborting groups');
        break;
      }
      touch(remote.updatedAt);
      try {
        const local = await deps.proGroupRepository.getGroup(remote.id);
        if (!local) {
          await deps.proGroupRepository.putGroup(remote);
          stats.backfilled++;
          continue;
        }
        if (mergeRow(local, remote) !== remote) {
          stats.skipped++;
          continue;
        }
        await deps.proGroupRepository.putGroup(remote);
        if (remote.deletedAt !== null) {
          stats.deleted++;
        } else {
          stats.updated++;
        }
      } catch (error) {
        stats.failed++;
        this.logger.error('[CloudHydration] Failed to merge group', error as Error, {
          id: remote.id,
        });
      }
    }

    for (const remote of cloudItems) {
      if (!this.authManager.currentUser) {
        this.logger.warn('[CloudHydration] Auth lost mid-hydration; aborting groups');
        break;
      }
      touch(remote.updatedAt);
      try {
        const siblings = await deps.proGroupRepository.listItems(remote.groupId, {
          includeDeleted: true,
        });
        const local = siblings.find((candidate) => candidate.id === remote.id);
        if (!local) {
          await deps.proGroupRepository.putItem(remote);
          stats.backfilled++;
          continue;
        }
        if (mergeRow(local, remote) !== remote) {
          stats.skipped++;
          continue;
        }
        await deps.proGroupRepository.putItem(remote);
        if (remote.deletedAt !== null) {
          stats.deleted++;
        } else {
          stats.updated++;
        }
      } catch (error) {
        stats.failed++;
        this.logger.error('[CloudHydration] Failed to merge group item', error as Error, {
          id: remote.id,
        });
      }
    }

    if (maxUpdatedAt > 0) {
      await deps.groupSyncCursor.set(new Date(maxUpdatedAt));
    } else if (!cursor) {
      await deps.groupSyncCursor.set(new Date());
    }

    // Task 2.4 client fallback: hard-delete locally- and cloud-expired
    // tombstones after every groups hydration. Best-effort — purge failures
    // are logged and never fail hydration (rows are retried next hydrate).
    // Safe in both worlds: a no-op when the pg_cron server purge already ran.
    await this.purgeExpiredGroupTombstones(deps);

    this.logger.info('[CloudHydration] Groups hydration complete', { ...stats });
    return stats;
  }

  private async purgeExpiredGroupTombstones(deps: GroupHydrationDeps): Promise<void> {
    const cutoff = tombstonePurgeCutoff(new Date());
    try {
      await deps.proGroupRepository.purgeTombstones(cutoff);
    } catch (error) {
      this.logger.warn('[CloudHydration] Local group tombstone purge failed', {
        error: (error as Error).message,
      });
    }
    try {
      await deps.cloudGroupRepository.purgeTombstones?.(cutoff);
    } catch (error) {
      this.logger.warn('[CloudHydration] Cloud group tombstone purge failed', {
        error: (error as Error).message,
      });
    }
  }

  private async hydrateTags(highlightIds: string[]): Promise<void> {
    if (!this.localTags || !this.cloudTags || highlightIds.length === 0) {
      return;
    }
    if (!this.authManager.currentUser) {
      return;
    }

    const CHUNK = 100;
    for (let i = 0; i < highlightIds.length; i += CHUNK) {
      const chunk = highlightIds.slice(i, i + CHUNK);
      let cloudLabels: Map<string, string[]>;
      try {
        cloudLabels = await this.cloudTags.getLabelsForHighlights(chunk);
      } catch (error) {
        this.logger.error('[CloudHydration] Tag fetch failed', error as Error);
        return;
      }

      for (const [id, names] of cloudLabels) {
        if (names.length === 0) continue;
        try {
          await this.localTags.setHighlightLabels(id, names);
        } catch (error) {
          this.logger.error('[CloudHydration] Failed to backfill tags', error as Error, {
            id,
          });
        }
      }
    }
  }
}
