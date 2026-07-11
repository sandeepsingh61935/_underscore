/**
 * @file cloud-hydration-service.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { browser } from 'wxt/browser';
import { CloudHydrationService } from '@/background/services/cloud-hydration-service';
import { DualWriteRepository } from '@/background/repositories/dual-write-repository';
import { LocalWriteEchoTracker } from '@/background/services/local-write-echo-tracker';
import { RepositoryFacade } from '@/shared/repositories/repository-facade';
import { HighlightQueryService } from '@/shared/services/highlight-query-service';
import type { IHighlightRepository } from '@/shared/repositories/i-highlight-repository';
import type { SupabaseHighlightRepository } from '@/background/repositories/supabase-highlight-repository';
import type { IAuthManager } from '@/background/auth/interfaces/i-auth-manager';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import type { OfflineQueueService } from '@/background/services/offline-queue-service';
import type { LibrarySyncCursor } from '@/background/services/library-sync-cursor';
import { LIBRARY_DATA_CHANGED } from '@/shared/schemas/message-schemas';

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      sendMessage: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

const USER_ID = '11111111-1111-4111-8111-111111111111';

function makeHighlight(id: string, url: string, updatedAt?: Date): HighlightDataV2 {
  return {
    id,
    text: `text-${id}`,
    contentHash: id.replace(/-/g, '').slice(0, 32).padEnd(64, 'a'),
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
    updatedAt: updatedAt ?? new Date('2024-06-02'),
    url,
    userId: USER_ID,
  };
}

function makeCloudHighlights(): HighlightDataV2[] {
  return [
    makeHighlight('22222222-2222-4222-8222-222222222222', 'https://example.com/a'),
    makeHighlight('33333333-3333-4333-8333-333333333333', 'https://example.com/b'),
    makeHighlight('44444444-4444-4444-8444-444444444444', 'https://other.com/c'),
  ];
}

function makeSilentLogger(): ILogger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setLevel: vi.fn(),
    getLevel: vi.fn(),
  };
}

function makeAuthManager(authenticated: boolean): IAuthManager {
  return {
    isAuthenticated: authenticated,
    currentUser: authenticated
      ? {
          id: USER_ID,
          email: 'user@example.com',
          displayName: 'User',
        }
      : null,
    initialize: vi.fn().mockResolvedValue(undefined),
    signIn: vi.fn(),
    signInWithEmail: vi.fn(),
    signUpWithEmail: vi.fn(),
    signOut: vi.fn(),
    refreshToken: vi.fn(),
    getAuthState: vi.fn(),
    onAuthStateChanged: vi.fn(),
    clearVerificationState: vi.fn(),
    setSession: vi.fn(),
  };
}

describe('CloudHydrationService.hydrate()', () => {
  let localStore: HighlightDataV2[];
  let localRepo: IHighlightRepository;
  let cloudRepo: SupabaseHighlightRepository;
  let dualWriteRepo: DualWriteRepository;
  let facade: RepositoryFacade;
  let authManager: IAuthManager;
  let logger: ILogger;
  let service: CloudHydrationService;
  let cloudFindChanged: ReturnType<typeof vi.fn>;
  let cloudFindDeleted: ReturnType<typeof vi.fn>;
  let syncCursor: LibrarySyncCursor;

  beforeEach(() => {
    vi.mocked(browser.runtime.sendMessage).mockClear();
    localStore = [];
    cloudFindChanged = vi.fn().mockResolvedValue(makeCloudHighlights());
    cloudFindDeleted = vi.fn().mockResolvedValue([]);

    localRepo = {
      findAll: vi.fn(async () => [...localStore]),
      findById: vi.fn(async (id) => localStore.find((h) => h.id === id) ?? null),
      findByUrl: vi.fn(),
      findByContentHash: vi.fn(),
      findOverlapping: vi.fn(),
      count: vi.fn(async () => localStore.length),
      exists: vi.fn(async (id) => localStore.some((h) => h.id === id)),
      add: vi.fn(async (h: HighlightDataV2) => {
        localStore.push(h);
      }),
      update: vi.fn(async (id, updates) => {
        const index = localStore.findIndex((h) => h.id === id);
        if (index >= 0) {
          localStore[index] = { ...localStore[index]!, ...updates };
        }
      }),
      remove: vi.fn(async (id) => {
        localStore = localStore.filter((h) => h.id !== id);
      }),
      clear: vi.fn(),
      addMany: vi.fn(),
    };

    cloudRepo = {
      findChangedSince: cloudFindChanged,
      findDeletedIdsSince: cloudFindDeleted,
    } as unknown as SupabaseHighlightRepository;

    authManager = makeAuthManager(true);
    logger = makeSilentLogger();
    syncCursor = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    };

    const offlineQueue = {
      enqueue: vi.fn(),
    } as unknown as OfflineQueueService;

    dualWriteRepo = new DualWriteRepository(
      localRepo,
      cloudRepo,
      authManager,
      offlineQueue,
      new LocalWriteEchoTracker(),
      logger
    );
    facade = new RepositoryFacade(dualWriteRepo);

    service = new CloudHydrationService(
      authManager,
      dualWriteRepo,
      cloudRepo,
      facade,
      syncCursor,
      logger
    );
  });

  it('backfills cloud-only highlights so getCollections returns non-empty after reload', async () => {
    const result = await service.hydrate();

    expect(result.backfilledCount).toBe(3);
    expect(result.skippedCount).toBe(0);
    expect(result.cloudCount).toBe(3);
    expect(localStore).toHaveLength(3);

    await facade.reload();

    const queryService = new HighlightQueryService(facade.asCacheReadable());
    const collections = await queryService.getCollections('cloud');

    expect(collections.length).toBeGreaterThanOrEqual(1);

    expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
      type: LIBRARY_DATA_CHANGED,
      payload: expect.objectContaining({ backfilledCount: 3 }),
    });
    expect(syncCursor.set).toHaveBeenCalled();
  });

  it('skips highlights already present locally when remote is not newer', async () => {
    const existing = makeCloudHighlights()[0]!;
    localStore.push(existing);

    const result = await service.hydrate();

    expect(result.backfilledCount).toBe(2);
    expect(result.skippedCount).toBe(1);
    expect(localStore).toHaveLength(3);
  });

  it('updates local highlights when cloud copy is newer', async () => {
    const existing = makeHighlight(
      '22222222-2222-4222-8222-222222222222',
      'https://example.com/a',
      new Date('2024-01-01')
    );
    localStore.push(existing);

    cloudFindChanged.mockResolvedValue([
      makeHighlight(
        '22222222-2222-4222-8222-222222222222',
        'https://example.com/a',
        new Date('2025-01-01')
      ),
    ]);

    const result = await service.hydrate();

    expect(result.updatedCount).toBe(1);
    expect(result.backfilledCount).toBe(0);
  });

  it('removes locally stored highlights deleted in cloud', async () => {
    localStore.push(makeHighlight('99999999-9999-4999-8999-999999999999', 'https://example.com/gone'));
    cloudFindChanged.mockResolvedValue([]);
    cloudFindDeleted.mockResolvedValue(['99999999-9999-4999-8999-999999999999']);

    const result = await service.hydrate();

    expect(result.deletedCount).toBe(1);
    expect(localStore).toHaveLength(0);
  });

  it('no-ops when user is not authenticated', async () => {
    authManager = makeAuthManager(false);
    service = new CloudHydrationService(
      authManager,
      dualWriteRepo,
      cloudRepo,
      facade,
      syncCursor,
      logger
    );

    const result = await service.hydrate();

    expect(result).toEqual({
      localCountBefore: 0,
      cloudCount: 0,
      backfilledCount: 0,
      updatedCount: 0,
      deletedCount: 0,
      skippedCount: 0,
      failedCount: 0,
    });
    expect(cloudFindChanged).not.toHaveBeenCalled();
    expect(localStore).toHaveLength(0);
  });

  it('returns error and leaves local data unchanged when cloud fetch fails', async () => {
    cloudFindChanged.mockRejectedValue(new Error('network down'));

    const result = await service.hydrate();

    expect(result.error).toMatch(/network down/);
    expect(result.cloudCount).toBe(0);
    expect(result.backfilledCount).toBe(0);
    expect(localStore).toHaveLength(0);
  });

  it('deduplicates concurrent hydrate calls', async () => {
    const promise1 = service.hydrate();
    const promise2 = service.hydrate();

    const [r1, r2] = await Promise.all([promise1, promise2]);

    expect(r1).toEqual(r2);
    expect(cloudFindChanged).toHaveBeenCalledTimes(1);
  });
});
