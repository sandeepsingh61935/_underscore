/**
 * @file indexed-db-tag-repository.ts
 * @description Local IndexedDB implementation of ITagRepository.
 *
 * Shares the highlight database (basic / pro) and adds `tags` +
 * `highlight_tags` object stores at DB version 2.
 */

import { openDB, type IDBPDatabase } from 'idb';

import {
  HIGHLIGHT_DB_VERSION,
  HIGHLIGHT_TAGS_STORE,
  TAGS_STORE,
} from '@/shared/constants/highlight-db-version';
import type { ITagRepository } from '@/shared/repositories/i-tag-repository';
import { upgradeHighlightDatabase } from '@/shared/storage/highlight-db-upgrade';
import type { TagEntity } from '@/shared/types/tag-entity';
import { normalizeHighlightTags } from '@/shared/utils/highlight-metadata';
import type { ILogger } from '@/shared/utils/logger';

interface StoredTag {
  id: string;
  name: string;
  createdAt: Date;
}

interface StoredHighlightTag {
  highlightId: string;
  tagId: string;
}

export class IndexedDBTagRepository implements ITagRepository {
  private readonly dbPromise: Promise<IDBPDatabase>;
  private readonly logger: ILogger;

  constructor(logger: ILogger, dbName: string) {
    this.logger = logger;
    this.dbPromise = openDB(dbName, HIGHLIGHT_DB_VERSION, {
      upgrade(db) {
        upgradeHighlightDatabase(db);
      },
    });
  }

  async listAll(): Promise<TagEntity[]> {
    const db = await this.dbPromise;
    const tags = (await db.getAll(TAGS_STORE)) as StoredTag[];
    return tags
      .map((tag) => ({ id: tag.id, name: tag.name, createdAt: new Date(tag.createdAt) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getLabelsForHighlight(highlightId: string): Promise<string[]> {
    const map = await this.getLabelsForHighlights([highlightId]);
    return map.get(highlightId) ?? [];
  }

  async getLabelsForHighlights(highlightIds: string[]): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>();
    if (highlightIds.length === 0) return result;

    const db = await this.dbPromise;
    const allTags = (await db.getAll(TAGS_STORE)) as StoredTag[];
    const tagNameById = new Map(allTags.map((tag) => [tag.id, tag.name]));
    const allLinks = (await db.getAll(HIGHLIGHT_TAGS_STORE)) as StoredHighlightTag[];
    const idSet = new Set(highlightIds);

    for (const link of allLinks) {
      if (!idSet.has(link.highlightId)) continue;
      const name = tagNameById.get(link.tagId);
      if (!name) continue;
      const existing = result.get(link.highlightId) ?? [];
      existing.push(name);
      result.set(link.highlightId, existing);
    }

    for (const [id, names] of result) {
      result.set(id, normalizeHighlightTags(names));
    }

    return result;
  }

  async clearAll(): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction([TAGS_STORE, HIGHLIGHT_TAGS_STORE], 'readwrite');
    await tx.objectStore(TAGS_STORE).clear();
    await tx.objectStore(HIGHLIGHT_TAGS_STORE).clear();
    await tx.done;
    this.logger.debug('[IndexedDBTagRepo] cleared tag stores');
  }

  async setHighlightLabels(highlightId: string, names: string[]): Promise<void> {
    const normalized = normalizeHighlightTags(names);
    const db = await this.dbPromise;
    const tx = db.transaction([TAGS_STORE, HIGHLIGHT_TAGS_STORE], 'readwrite');
    const tagsStore = tx.objectStore(TAGS_STORE);
    const linksStore = tx.objectStore(HIGHLIGHT_TAGS_STORE);

    const existingTags = (await tagsStore.getAll()) as StoredTag[];
    const tagByName = new Map(existingTags.map((tag) => [tag.name, tag]));

    const resolvedTagIds: string[] = [];
    for (const name of normalized) {
      let tag = tagByName.get(name);
      if (!tag) {
        tag = { id: crypto.randomUUID(), name, createdAt: new Date() };
        await tagsStore.put(tag);
        tagByName.set(name, tag);
      }
      resolvedTagIds.push(tag.id);
    }

    const highlightIndex = linksStore.index('highlightId');
    const existingLinks = (await highlightIndex.getAll(
      highlightId
    )) as StoredHighlightTag[];
    for (const link of existingLinks) {
      await linksStore.delete([link.highlightId, link.tagId]);
    }

    for (const tagId of resolvedTagIds) {
      await linksStore.put({ highlightId, tagId });
    }

    await tx.done;
    this.logger.debug('[IndexedDBTagRepo] setHighlightLabels', {
      highlightId,
      count: normalized.length,
    });
  }
}
