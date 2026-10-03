/**
 * @file offline-queue-group-entity.test.ts
 * @description TDD contract for Task 2.2: OfflineQueueService replays queued
 * `group` / `group_item` operations against the Supabase group repository.
 * Highlight behavior is unchanged (entity defaults to `highlight`).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { deleteDB, openDB } from 'idb';

import type { IAuthManager, User } from '@/background/auth/interfaces/i-auth-manager';
import type { SupabaseHighlightRepository } from '@/background/repositories/supabase-highlight-repository';
import { OfflineQueueService } from '@/background/services/offline-queue-service';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { IGroupRepository } from '@/shared/repositories/i-group-repository';

const DB_NAME = 'underscore_offline_queue';

const GROUP_ROW = {
  id: 'g-1',
  name: 'Research',
  color: 'blue' as const,
  position: 'a0',
  boundDeviceId: null,
  boundDeviceLabel: null,
  boundBrowser: null,
  boundAt: null,
  createdAt: '2026-09-28T10:00:00.000Z',
  updatedAt: '2026-09-28T10:00:00.000Z',
  deletedAt: null,
};

const ITEM_ROW = {
  id: 'i-1',
  kind: 'page' as const,
  groupId: 'g-1',
  position: 'a0',
  urlNormalized: 'https://example.com/a',
  title: null,
  faviconUrl: null,
  createdAt: '2026-09-28T10:00:00.000Z',
  updatedAt: '2026-09-28T10:00:00.000Z',
  deletedAt: null,
};

describe('OfflineQueueService group entities', () => {
  let service: OfflineQueueService;
  let mockCloudRepo: { add: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };
  let mockGroupRepo: { putGroup: ReturnType<typeof vi.fn>; putItem: ReturnType<typeof vi.fn> };
  let mockAuthManager: { currentUser: User };
  let mockLogger: { debug: ReturnType<typeof vi.fn>; info: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockCloudRepo = { add: vi.fn(), update: vi.fn(), remove: vi.fn() };
    mockGroupRepo = { putGroup: vi.fn(), putItem: vi.fn() };
    mockAuthManager = { currentUser: { id: 'user-1' } as User };
    mockLogger = { debug: vi.fn(), info: vi.fn(), error: vi.fn() };

    await deleteDB(DB_NAME);
    service = new OfflineQueueService(
      mockCloudRepo as unknown as SupabaseHighlightRepository,
      mockAuthManager as unknown as IAuthManager,
      mockLogger as unknown as ILogger,
      mockGroupRepo as unknown as IGroupRepository
    );
  });

  afterEach(async () => {
    await service.close();
    vi.clearAllMocks();
    await deleteDB(DB_NAME);
  });

  it('enqueues group operations with the group entity discriminator', async () => {
    await service.enqueue('update', GROUP_ROW.id, GROUP_ROW, 'group');

    const db = await openDB(DB_NAME, 1);
    const all = await db.getAll('queue');
    db.close();

    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ type: 'update', targetId: 'g-1', entity: 'group' });
  });

  it('replays queued group puts against the group cloud repository', async () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

    await service.enqueue('update', GROUP_ROW.id, GROUP_ROW, 'group');
    await service.enqueue('update', ITEM_ROW.id, ITEM_ROW, 'group_item');

    await service.processQueue();

    expect(mockGroupRepo.putGroup).toHaveBeenCalledWith(GROUP_ROW);
    expect(mockGroupRepo.putItem).toHaveBeenCalledWith(ITEM_ROW);
    expect(mockCloudRepo.add).not.toHaveBeenCalled();
    expect(await service.size()).toBe(0);
  });

  it('keeps legacy highlight operations on the highlight repository', async () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

    await service.enqueue('add', 'hl-1', { text: 'foo' });

    await service.processQueue();

    expect(mockCloudRepo.add).toHaveBeenCalledWith({ text: 'foo' });
    expect(mockGroupRepo.putGroup).not.toHaveBeenCalled();
    expect(await service.size()).toBe(0);
  });
});
