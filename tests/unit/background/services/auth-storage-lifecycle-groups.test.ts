/**
 * @file auth-storage-lifecycle-groups.test.ts
 * @description Task 2.3: sign-out wipe also clears the Pro group stores and
 * the groups cursor; sign-in is unaffected when they are absent.
 */

import { describe, expect, it, vi } from 'vitest';

import { handleAuthStorageEvent } from '@/background/services/auth-storage-lifecycle';
import { InMemoryHighlightRepository } from '@/shared/repositories/in-memory-highlight-repository';
import { ScopedHighlightRepository } from '@/shared/repositories/scoped-highlight-repository';
import { RepositoryFacade } from '@/shared/repositories/repository-facade';
import type { PageGroup, PageGroupItem } from '@/shared/types/page-group';

vi.mock('@/background/services/library-change-notifier', () => ({
  notifyLibraryDataChanged: vi.fn(),
}));

class InMemoryGroupStore {
  readonly groups = new Map<string, PageGroup>();
  readonly items = new Map<string, PageGroupItem>();
  readonly clearGroups = vi.fn(async () => {
    this.groups.clear();
    this.items.clear();
  });
}

function seedGroup(store: InMemoryGroupStore): void {
  const now = new Date().toISOString();
  store.groups.set('g-1', {
    id: 'g-1',
    name: 'Pro group',
    color: 'blue',
    position: 'a0',
    boundDeviceId: null,
    boundDeviceLabel: null,
    boundBrowser: null,
    boundAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });
}

describe('handleAuthStorageEvent group wipe', () => {
  it('on sign-out clears Pro groups and the groups cursor', async () => {
    const basic = new InMemoryHighlightRepository();
    const pro = new InMemoryHighlightRepository();
    const scoped = new ScopedHighlightRepository(basic, pro, 'pro');
    const facade = new RepositoryFacade(scoped);
    await facade.initialize();

    const proGroups = new InMemoryGroupStore();
    seedGroup(proGroups);
    const groupSyncCursor = { clear: vi.fn().mockResolvedValue(undefined) };

    await handleAuthStorageEvent(
      { type: 'SIGNED_OUT' },
      {
        scopedRepository: scoped,
        repositoryFacade: facade,
        persistGuestMode: vi.fn().mockResolvedValue(undefined),
        proGroupStore: proGroups,
        groupSyncCursor,
      }
    );

    expect(proGroups.clearGroups).toHaveBeenCalled();
    expect(proGroups.groups.size).toBe(0);
    expect(groupSyncCursor.clear).toHaveBeenCalled();
  });

  it('on sign-out works when group deps are absent', async () => {
    const basic = new InMemoryHighlightRepository();
    const pro = new InMemoryHighlightRepository();
    const scoped = new ScopedHighlightRepository(basic, pro, 'pro');
    const facade = new RepositoryFacade(scoped);
    await facade.initialize();

    await expect(
      handleAuthStorageEvent(
        { type: 'SIGNED_OUT' },
        {
          scopedRepository: scoped,
          repositoryFacade: facade,
          persistGuestMode: vi.fn().mockResolvedValue(undefined),
        }
      )
    ).resolves.toBeUndefined();
  });
});
