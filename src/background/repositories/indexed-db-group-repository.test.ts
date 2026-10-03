/**
 * @file indexed-db-group-repository.test.ts
 * @description TDD contract for Task 1.3: v2 -> v3 upgrade without data loss
 * plus IGroupRepository CRUD, soft-delete, and tombstone purge.
 */

import 'fake-indexeddb/auto';
import { deleteDB, openDB } from 'idb';
import { beforeEach, describe, expect, it } from 'vitest';

import { IndexedDBGroupRepository } from './indexed-db-group-repository';
import {
  HIGHLIGHT_DB_VERSION,
  HIGHLIGHT_TAGS_STORE,
  HIGHLIGHTS_STORE,
  TAGS_STORE,
} from '@/shared/constants/highlight-db-version';
import type { PageGroup, PageGroupItem } from '@/shared/types/page-group';
import { LoggerFactory } from '@/shared/utils/logger';

const logger = LoggerFactory.getLogger('Test');
const DB_NAME = 'test-groups-upgrade-db';

function makeGroup(id: string, position = 'a0'): PageGroup {
  const now = new Date().toISOString();
  return {
    id,
    name: `Group ${id}`,
    color: 'blue',
    position,
    boundDeviceId: null,
    boundDeviceLabel: null,
    boundBrowser: null,
    boundAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

function makePageItem(id: string, groupId: string, position = 'a0'): PageGroupItem {
  const now = new Date().toISOString();
  return {
    id,
    kind: 'page',
    groupId,
    position,
    urlNormalized: 'https://example.com/page',
    title: 'Example',
    faviconUrl: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

describe('IndexedDB v2 -> v3 upgrade (no data loss)', () => {
  beforeEach(async () => {
    await deleteDB(DB_NAME).catch(() => undefined);
  });

  it(`upgrades an existing v2 DB (highlights+tags) to v${HIGHLIGHT_DB_VERSION} without data loss`, async () => {
    // Seed a v2-shaped database: highlights + tags + highlight_tags only.
    const v2 = await openDB(DB_NAME, 2, {
      upgrade(db) {
        const highlights = db.createObjectStore(HIGHLIGHTS_STORE, { keyPath: 'id' });
        highlights.createIndex('contentHash', 'contentHash');
        highlights.createIndex('url', 'url');
        const tags = db.createObjectStore(TAGS_STORE, { keyPath: 'id' });
        tags.createIndex('name', 'name', { unique: true });
        const links = db.createObjectStore(HIGHLIGHT_TAGS_STORE, {
          keyPath: ['highlightId', 'tagId'],
        });
        links.createIndex('highlightId', 'highlightId');
        links.createIndex('tagId', 'tagId');
      },
    });
    await v2.put(HIGHLIGHTS_STORE, {
      id: 'h-1',
      text: 'kept',
      contentHash: 'hash-1',
      url: 'https://example.com',
      createdAt: new Date(),
    });
    await v2.put(TAGS_STORE, { id: 't-1', name: 'kept-tag', createdAt: new Date() });
    await v2.put(HIGHLIGHT_TAGS_STORE, { highlightId: 'h-1', tagId: 't-1' });
    v2.close();

    // Opening through the group repository must run the shared v3 upgrade.
    const repo = new IndexedDBGroupRepository(logger, DB_NAME);
    await expect(repo.listGroups()).resolves.toEqual([]);
    await repo.close();

    // Existing rows survive the upgrade.
    const upgraded = await openDB(DB_NAME, HIGHLIGHT_DB_VERSION);
    try {
      expect(await upgraded.count(HIGHLIGHTS_STORE)).toBe(1);
      expect(await upgraded.count(TAGS_STORE)).toBe(1);
      expect(await upgraded.count(HIGHLIGHT_TAGS_STORE)).toBe(1);
      expect(await upgraded.get(HIGHLIGHTS_STORE, 'h-1')).toMatchObject({ text: 'kept' });
      expect(upgraded.objectStoreNames.contains('page_groups')).toBe(true);
      expect(upgraded.objectStoreNames.contains('page_group_items')).toBe(true);
    } finally {
      upgraded.close();
    }
  });
});

describe('IndexedDBGroupRepository', () => {
  let repo: IndexedDBGroupRepository;

  beforeEach(async () => {
    await deleteDB(DB_NAME).catch(() => undefined);
    repo = new IndexedDBGroupRepository(logger, DB_NAME);
  });

  it('round-trips groups and items ordered by position', async () => {
    await repo.putGroup(makeGroup('g-2', 'a1'));
    await repo.putGroup(makeGroup('g-1', 'a0'));
    await repo.putItem(makePageItem('i-2', 'g-1', 'a1'));
    await repo.putItem(makePageItem('i-1', 'g-1', 'a0'));

    expect((await repo.listGroups()).map((g) => g.id)).toEqual(['g-1', 'g-2']);
    expect((await repo.listItems('g-1')).map((i) => i.id)).toEqual(['i-1', 'i-2']);
    expect(await repo.getGroup('g-1')).toMatchObject({ id: 'g-1', name: 'Group g-1' });
    expect(await repo.getGroup('missing')).toBeNull();
    await repo.close();
  });

  it('excludes tombstones by default and includes them on request', async () => {
    const deleted: PageGroup = { ...makeGroup('g-del'), deletedAt: new Date().toISOString() };
    await repo.putGroup(makeGroup('g-live'));
    await repo.putGroup(deleted);
    const item: PageGroupItem = {
      ...makePageItem('i-del', 'g-live'),
      deletedAt: new Date().toISOString(),
    };
    await repo.putItem(makePageItem('i-live', 'g-live'));
    await repo.putItem(item);

    expect((await repo.listGroups()).map((g) => g.id)).toEqual(['g-live']);
    expect((await repo.listGroups({ includeDeleted: true })).map((g) => g.id).sort()).toEqual(
      ['g-del', 'g-live']
    );
    expect((await repo.listItems('g-live')).map((i) => i.id)).toEqual(['i-live']);
    expect(
      (await repo.listItems('g-live', { includeDeleted: true })).map((i) => i.id).sort()
    ).toEqual(['i-del', 'i-live']);
    expect((await repo.listAllItems()).map((i) => i.id)).toEqual(['i-live']);
    await repo.close();
  });

  it('purges only tombstones older than the cutoff', async () => {
    const old = new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString();
    const recent = new Date().toISOString();
    await repo.putGroup({ ...makeGroup('g-old'), deletedAt: old });
    await repo.putGroup({ ...makeGroup('g-recent'), deletedAt: recent });
    await repo.putGroup(makeGroup('g-live'));
    await repo.putItem({
      ...makePageItem('i-old', 'g-live'),
      deletedAt: old,
    });

    const purged = await repo.purgeTombstones(new Date(Date.now() - 30 * 24 * 3600 * 1000));
    expect(purged).toBe(2);
    expect((await repo.listGroups({ includeDeleted: true })).map((g) => g.id).sort()).toEqual(
      ['g-live', 'g-recent']
    );
    expect(await repo.listAllItems()).toEqual([]);
    await repo.close();
  });
});
