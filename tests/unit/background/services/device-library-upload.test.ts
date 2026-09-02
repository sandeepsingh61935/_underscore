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
  let processQueue: ReturnType<typeof vi.fn>;
  let enqueue: ReturnType<typeof vi.fn>;
  let reload: ReturnType<typeof vi.fn>;
  let upload: DeviceLibraryUpload;

  beforeEach(() => {
    vi.mocked(browser.runtime.sendMessage).mockClear();
    basicStore = [guestA, guestB];
    proStore = [];
    cloudStore = [];
    basicLabels = new Map([[guestA.id, ['later']]]);
    proLabels = new Map();
    cloudLabels = new Map();
    processQueue = vi.fn(async () => undefined);
    enqueue = vi.fn(async () => undefined);
    reload = vi.fn(async () => undefined);

    upload = new DeviceLibraryUpload(
      makeAuth(true),
      makeHighlightRepo(basicStore),
      makeHighlightRepo(proStore),
      makeHighlightRepo(cloudStore),
      makeTagRepo(basicLabels),
      makeTagRepo(proLabels),
      makeTagRepo(cloudLabels),
      { processQueue, enqueue } as never,
      { reload } as never,
      makeSilentLogger()
    );
  });

  it('copies guest rows into pro and cloud and leaves basic intact', async () => {
    const result = await upload.upload();
    expect(result.copiedCount).toBe(2);
    expect(result.skippedCount).toBe(0);
    expect(result.failedCount).toBe(0);
    expect(result.tagsCopiedCount).toBe(1);
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
      { processQueue, enqueue } as never,
      { reload } as never,
      makeSilentLogger()
    );
    const preview = await upload.preview();
    expect(preview.pendingCount).toBe(0);
    const result = await upload.upload();
    expect(result.error).toMatch(/Sign in/);
    expect(proStore).toHaveLength(0);
    expect(cloudStore).toHaveLength(0);
  });

  it('preview counts only new guest rows', async () => {
    proStore.push({ ...guestA, userId: USER_ID });
    const preview = await upload.preview();
    expect(preview.pendingCount).toBe(1);
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
      { processQueue, enqueue } as never,
      { reload } as never,
      makeSilentLogger()
    );
    const result = await upload.upload();
    expect(result.copiedCount).toBe(2);
    expect(enqueue).toHaveBeenCalled();
    expect(proStore).toHaveLength(2);
  });
});
