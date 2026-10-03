/**
 * @file indexed-db-group-repository.ts
 * @description Local IndexedDB implementation of IGroupRepository (ADR-032 §1, §8).
 *
 * Shares the highlight database (basic / pro) and adds `page_groups` +
 * `page_group_items` object stores at DB version 3 via the shared upgrade
 * helper, so every opener creates them. Rows are soft-deletable; list*
 * accessors exclude tombstones by default.
 */

import { openDB, type IDBPDatabase } from 'idb';

import {
  HIGHLIGHT_DB_VERSION,
  PAGE_GROUP_ITEMS_STORE,
  PAGE_GROUPS_STORE,
} from '@/shared/constants/highlight-db-version';
import type { IGroupRepository } from '@/shared/repositories/i-group-repository';
import { upgradeHighlightDatabase } from '@/shared/storage/highlight-db-upgrade';
import type { PageGroup, PageGroupItem } from '@/shared/types/page-group';
import type { ILogger } from '@/shared/utils/logger';

const byPosition = <T extends { position: string }>(a: T, b: T): number =>
  a.position < b.position ? -1 : a.position > b.position ? 1 : 0;

export class IndexedDBGroupRepository implements IGroupRepository {
  private readonly dbPromise: Promise<IDBPDatabase>;
  private readonly logger: ILogger;

  constructor(logger: ILogger, dbName: string) {
    this.logger = logger;
    this.dbPromise = openDB(dbName, HIGHLIGHT_DB_VERSION, {
      upgrade(db, _oldVersion, _newVersion, _transaction) {
        // Shared upgrade path: creates highlight + tag + page-group stores
        // at v3 regardless of which repository opens the DB first.
        upgradeHighlightDatabase(db);
      },
    });
  }

  async listGroups(opts?: { includeDeleted?: boolean }): Promise<PageGroup[]> {
    const db = await this.dbPromise;
    const groups = (await db.getAll(PAGE_GROUPS_STORE)) as PageGroup[];
    const visible = opts?.includeDeleted ? groups : groups.filter((g) => g.deletedAt === null);
    return visible.sort(byPosition);
  }

  async getGroup(id: string): Promise<PageGroup | null> {
    const db = await this.dbPromise;
    const group = (await db.get(PAGE_GROUPS_STORE, id)) as PageGroup | undefined;
    return group ?? null;
  }

  async listItems(groupId: string, opts?: { includeDeleted?: boolean }): Promise<PageGroupItem[]> {
    const db = await this.dbPromise;
    const index = db.transaction(PAGE_GROUP_ITEMS_STORE).store.index('groupId');
    const items = (await index.getAll(groupId)) as PageGroupItem[];
    const visible = opts?.includeDeleted ? items : items.filter((i) => i.deletedAt === null);
    return visible.sort(byPosition);
  }

  async listAllItems(): Promise<PageGroupItem[]> {
    const db = await this.dbPromise;
    const items = (await db.getAll(PAGE_GROUP_ITEMS_STORE)) as PageGroupItem[];
    return items.filter((i) => i.deletedAt === null).sort(byPosition);
  }

  async putGroup(group: PageGroup): Promise<void> {
    const db = await this.dbPromise;
    await db.put(PAGE_GROUPS_STORE, group);
    this.logger.debug('[IndexedDBGroupRepo] putGroup', { id: group.id });
  }

  async putItem(item: PageGroupItem): Promise<void> {
    const db = await this.dbPromise;
    await db.put(PAGE_GROUP_ITEMS_STORE, item);
    this.logger.debug('[IndexedDBGroupRepo] putItem', { id: item.id });
  }

  /**
   * Remove every group + item row (sign-out wipe of the Pro partition,
   * plan Phase 2 Task 2.3). Tombstone-aware purge stays in purgeTombstones.
   */
  async clearGroups(): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction([PAGE_GROUPS_STORE, PAGE_GROUP_ITEMS_STORE], 'readwrite');
    await tx.objectStore(PAGE_GROUPS_STORE).clear();
    await tx.objectStore(PAGE_GROUP_ITEMS_STORE).clear();
    await tx.done;
    this.logger.debug('[IndexedDBGroupRepo] clearGroups');
  }

  async purgeTombstones(olderThan: Date): Promise<number> {
    // NOTE (Task 2.4): `olderThan` arrives pre-computed as
    // `tombstonePurgeCutoff(now)`, so the decision here is a direct strict
    // `<` against it — identical to `isPurgeable(deletedAt, now)` by
    // construction. Do NOT route through isPurgeable with `olderThan` as
    // `now`; that would subtract the 30d window twice (60d retention).
    const cutoff = olderThan.getTime();
    const db = await this.dbPromise;
    const tx = db.transaction([PAGE_GROUPS_STORE, PAGE_GROUP_ITEMS_STORE], 'readwrite');
    let purged = 0;

    for (const storeName of [PAGE_GROUPS_STORE, PAGE_GROUP_ITEMS_STORE] as const) {
      const store = tx.objectStore(storeName);
      const rows = (await store.getAll()) as Array<PageGroup | PageGroupItem>;
      for (const row of rows) {
        if (row.deletedAt !== null && Date.parse(row.deletedAt) < cutoff) {
          await store.delete(row.id);
          purged += 1;
        }
      }
    }

    await tx.done;
    this.logger.debug('[IndexedDBGroupRepo] purgeTombstones', { purged });
    return purged;
  }

  async close(): Promise<void> {
    const db = await this.dbPromise;
    db.close();
  }
}
