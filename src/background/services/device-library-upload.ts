/**
 * @file device-library-upload.ts
 * @description Copy Guest (Basic) library rows not already in the account
 * into Pro local + Supabase. Does not move Basic rows.
 */

import type { IAuthManager } from '@/background/auth/interfaces/i-auth-manager';
import type {
  DeviceLibraryUploadPreview,
  DeviceLibraryUploadResult,
  IDeviceLibraryUpload,
} from '@/background/services/interfaces/i-device-library-upload';
import { notifyLibraryDataChanged } from '@/background/services/library-change-notifier';
import type { OfflineQueueService } from '@/background/services/offline-queue-service';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { IHighlightRepository } from '@/shared/repositories/i-highlight-repository';
import type { ITagRepository } from '@/shared/repositories/i-tag-repository';
import type { RepositoryFacade } from '@/shared/repositories/repository-facade';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';

function duplicateKey(highlight: HighlightDataV2): string {
  return `${highlight.contentHash}::${highlight.url ?? ''}`;
}

function emptyResult(): DeviceLibraryUploadResult {
  return {
    copiedCount: 0,
    skippedCount: 0,
    failedCount: 0,
    tagsCopiedCount: 0,
    queueFlushed: false,
  };
}

export class DeviceLibraryUpload implements IDeviceLibraryUpload {
  private inFlight: Promise<DeviceLibraryUploadResult> | null = null;

  constructor(
    private readonly authManager: IAuthManager,
    private readonly basicHighlights: IHighlightRepository,
    private readonly proHighlights: IHighlightRepository,
    private readonly cloudHighlights: IHighlightRepository,
    private readonly basicTags: ITagRepository,
    private readonly proTags: ITagRepository,
    private readonly cloudTags: ITagRepository,
    private readonly offlineQueue: Pick<OfflineQueueService, 'processQueue' | 'enqueue'>,
    private readonly repositoryFacade: Pick<RepositoryFacade, 'reload'>,
    private readonly logger: ILogger
  ) {}

  async preview(): Promise<DeviceLibraryUploadPreview> {
    const email = this.authManager.currentUser?.email ?? null;
    if (!this.authManager.currentUser) {
      return { pendingCount: 0, email: null };
    }

    const pending = await this.pendingGuestRows();
    return { pendingCount: pending.length, email };
  }

  upload(): Promise<DeviceLibraryUploadResult> {
    if (this.inFlight) {
      return this.inFlight;
    }
    this.inFlight = this.runUpload().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async pendingGuestRows(): Promise<HighlightDataV2[]> {
    const [guestRows, accountRows] = await Promise.all([
      this.basicHighlights.findAll(),
      this.proHighlights.findAll(),
    ]);
    const accountIds = new Set(accountRows.map((row) => row.id));
    const accountKeys = new Set(accountRows.map(duplicateKey));
    return guestRows.filter(
      (row) => !accountIds.has(row.id) && !accountKeys.has(duplicateKey(row))
    );
  }

  private async runUpload(): Promise<DeviceLibraryUploadResult> {
    const result = emptyResult();
    const user = this.authManager.currentUser;
    if (!user) {
      return { ...result, error: 'Sign in to upload from this device' };
    }

    let pending: HighlightDataV2[] = [];
    try {
      pending = await this.pendingGuestRows();
    } catch (error) {
      const message = (error as Error).message;
      this.logger.error('[DeviceUpload] Failed to read guest library', error as Error);
      return { ...result, error: message };
    }

    const guestAll = await this.basicHighlights.findAll();
    result.skippedCount = guestAll.length - pending.length;

    for (const row of pending) {
      const stamped: HighlightDataV2 = { ...row, userId: user.id };
      try {
        await this.proHighlights.add(stamped);
        try {
          await this.cloudHighlights.add(stamped);
        } catch (cloudError) {
          this.logger.error(
            '[DeviceUpload] Cloud write failed; queued',
            cloudError as Error,
            { id: row.id }
          );
          await this.offlineQueue.enqueue('add', row.id, stamped);
        }
        result.copiedCount++;
      } catch (error) {
        result.failedCount++;
        this.logger.error('[DeviceUpload] Failed to copy highlight', error as Error, {
          id: row.id,
        });
        continue;
      }

      try {
        const labels = await this.basicTags.getLabelsForHighlight(row.id);
        if (labels.length === 0) continue;
        await this.proTags.setHighlightLabels(row.id, labels);
        try {
          await this.cloudTags.setHighlightLabels(row.id, labels);
        } catch (tagError) {
          this.logger.error(
            '[DeviceUpload] Cloud tag write failed',
            tagError as Error,
            { id: row.id }
          );
        }
        result.tagsCopiedCount++;
      } catch (error) {
        this.logger.error('[DeviceUpload] Tag copy failed', error as Error, {
          id: row.id,
        });
      }
    }

    try {
      await this.offlineQueue.processQueue();
      result.queueFlushed = true;
    } catch (error) {
      this.logger.error('[DeviceUpload] Queue flush failed', error as Error);
    }

    try {
      await this.repositoryFacade.reload();
    } catch (error) {
      this.logger.error('[DeviceUpload] Facade reload failed', error as Error);
    }

    notifyLibraryDataChanged({ source: 'device_upload' });

    this.logger.info('[DeviceUpload] Upload complete', result);
    return result;
  }
}
