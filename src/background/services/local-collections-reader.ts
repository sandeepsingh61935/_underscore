/**
 * @file local-collections-reader.ts
 * @description Reads the __collections_index from chrome.storage.local to produce
 * domain-level collection summaries for the background GET_COLLECTIONS handler.
 *
 * This is the unified aggregation path for Walk, Sprint, and Vault (local cache) modes.
 */

import { browser } from 'wxt/browser';

import { COLLECTIONS_INDEX_KEY } from '@/shared/types/storage';
import type { CollectionsIndex, CollectionsIndexEntry } from '@/shared/types/storage';

export interface DomainCollection {
  id: string;
  domain: string;
  highlightCount: number;
  lastActive: Date;
  mode: CollectionsIndexEntry['mode'];
}

/**
 * Read all non-expired collections from chrome.storage.local.
 * Walk entries with ttl < now are filtered out (expired).
 * Sprint and Vault entries with ttl === null are always included.
 */
export async function readLocalCollections(): Promise<DomainCollection[]> {
  const result = await browser.storage.local.get(COLLECTIONS_INDEX_KEY);
  const index: CollectionsIndex = (result[COLLECTIONS_INDEX_KEY] as CollectionsIndex) ?? {};

  const now = Date.now();
  const collections: DomainCollection[] = [];

  let i = 1;
  for (const [, entry] of Object.entries(index)) {
    // Skip expired entries (ttl is set and in the past)
    if (entry.ttl !== null && entry.ttl < now) continue;

    // Skip domains with zero highlights
    if (entry.count <= 0) continue;

    collections.push({
      id: String(i++),
      domain: entry.domain,
      highlightCount: entry.count,
      lastActive: new Date(entry.lastActive),
      mode: entry.mode,
    });
  }

  // Sort by most recently active
  return collections.sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime());
}
