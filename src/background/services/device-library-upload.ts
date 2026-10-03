/**
 * @file device-library-upload.ts
 * @description Copy Guest (Basic) library rows not already in the account
 * into Pro local + Supabase. Does not move Basic rows.
 *
 * Page Groups (ADR-032 §2 guest-to-account) join the existing highlight flow:
 * guest groups matched by name + color are skipped; pending groups are copied
 * first with new ids (positions/colors preserved, bindings cleared,
 * tombstones excluded), then their items whose item key (page: urlNormalized,
 * domain: hostname) is not yet in the account are copied under the new group
 * ids. Basic copies are kept.
 */

import type { IAuthManager } from '@/background/auth/interfaces/i-auth-manager';
import { isGroupCapFailure } from '@/background/repositories/supabase-group-repository';
import type {
  DeviceLibraryUploadPreview,
  DeviceLibraryUploadResult,
  IDeviceLibraryUpload,
} from '@/background/services/interfaces/i-device-library-upload';
import { notifyLibraryDataChanged } from '@/background/services/library-change-notifier';
import type { OfflineQueueService } from '@/background/services/offline-queue-service';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { IGroupRepository } from '@/shared/repositories/i-group-repository';
import type { IHighlightRepository } from '@/shared/repositories/i-highlight-repository';
import type { ITagRepository } from '@/shared/repositories/i-tag-repository';
import type { RepositoryFacade } from '@/shared/repositories/repository-facade';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import type { PageGroup, PageGroupItem } from '@/shared/types/page-group';
import { normalizePageUrl } from '@/shared/utils/normalize-page-url';

function duplicateKey(highlight: HighlightDataV2): string {
  return `${highlight.contentHash}::${highlight.url ?? ''}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function groupMatchKey(name: string, color: string): string {
  return `${name.trim().toLowerCase()}::${color}`;
}

function groupItemKey(item: PageGroupItem): string {
  if (item.kind === 'page') {
    return `page::${normalizePageUrl(item.urlNormalized)}`;
  }
  return `domain::${item.hostname.trim().toLowerCase()}`;
}

function emptyResult(): DeviceLibraryUploadResult {
  return {
    copiedCount: 0,
    skippedCount: 0,
    failedCount: 0,
    tagsCopiedCount: 0,
    groupsCopiedCount: 0,
    groupItemsCopiedCount: 0,
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
    private readonly basicGroups: IGroupRepository,
    private readonly proGroups: IGroupRepository,
    private readonly cloudGroups: IGroupRepository,
    private readonly offlineQueue: Pick<OfflineQueueService, 'processQueue' | 'enqueue'>,
    private readonly repositoryFacade: Pick<RepositoryFacade, 'reload'>,
    private readonly logger: ILogger
  ) {}

  async preview(): Promise<DeviceLibraryUploadPreview> {
    const email = this.authManager.currentUser?.email ?? null;
    if (!this.authManager.currentUser) {
      return {
        pendingCount: 0,
        pendingGroupCount: 0,
        pendingGroupItemCount: 0,
        email: null,
      };
    }

    const [pendingHighlights, guestGroups, accountGroups, accountItems] =
      await Promise.all([
        this.pendingGuestRows(),
        this.basicGroups.listGroups(),
        this.proGroups.listGroups(),
        this.proGroups.listAllItems(),
      ]);

    const accountGroupKeys = new Set(
      accountGroups.map((g) => groupMatchKey(g.name, g.color))
    );
    const pendingGroups = guestGroups.filter(
      (g) => !accountGroupKeys.has(groupMatchKey(g.name, g.color))
    );

    const accountItemKeys = new Set(accountItems.map(groupItemKey));
    let pendingGroupItemCount = 0;

    for (const g of pendingGroups) {
      const items = await this.basicGroups.listItems(g.id);
      const seenInGroup = new Set<string>();
      for (const item of items) {
        const key = groupItemKey(item);
        if (!accountItemKeys.has(key) && !seenInGroup.has(key)) {
          seenInGroup.add(key);
          pendingGroupItemCount++;
        }
      }
    }

    return {
      pendingCount: pendingHighlights.length,
      pendingGroupCount: pendingGroups.length,
      pendingGroupItemCount,
      email,
    };
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
          this.logger.error('[DeviceUpload] Cloud tag write failed', tagError as Error, {
            id: row.id,
          });
        }
        result.tagsCopiedCount++;
      } catch (error) {
        this.logger.error('[DeviceUpload] Tag copy failed', error as Error, {
          id: row.id,
        });
      }
    }

    try {
      const [guestGroups, accountGroups, accountItems] = await Promise.all([
        this.basicGroups.listGroups(),
        this.proGroups.listGroups(),
        this.proGroups.listAllItems(),
      ]);

      const accountGroupKeys = new Set(
        accountGroups.map((g) => groupMatchKey(g.name, g.color))
      );
      const pendingGroups = guestGroups.filter(
        (g) => !accountGroupKeys.has(groupMatchKey(g.name, g.color))
      );

      const accountItemKeys = new Set(accountItems.map(groupItemKey));

      for (const g of pendingGroups) {
        const now = nowIso();
        const newGroup: PageGroup = {
          id: crypto.randomUUID(),
          name: g.name,
          color: g.color,
          position: g.position,
          boundDeviceId: null,
          boundDeviceLabel: null,
          boundBrowser: null,
          boundAt: null,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        };

        let groupCloudSkippedDueToCap = false;
        try {
          await this.proGroups.putGroup(newGroup);
          try {
            await this.cloudGroups.putGroup(newGroup);
          } catch (cloudError) {
            if (isGroupCapFailure(cloudError)) {
              groupCloudSkippedDueToCap = true;
              this.logger.warn(
                '[DeviceUpload] Group cap exceeded; group skipped for cloud',
                {
                  id: newGroup.id,
                  name: newGroup.name,
                }
              );
            } else {
              this.logger.error(
                '[DeviceUpload] Cloud group write failed; queued',
                cloudError as Error,
                { id: newGroup.id }
              );
              await this.offlineQueue.enqueue('add', newGroup.id, newGroup, 'group');
            }
          }
          result.groupsCopiedCount++;
        } catch (groupError) {
          this.logger.error(
            '[DeviceUpload] Failed to copy group to pro',
            groupError as Error,
            { id: g.id }
          );
          continue;
        }

        const guestItems = await this.basicGroups.listItems(g.id);
        const seenInGroup = new Set<string>();
        const pendingItems = guestItems.filter((item) => {
          const key = groupItemKey(item);
          if (accountItemKeys.has(key) || seenInGroup.has(key)) {
            return false;
          }
          seenInGroup.add(key);
          return true;
        });

        for (const item of pendingItems) {
          const itemNow = nowIso();
          const newItem: PageGroupItem = {
            ...item,
            id: crypto.randomUUID(),
            groupId: newGroup.id,
            createdAt: itemNow,
            updatedAt: itemNow,
            deletedAt: null,
          };

          try {
            await this.proGroups.putItem(newItem);
            if (groupCloudSkippedDueToCap) {
              this.logger.warn(
                '[DeviceUpload] Parent group skipped for cloud due to cap; skipping cloud write and queueing for item',
                { id: newItem.id, groupId: newGroup.id }
              );
            } else {
              try {
                await this.cloudGroups.putItem(newItem);
              } catch (cloudError) {
                if (isGroupCapFailure(cloudError)) {
                  this.logger.warn(
                    '[DeviceUpload] Group item cap exceeded; item skipped for cloud',
                    { id: newItem.id }
                  );
                } else {
                  this.logger.error(
                    '[DeviceUpload] Cloud group item write failed; queued',
                    cloudError as Error,
                    { id: newItem.id }
                  );
                  await this.offlineQueue.enqueue(
                    'add',
                    newItem.id,
                    newItem,
                    'group_item'
                  );
                }
              }
            }
            result.groupItemsCopiedCount++;
          } catch (itemError) {
            this.logger.error(
              '[DeviceUpload] Failed to copy group item to pro',
              itemError as Error,
              { id: item.id }
            );
          }
        }
      }
    } catch (groupUploadError) {
      this.logger.error(
        '[DeviceUpload] Failed during group upload',
        groupUploadError as Error
      );
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
