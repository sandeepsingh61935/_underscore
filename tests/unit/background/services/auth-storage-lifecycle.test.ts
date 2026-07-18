import { describe, expect, it, vi } from 'vitest';

import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import { InMemoryHighlightRepository } from '@/shared/repositories/in-memory-highlight-repository';
import { ScopedHighlightRepository } from '@/shared/repositories/scoped-highlight-repository';
import { RepositoryFacade } from '@/shared/repositories/repository-facade';
import {
  handleAuthStorageEvent,
} from '@/background/services/auth-storage-lifecycle';

vi.mock('@/background/services/library-change-notifier', () => ({
  notifyLibraryDataChanged: vi.fn(),
}));

import { notifyLibraryDataChanged } from '@/background/services/library-change-notifier';

function makeHighlight(id: string): HighlightDataV2 {
  return {
    id,
    text: `text-${id}`,
    contentHash: id.padEnd(64, 'a'),
    colorRole: 'yellow',
    type: 'underscore',
    ranges: [
      {
        xpath: '/p',
        startOffset: 0,
        endOffset: 4,
        text: 'text',
        textBefore: '',
        textAfter: '',
      },
    ],
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2024-06-02'),
    url: 'https://example.com',
  };
}

describe('handleAuthStorageEvent', () => {
  it('on sign-out wipes pro local store and switches library to basic', async () => {
    const basic = new InMemoryHighlightRepository();
    const pro = new InMemoryHighlightRepository();
    const scoped = new ScopedHighlightRepository(basic, pro, 'pro');
    const facade = new RepositoryFacade(scoped);
    await facade.initialize();

    await basic.add(makeHighlight('basic-guest'));
    await pro.add(makeHighlight('pro-account'));

    const syncCursor = { clear: vi.fn().mockResolvedValue(undefined) };
    const echoTracker = { clear: vi.fn() };

    await handleAuthStorageEvent(
      { type: 'SIGNED_OUT' },
      { scopedRepository: scoped, repositoryFacade: facade, syncCursor, echoTracker },
    );

    expect(await pro.count()).toBe(0);
    expect(await basic.count()).toBe(1);
    expect(scoped.getActiveScope()).toBe('basic');
    expect(facade.getAll()).toHaveLength(1);
    expect(facade.getAll()[0]?.id).toBe('basic-guest');
    expect(syncCursor.clear).toHaveBeenCalled();
    expect(echoTracker.clear).toHaveBeenCalled();
    expect(notifyLibraryDataChanged).toHaveBeenCalledWith({
      source: 'auth_sign_out',
      deletedCount: 1,
      removedIds: ['pro-account'],
    });
  });

  it('on sign-in activates pro scope before hydration', async () => {
    const basic = new InMemoryHighlightRepository();
    const pro = new InMemoryHighlightRepository();
    const scoped = new ScopedHighlightRepository(basic, pro, 'basic');

    await basic.add(makeHighlight('basic-guest'));

    const hydrate = vi.fn().mockResolvedValue({
      localCountBefore: 0,
      cloudCount: 1,
      backfilledCount: 1,
      updatedCount: 0,
      deletedCount: 0,
      skippedCount: 0,
      failedCount: 0,
    });

    await handleAuthStorageEvent(
      { type: 'SIGNED_IN', userId: 'user-1' },
      {
        scopedRepository: scoped,
        repositoryFacade: new RepositoryFacade(scoped),
        cloudHydration: { hydrate },
      },
    );

    expect(scoped.getActiveScope()).toBe('pro');
    expect(hydrate).toHaveBeenCalled();
    expect(await basic.count()).toBe(1);
  });

  it('on sign-in reloads facade even when cloud hydrate fails', async () => {
    const basic = new InMemoryHighlightRepository();
    const pro = new InMemoryHighlightRepository();
    await pro.add(makeHighlight('pro-local'));
    const scoped = new ScopedHighlightRepository(basic, pro, 'basic');
    const facade = new RepositoryFacade(scoped);
    await facade.initialize(); // loads basic (empty) into cache

    const hydrate = vi.fn().mockRejectedValue(new Error('network down'));
    const reloadSpy = vi.spyOn(facade, 'reload');

    await handleAuthStorageEvent(
      { type: 'SIGNED_IN', userId: 'user-1' },
      {
        scopedRepository: scoped,
        repositoryFacade: facade,
        cloudHydration: { hydrate },
      },
    );

    expect(scoped.getActiveScope()).toBe('pro');
    expect(hydrate).toHaveBeenCalled();
    expect(reloadSpy).toHaveBeenCalled();
    // After reload with pro scope, pro-local must be visible to library/restore
    expect(facade.getAll().map((h) => h.id)).toContain('pro-local');
  });
});
