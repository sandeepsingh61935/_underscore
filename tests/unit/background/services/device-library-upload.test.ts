/**
 * @file device-library-upload.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { browser } from 'wxt/browser';

import { DeviceLibraryUpload } from '@/background/services/device-library-upload';
import type { IAuthManager } from '@/background/auth/interfaces/i-auth-manager';
import type { IHighlightRepository } from '@/shared/repositories/i-highlight-repository';
import type { ITagRepository } from '@/shared/repositories/i-tag-repository';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import type { ILogger } from '@/shared/interfaces/i-logger';

import { GroupCapError } from '@/background/services/group-service';
import type { IGroupRepository } from '@/shared/repositories/i-group-repository';
import type { GroupColor, PageGroup, PageGroupItem } from '@/shared/types/page-group';

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      sendMessage: vi.fn().mockResolvedValue(undefined),
    },
    tabs: {
      query: vi.fn().mockResolvedValue([]),
      sendMessage: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

const USER_ID = '11111111-1111-4111-8111-111111111111';

function makeHighlight(
  id: string,
  text: string,
  url = 'https://example.com/a'
): HighlightDataV2 {
  const hash = text.toLowerCase().trim().padEnd(64, 'a').slice(0, 64);
  return {
    id,
    text,
    contentHash: hash,
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
    url,
    metadata: { source: 'user', notes: `note-${id}` },
  };
}

function makeGroup(
  id: string,
  name: string,
  color: GroupColor = 'blue',
  overrides?: Partial<PageGroup>
): PageGroup {
  return {
    id,
    name,
    color,
    position: 'a0',
    boundDeviceId: 'dev-1',
    boundDeviceLabel: 'Laptop',
    boundBrowser: 'chrome',
    boundAt: '2024-01-01T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

type PageGroupPageItem = Extract<PageGroupItem, { kind: 'page' }>;
type PageGroupDomainItem = Extract<PageGroupItem, { kind: 'domain' }>;

function makePageItem(
  id: string,
  groupId: string,
  urlNormalized = 'https://example.com/page1',
  overrides?: Partial<PageGroupPageItem>
): PageGroupItem {
  return {
    kind: 'page',
    id,
    groupId,
    urlNormalized,
    title: 'Page Title',
    faviconUrl: null,
    position: 'a0',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

function makeDomainItem(
  id: string,
  groupId: string,
  hostname = 'example.com',
  overrides?: Partial<PageGroupDomainItem>
): PageGroupItem {
  return {
    kind: 'domain',
    id,
    groupId,
    hostname,
    includeSubdomains: false,
    position: 'a0',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

function makeGroupRepo(
  groups: PageGroup[] = [],
  items: PageGroupItem[] = []
): IGroupRepository {
  return {
    listGroups: vi.fn(async (opts) =>
      opts?.includeDeleted
        ? [...groups]
        : groups.filter((g) => g.deletedAt === null)
    ),
    getGroup: vi.fn(async (id) => groups.find((g) => g.id === id) ?? null),
    listItems: vi.fn(async (groupId, opts) =>
      items.filter(
        (item) =>
          item.groupId === groupId &&
          (opts?.includeDeleted ? true : item.deletedAt === null)
      )
    ),
    listAllItems: vi.fn(async () =>
      items.filter((item) => item.deletedAt === null)
    ),
    putGroup: vi.fn(async (group: PageGroup) => {
      const idx = groups.findIndex((g) => g.id === group.id);
      if (idx >= 0) {
        groups[idx] = group;
      } else {
        groups.push(group);
      }
    }),
    putItem: vi.fn(async (item: PageGroupItem) => {
      const idx = items.findIndex((i) => i.id === item.id);
      if (idx >= 0) {
        items[idx] = item;
      } else {
        items.push(item);
      }
    }),
    purgeTombstones: vi.fn(async () => 0),
  };
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

function makeAuth(authenticated: boolean): IAuthManager {
  return {
    isAuthenticated: authenticated,
    currentUser: authenticated
      ? { id: USER_ID, email: 'user@example.com', displayName: 'User' }
      : null,
    initialize: vi.fn(),
    signIn: vi.fn(),
    signInWithEmail: vi.fn(),
    signUpWithEmail: vi.fn(),
    signOut: vi.fn(),
    refreshToken: vi.fn(),
    getAuthState: vi.fn(),
    onAuthStateChanged: vi.fn(),
    clearVerificationState: vi.fn(),
    setSession: vi.fn(),
    verifyEmailOtp: vi.fn(),
    resendEmailOtp: vi.fn(),
    requestPasswordReset: vi.fn(),
    verifyRecoveryOtp: vi.fn(),
    updatePassword: vi.fn(),
  };
}

function makeHighlightRepo(store: HighlightDataV2[]): IHighlightRepository {
  return {
    findAll: vi.fn(async () => [...store]),
    findById: vi.fn(async (id) => store.find((h) => h.id === id) ?? null),
    findByUrl: vi.fn(),
    findByContentHash: vi.fn(),
    findOverlapping: vi.fn(),
    count: vi.fn(async () => store.length),
    exists: vi.fn(async (id) => store.some((h) => h.id === id)),
    add: vi.fn(async (h: HighlightDataV2) => {
      store.push(h);
    }),
    update: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
    addMany: vi.fn(),
  };
}

function makeTagRepo(labels: Map<string, string[]>): ITagRepository {
  return {
    listAll: vi.fn(async () => []),
    getLabelsForHighlight: vi.fn(async (id) => labels.get(id) ?? []),
    getLabelsForHighlights: vi.fn(async () => new Map(labels)),
    setHighlightLabels: vi.fn(async (id, names) => {
      labels.set(id, names);
    }),
  };
}

describe('DeviceLibraryUpload', () => {
  const guestA = makeHighlight('22222222-2222-4222-8222-222222222222', 'alpha');
  const guestB = makeHighlight('33333333-3333-4333-8333-333333333333', 'beta');
  const guestDupHash = makeHighlight(
    '55555555-5555-4555-8555-555555555555',
    'alpha',
    'https://example.com/a'
  );

  let basicStore: HighlightDataV2[];
  let proStore: HighlightDataV2[];
  let cloudStore: HighlightDataV2[];
  let basicLabels: Map<string, string[]>;
  let proLabels: Map<string, string[]>;
  let cloudLabels: Map<string, string[]>;
  let basicGroupStore: PageGroup[];
  let proGroupStore: PageGroup[];
  let cloudGroupStore: PageGroup[];
  let basicItemStore: PageGroupItem[];
  let proItemStore: PageGroupItem[];
  let cloudItemStore: PageGroupItem[];
  let basicGroupRepo: IGroupRepository;
  let proGroupRepo: IGroupRepository;
  let cloudGroupRepo: IGroupRepository;
  let processQueue: ReturnType<typeof vi.fn>;
  let enqueue: ReturnType<typeof vi.fn>;
  let reload: ReturnType<typeof vi.fn>;
  let silentLogger: ILogger;
  let upload: DeviceLibraryUpload;

  beforeEach(() => {
    vi.mocked(browser.runtime.sendMessage).mockClear();
    basicStore = [guestA, guestB];
    proStore = [];
    cloudStore = [];
    basicLabels = new Map([[guestA.id, ['later']]]);
    proLabels = new Map();
    cloudLabels = new Map();
    basicGroupStore = [];
    proGroupStore = [];
    cloudGroupStore = [];
    basicItemStore = [];
    proItemStore = [];
    cloudItemStore = [];
    basicGroupRepo = makeGroupRepo(basicGroupStore, basicItemStore);
    proGroupRepo = makeGroupRepo(proGroupStore, proItemStore);
    cloudGroupRepo = makeGroupRepo(cloudGroupStore, cloudItemStore);
    processQueue = vi.fn(async () => undefined);
    enqueue = vi.fn(async () => undefined);
    reload = vi.fn(async () => undefined);
    silentLogger = makeSilentLogger();

    upload = new DeviceLibraryUpload(
      makeAuth(true),
      makeHighlightRepo(basicStore),
      makeHighlightRepo(proStore),
      makeHighlightRepo(cloudStore),
      makeTagRepo(basicLabels),
      makeTagRepo(proLabels),
      makeTagRepo(cloudLabels),
      basicGroupRepo,
      proGroupRepo,
      cloudGroupRepo,
      { processQueue, enqueue } as never,
      { reload } as never,
      silentLogger
    );
  });

  it('copies guest rows into pro and cloud and leaves basic intact', async () => {
    const result = await upload.upload();
    expect(result.copiedCount).toBe(2);
    expect(result.skippedCount).toBe(0);
    expect(result.failedCount).toBe(0);
    expect(result.tagsCopiedCount).toBe(1);
    expect(result.groupsCopiedCount).toBe(0);
    expect(result.groupItemsCopiedCount).toBe(0);
    expect(basicStore).toHaveLength(2);
    expect(proStore).toHaveLength(2);
    expect(cloudStore).toHaveLength(2);
    expect(proStore[0]?.userId).toBe(USER_ID);
    expect(proLabels.get(guestA.id)).toEqual(['later']);
    expect(cloudLabels.get(guestA.id)).toEqual(['later']);
    expect(processQueue).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('skips same id already in the account', async () => {
    proStore.push({ ...guestA, userId: USER_ID });
    const result = await upload.upload();
    expect(result.copiedCount).toBe(1);
    expect(result.skippedCount).toBe(1);
    expect(cloudStore.map((h) => h.id)).toEqual([guestB.id]);
  });

  it('skips same contentHash and url with a different id', async () => {
    proStore.push({ ...guestA, id: '44444444-4444-4444-8444-444444444444' });
    basicStore.push(guestDupHash);
    const result = await upload.upload();
    expect(result.copiedCount).toBe(1);
    expect(result.skippedCount).toBe(2);
  });

  it('no-ops when not authenticated', async () => {
    upload = new DeviceLibraryUpload(
      makeAuth(false),
      makeHighlightRepo(basicStore),
      makeHighlightRepo(proStore),
      makeHighlightRepo(cloudStore),
      makeTagRepo(basicLabels),
      makeTagRepo(proLabels),
      makeTagRepo(cloudLabels),
      basicGroupRepo,
      proGroupRepo,
      cloudGroupRepo,
      { processQueue, enqueue } as never,
      { reload } as never,
      silentLogger
    );
    const preview = await upload.preview();
    expect(preview.pendingCount).toBe(0);
    expect(preview.pendingGroupCount).toBe(0);
    expect(preview.pendingGroupItemCount).toBe(0);
    const result = await upload.upload();
    expect(result.error).toMatch(/Sign in/);
    expect(result.groupsCopiedCount).toBe(0);
    expect(result.groupItemsCopiedCount).toBe(0);
    expect(proStore).toHaveLength(0);
    expect(cloudStore).toHaveLength(0);
  });

  it('preview counts only new guest rows', async () => {
    proStore.push({ ...guestA, userId: USER_ID });
    const preview = await upload.preview();
    expect(preview.pendingCount).toBe(1);
    expect(preview.pendingGroupCount).toBe(0);
    expect(preview.pendingGroupItemCount).toBe(0);
    expect(preview.email).toBe('user@example.com');
  });

  it('queues cloud failures and still copies to pro', async () => {
    const cloudRepo = makeHighlightRepo(cloudStore);
    vi.mocked(cloudRepo.add).mockRejectedValue(new Error('offline'));
    upload = new DeviceLibraryUpload(
      makeAuth(true),
      makeHighlightRepo(basicStore),
      makeHighlightRepo(proStore),
      cloudRepo,
      makeTagRepo(basicLabels),
      makeTagRepo(proLabels),
      makeTagRepo(cloudLabels),
      basicGroupRepo,
      proGroupRepo,
      cloudGroupRepo,
      { processQueue, enqueue } as never,
      { reload } as never,
      silentLogger
    );
    const result = await upload.upload();
    expect(result.copiedCount).toBe(2);
    expect(enqueue).toHaveBeenCalled();
    expect(proStore).toHaveLength(2);
  });

  it('preview counts pending guest groups (skipping matching name+color) and pending items (skipping existing keys)', async () => {
    const guestGroupA = makeGroup('g-1', 'Research', 'blue');
    const guestGroupB = makeGroup('g-2', 'Work', 'green');
    basicGroupStore.push(guestGroupA, guestGroupB);

    const accountGroup = makeGroup('ag-1', 'research', 'blue');
    proGroupStore.push(accountGroup);

    const itemA = makePageItem('item-a', guestGroupA.id, 'https://example.com/p1');
    // itemB1 matches accountItem via normalization (hash stripped, params sorted)
    const itemB1 = makePageItem(
      'item-b1',
      guestGroupB.id,
      'https://example.com/p2?b=2&a=1#section'
    );
    // itemB2 is a new domain not in account
    const itemB2 = makeDomainItem('item-b2', guestGroupB.id, 'new-site.org');
    // itemB3 matches accountDomain via case-insensitive hostname
    const itemB3 = makeDomainItem('item-b3', guestGroupB.id, 'EXAMPLE.COM');
    basicItemStore.push(itemA, itemB1, itemB2, itemB3);

    const accountItem = makePageItem(
      'ai-1',
      accountGroup.id,
      'https://example.com/p2?a=1&b=2'
    );
    const accountDomain = makeDomainItem('ai-2', accountGroup.id, 'example.com');
    proItemStore.push(accountItem, accountDomain);

    const preview = await upload.preview();
    expect(preview.pendingCount).toBe(2);
    expect(preview.pendingGroupCount).toBe(1);
    expect(preview.pendingGroupItemCount).toBe(1); // itemB2
    expect(preview.email).toBe('user@example.com');
  });

  it('upload copies groups and items to pro and cloud, generates new IDs, clears bindings, preserves basic store', async () => {
    const guestGroup = makeGroup('guest-g-1', 'Work Projects', 'purple', {
      boundDeviceId: 'device-abc',
      boundDeviceLabel: 'My Laptop',
      boundBrowser: 'chrome',
      boundAt: '2024-05-01T12:00:00.000Z',
    });
    basicGroupStore.push(guestGroup);

    const guestPageItem = makePageItem('item-1', guestGroup.id, 'https://acme.org/spec');
    const guestDomainItem = makeDomainItem('item-2', guestGroup.id, 'acme.org');
    basicItemStore.push(guestPageItem, guestDomainItem);

    const result = await upload.upload();
    expect(result.groupsCopiedCount).toBe(1);
    expect(result.groupItemsCopiedCount).toBe(2);

    // Basic store intact
    expect(basicGroupStore).toHaveLength(1);
    expect(basicGroupStore[0]?.id).toBe('guest-g-1');
    expect(basicGroupStore[0]?.boundDeviceId).toBe('device-abc');
    expect(basicItemStore).toHaveLength(2);

    // Pro store has group copied
    expect(proGroupStore).toHaveLength(1);
    const proGroup = proGroupStore[0]!;
    expect(proGroup.id).not.toBe('guest-g-1');
    expect(proGroup.name).toBe('Work Projects');
    expect(proGroup.color).toBe('purple');
    expect(proGroup.position).toBe('a0');
    expect(proGroup.boundDeviceId).toBeNull();
    expect(proGroup.boundDeviceLabel).toBeNull();
    expect(proGroup.boundBrowser).toBeNull();
    expect(proGroup.boundAt).toBeNull();
    expect(proGroup.deletedAt).toBeNull();

    // Pro store has items copied under new group ID
    expect(proItemStore).toHaveLength(2);
    expect(proItemStore[0]?.groupId).toBe(proGroup.id);
    expect(proItemStore[0]?.id).not.toBe('item-1');
    expect(proItemStore[0]?.deletedAt).toBeNull();
    expect(proItemStore[1]?.groupId).toBe(proGroup.id);
    expect(proItemStore[1]?.id).not.toBe('item-2');
    expect(proItemStore[1]?.deletedAt).toBeNull();

    // Cloud store has same group and items
    expect(cloudGroupStore).toHaveLength(1);
    expect(cloudGroupStore[0]?.id).toBe(proGroup.id);
    expect(cloudItemStore).toHaveLength(2);
    expect(cloudItemStore[0]?.groupId).toBe(proGroup.id);
  });

  it('cloud failures for groups and items are enqueued to offlineQueue with entity group and group_item', async () => {
    const guestGroup = makeGroup('guest-g-1', 'Offline Group', 'green');
    basicGroupStore.push(guestGroup);
    const guestItem = makePageItem('item-1', guestGroup.id, 'https://example.com/test');
    basicItemStore.push(guestItem);

    vi.mocked(cloudGroupRepo.putGroup).mockRejectedValue(new Error('Cloud offline'));
    vi.mocked(cloudGroupRepo.putItem).mockRejectedValue(new Error('Cloud offline'));

    const result = await upload.upload();
    expect(result.groupsCopiedCount).toBe(1);
    expect(result.groupItemsCopiedCount).toBe(1);

    expect(enqueue).toHaveBeenCalledWith(
      'add',
      expect.any(String),
      expect.objectContaining({ name: 'Offline Group' }),
      'group'
    );
    expect(enqueue).toHaveBeenCalledWith(
      'add',
      expect.any(String),
      expect.objectContaining({ urlNormalized: 'https://example.com/test' }),
      'group_item'
    );
    expect(proGroupStore).toHaveLength(1);
    expect(proItemStore).toHaveLength(1);
  });

  it('group cap failure skips cloud write and queueing for child items, keeping offline queue clean', async () => {
    const guestGroup = makeGroup('guest-g-1', 'Capped Group', 'yellow');
    basicGroupStore.push(guestGroup);
    const guestItem = makePageItem('item-1', guestGroup.id, 'https://example.com/capped');
    basicItemStore.push(guestItem);

    vi.mocked(cloudGroupRepo.putGroup).mockRejectedValue(
      new GroupCapError('groups', 200)
    );

    const result = await upload.upload();
    expect(result.groupsCopiedCount).toBe(1);
    expect(result.groupItemsCopiedCount).toBe(1);

    // Group and item saved to pro locally
    expect(proGroupStore).toHaveLength(1);
    expect(proItemStore).toHaveLength(1);
    expect(proItemStore[0]?.groupId).toBe(proGroupStore[0]?.id);

    // Neither group nor item written to cloud or enqueued
    expect(cloudGroupStore).toHaveLength(0);
    expect(cloudItemStore).toHaveLength(0);
    expect(cloudGroupRepo.putItem).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalledWith(
      'add',
      expect.any(String),
      expect.anything(),
      'group'
    );
    expect(enqueue).not.toHaveBeenCalledWith(
      'add',
      expect.any(String),
      expect.anything(),
      'group_item'
    );

    expect(silentLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Group cap exceeded'),
      expect.any(Object)
    );
    expect(silentLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Parent group skipped for cloud due to cap'),
      expect.any(Object)
    );
  });

  it('item cap failure when parent group succeeds does not enqueue item to offline queue', async () => {
    const guestGroup = makeGroup('guest-g-1', 'Normal Group', 'blue');
    basicGroupStore.push(guestGroup);
    const guestItem = makePageItem('item-1', guestGroup.id, 'https://example.com/item-cap');
    basicItemStore.push(guestItem);

    vi.mocked(cloudGroupRepo.putItem).mockRejectedValue(
      new GroupCapError('items', 500)
    );

    const result = await upload.upload();
    expect(result.groupsCopiedCount).toBe(1);
    expect(result.groupItemsCopiedCount).toBe(1);

    // Group succeeded in cloud
    expect(cloudGroupStore).toHaveLength(1);
    expect(cloudItemStore).toHaveLength(0);

    // Item saved to pro locally but not enqueued
    expect(proItemStore).toHaveLength(1);
    expect(enqueue).not.toHaveBeenCalledWith(
      'add',
      expect.any(String),
      expect.anything(),
      'group_item'
    );
    expect(silentLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Group item cap exceeded'),
      expect.any(Object)
    );
  });

  it('supports multiple pending groups sharing an item URL and deduplicates within each group', async () => {
    const guestGroup1 = makeGroup('guest-g-1', 'Work', 'green');
    const guestGroup2 = makeGroup('guest-g-2', 'Reading', 'purple');
    basicGroupStore.push(guestGroup1, guestGroup2);

    const sharedUrl = 'https://shared-resource.com/article';
    const itemG1 = makePageItem('item-g1', guestGroup1.id, sharedUrl);
    const itemG2A = makePageItem('item-g2-a', guestGroup2.id, sharedUrl);
    // Duplicate of sharedUrl within group 2
    const itemG2B = makePageItem('item-g2-b', guestGroup2.id, sharedUrl);
    basicItemStore.push(itemG1, itemG2A, itemG2B);

    const preview = await upload.preview();
    expect(preview.pendingGroupCount).toBe(2);
    // Each group counts the shared item once (duplicate in group 2 is deduped)
    expect(preview.pendingGroupItemCount).toBe(2);

    const result = await upload.upload();
    expect(result.groupsCopiedCount).toBe(2);
    expect(result.groupItemsCopiedCount).toBe(2);

    expect(proGroupStore).toHaveLength(2);
    const proG1 = proGroupStore.find((g) => g.name === 'Work')!;
    const proG2 = proGroupStore.find((g) => g.name === 'Reading')!;
    expect(proG1).toBeDefined();
    expect(proG2).toBeDefined();

    // Both groups have the item in pro and cloud
    const proItemsG1 = proItemStore.filter((i) => i.groupId === proG1.id);
    const proItemsG2 = proItemStore.filter((i) => i.groupId === proG2.id);
    expect(proItemsG1).toHaveLength(1);
    expect(proItemsG2).toHaveLength(1);
    expect((proItemsG1[0] as PageGroupPageItem).urlNormalized).toBe(sharedUrl);
    expect((proItemsG2[0] as PageGroupPageItem).urlNormalized).toBe(sharedUrl);

    const cloudItemsG1 = cloudItemStore.filter((i) => i.groupId === proG1.id);
    const cloudItemsG2 = cloudItemStore.filter((i) => i.groupId === proG2.id);
    expect(cloudItemsG1).toHaveLength(1);
    expect(cloudItemsG2).toHaveLength(1);
  });

  it('no-ops groups when not authenticated', async () => {
    const guestGroup = makeGroup('guest-g-1', 'Unauth Group', 'red');
    basicGroupStore.push(guestGroup);
    const guestItem = makePageItem('item-1', guestGroup.id, 'https://example.com/unauth');
    basicItemStore.push(guestItem);

    upload = new DeviceLibraryUpload(
      makeAuth(false),
      makeHighlightRepo(basicStore),
      makeHighlightRepo(proStore),
      makeHighlightRepo(cloudStore),
      makeTagRepo(basicLabels),
      makeTagRepo(proLabels),
      makeTagRepo(cloudLabels),
      basicGroupRepo,
      proGroupRepo,
      cloudGroupRepo,
      { processQueue, enqueue } as never,
      { reload } as never,
      silentLogger
    );

    const preview = await upload.preview();
    expect(preview.pendingCount).toBe(0);
    expect(preview.pendingGroupCount).toBe(0);
    expect(preview.pendingGroupItemCount).toBe(0);

    const result = await upload.upload();
    expect(result.error).toMatch(/Sign in/);
    expect(result.groupsCopiedCount).toBe(0);
    expect(result.groupItemsCopiedCount).toBe(0);
    expect(proGroupStore).toHaveLength(0);
    expect(proItemStore).toHaveLength(0);
  });
});
