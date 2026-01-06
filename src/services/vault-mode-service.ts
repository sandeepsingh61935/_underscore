import { IndexedDBStorage } from './indexeddb-storage';
import { MultiSelectorEngine, type MultiSelector } from './multi-selector-engine';

import type { ILogger } from '@/shared/interfaces/i-logger';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import type { IHighlightRepository } from '@/background/repositories/i-highlight-repository';

/**
 * @file vault-mode-service.ts
 * @description Vault Mode Service - Integration Layer for highlight persistence
 * 
 * Coordinates between Multi-Selector Engine and storage layer.
 * Implements the Facade pattern following quality framework guidelines.
 * 
 * Architecture:
 * - Facade Pattern: Hides complexity of multi-selector + storage coordination
 * - Dependency Injection: Accepts repository via constructor
 * - Single Responsibility: Only handles integration, delegates to specialists
 *
 * Flow:
 * 1. User creates highlight → saveHighlight()
 * 2. Generate selectors from DOM Range → MultiSelectorEngine.createSelectors()
 * 3. Store highlight + selectors → IHighlightRepository.add()
 *
 * Restoration:
 * 1. Load from storage  → IHighlightRepository.findAll()
 * 2. Restore DOM Range → MultiSelectorEngine.restore()
 * 3. Render highlight in UI
 *
 * @architecture Applies quality framework standards:
 * - JSDoc comments for all public methods
 * - Dependency injection via constructor
 * - Type-safe with strict TypeScript
 * - Proper error handling and logging
 */
export class VaultModeService {
  private repository: IHighlightRepository;
  private storage: IndexedDBStorage; // Keep for event/collection operations (legacy)
  private selectorEngine: MultiSelectorEngine;
  private logger: ILogger;

  /**
   * Creates a new VaultModeService instance
   * 
   * @param repository - Highlight repository for persistence (can be local, cloud, or dual-write)
   * @param storage - IndexedDBStorage for event sourcing and collections (legacy)
   * @param selectorEngine - Multi-selector engine for DOM Range operations
   * @param logger - Logger instance for debugging and monitoring
   */
  constructor(
    repository: IHighlightRepository,
    storage: IndexedDBStorage,
    selectorEngine: MultiSelectorEngine,
    logger: ILogger
  ) {
    this.repository = repository;
    this.storage = storage;
    this.selectorEngine = selectorEngine;
    this.logger = logger;
  }


  /**
   * Save a highlight to storage (local, cloud, or both depending on repository implementation)
   *
   * Flow:
   * 1. Generate multi-selectors from DOM Range
   * 2. Store highlight via repository pattern
   * 3. Create event for sync tracking
   *
   * @param highlight - Highlight data to save
   * @param range - DOM Range for selector generation
   * @param collectionId - Optional collection ID for organization
   * @returns Promise that resolves when highlight is saved
   * 
   * @throws Error if highlight cannot be saved
   */
  async saveHighlight(
    highlight: HighlightDataV2,
    range: Range,
    collectionId?: string
  ): Promise<void> {
    try {
      // Generate multi-selectors from the DOM Range
      const selectors = this.selectorEngine.createSelectors(range);

      // Store using repository pattern (local, cloud, or dual-write)
      await this.repository.add(highlight);

      // Also store in IndexedDB with selector metadata for restoration
      // This is a temporary dual-write until IndexedDB is fully replaced
      const url = window.location.href.split('#')[0];
      await this.storage.saveHighlight(highlight, collectionId || null, {
        selectors,
        url,
      });

      this.logger.info('[VAULT] Highlight saved', {
        id: highlight.id,
        text: highlight.text.substring(0, 50),
        repository: 'DualWrite',
      });
    } catch (error) {
      this.logger.error('[VAULT] Failed to save highlight', error as Error, {
        id: highlight.id,
      });
      throw error;
    }
  }


  /**
   * Restore highlights for the current URL
   *
   * Flow:
   * 1. Load highlights from IndexedDB for current URL
   * 2. For each highlight, restore DOM Range using multi-selector
   * 3. Return restored highlights with their ranges
   *
   * @returns Promise with array of restored highlights and ranges
   */
  async restoreHighlightsForUrl(): Promise<
    Array<{
      highlight: HighlightDataV2;
      range: Range | null;
      restoredUsing: 'xpath' | 'position' | 'fuzzy' | 'failed';
    }>
  > {
    try {
      const url = window.location.href.split('#')[0] || '';
      if (!url) return [];

      // 1. Fetch from Local Storage (IndexedDB) - Contains offline/unsynced work
      const localRecords = await this.storage.getHighlightsByUrl(url);

      // 2. Fetch from Repository (Cloud) - Contains cross-device work
      // Note: DualWriteRepo wraps InMemory (empty on reload) + Supabase
      // so this effectively fetches Cloud data
      let cloudHighlights: HighlightDataV2[] = [];
      try {
        cloudHighlights = await this.repository.findByUrl(url);
      } catch (err) {
        this.logger.warn('[VAULT] Failed to fetch cloud highlights', err);
        // Continue with local only
      }

      this.logger.info(`[VAULT] Restoration sources: Local=${localRecords.length}, Cloud=${cloudHighlights.length}`);

      // 3. Merge & Backfill
      // We use a Map to deduplicate by ID, prioritizing Local (usually more recent if modified)
      // but strictly speaking, we want to ensure we have *all* highlights.
      const mergedHighlights = new Map<string, { data: HighlightDataV2, selectors: MultiSelector | undefined }>();

      // Process Local Records
      for (const record of localRecords) {
        // Add to map even if selectors missing (will be marked as failed later)
        // ensuring we don't silently drop corrupt local data
        mergedHighlights.set(record.id, {
          data: record.data,
          selectors: record.metadata?.['selectors'] as MultiSelector | undefined
        });
      }

      // Process Cloud Highlights & Backfill
      for (const highlight of cloudHighlights) {
        if (!mergedHighlights.has(highlight.id)) {
          // This is a NEW item from cloud! 
          // Extract selector from ranges
          // Cast through unknown because we store the full MultiSelector in the selector field
          // even though the schema types it strictly as TextQuoteSelector
          const selector = highlight.ranges[0]?.selector as unknown as MultiSelector;

          mergedHighlights.set(highlight.id, {
            data: highlight,
            selectors: selector
          });

          if (selector) {
            // Backfill to IndexedDB so it's available offline next time
            this.logger.info('[VAULT] Backfilling cloud highlight to local storage', { id: highlight.id });
            this.storage.saveHighlight(highlight, null, {
              selectors: selector,
              url,
            }).catch(e => this.logger.error('[VAULT] Backfill failed', e));
          }
        }
      }

      this.logger.info(`[VAULT] Restoring ${mergedHighlights.size} merged highlights`);

      // 4. Restore Ranges
      const results = await Promise.all(
        Array.from(mergedHighlights.values()).map(async (item) => {
          if (!item.selectors) {
            this.logger.warn('[VAULT] No selectors found for highlight', item.data.id);
            return {
              highlight: item.data,
              range: null,
              restoredUsing: 'failed' as const,
            };
          }

          const range = await this.restoreHighlightRange(item.selectors);

          return {
            highlight: item.data,
            range,
            restoredUsing: this.determineRestorationTier(range, item.selectors),
          };
        })
      );

      return results;
    } catch (error) {
      this.logger.error('[VAULT] Failed to restore highlights:', error as Error);
      throw error;
    }
  }

  /**
   * Restore a single highlight's DOM Range using multi-selector
   *
   * Tries all 3 tiers: XPath → Position → Fuzzy
   *
   * @param selectors - Multi-selector data
   * @returns Restored Range or null
   */
  private async restoreHighlightRange(selectors: MultiSelector): Promise<Range | null> {
    try {
      return await this.selectorEngine.restore(selectors);
    } catch (error) {
      this.logger.error('Restoration error:', error as Error);
      return null;
    }
  }

  /**
   * Determine which tier was used for successful restoration
   *
   * @param range - Restored range
   * @param selectors - Multi-selector data
   * @returns Tier name
   */
  private determineRestorationTier(
    range: Range | null,
    selectors: MultiSelector
  ): 'xpath' | 'position' | 'fuzzy' | 'failed' {
    if (!range) return 'failed';

    // Try to determine which tier succeeded by testing each
    const rangeText = range.toString();

    if (rangeText === selectors.xpath.text) {
      // Text matches exactly - likely XPath or Position
      try {
        const xpathNode = document.evaluate(
          selectors.xpath.xpath,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        ).singleNodeValue;

        if (xpathNode) return 'xpath';
      } catch {
        // XPath failed, probably Position or Fuzzy
      }

      // Check if position matches
      const bodyText = document.body.textContent || '';
      const posText = bodyText.substring(
        selectors.position.startOffset,
        selectors.position.endOffset
      );

      if (posText === selectors.position.text) {
        return 'position';
      }
    }

    // Must be fuzzy if we got here
    return 'fuzzy';
  }

  /**
   * Delete a highlight from Vault Mode
   *
   * @param highlightId - Highlight ID to delete
   */
  async deleteHighlight(highlightId: string): Promise<void> {
    try {
      // Delete from IndexedDB (local storage)
      await this.storage.deleteHighlight(highlightId);

      // Delete from repository (triggers DualWriteRepository → cloud sync)
      await this.repository.remove(highlightId);

      this.logger.info('[VAULT] Highlight deleted', highlightId);
    } catch (error) {
      this.logger.error('[VAULT] Failed to delete highlight:', error as Error);
      throw error;
    }
  }

  /**
   * Get statistics about Vault Mode storage
   */
  async getStats(): Promise<{
    highlightCount: number;
    eventCount: number;
    collectionCount: number;
    tagCount: number;
    unsyncedCount: number;
  }> {
    return await this.storage.getStats();
  }

  /**
   * Sync unsynced data to server
   *
   * @returns Array of event IDs that were synced
   */
  async syncToServer(): Promise<string[]> {
    try {
      const unsyncedEvents = await this.storage.getUnsyncedEvents();
      const unsyncedHighlights = await this.storage.getUnsyncedHighlights();

      this.logger.info('[VAULT] Syncing to server', {
        events: unsyncedEvents.length,
        highlights: unsyncedHighlights.length,
      });

      // TODO: Implement actual API calls to sync server
      // For now, just mark as synced locally

      const eventIds = unsyncedEvents.map((e) => e.eventId);
      await this.storage.markEventsSynced(eventIds);

      for (const highlight of unsyncedHighlights) {
        await this.storage.markHighlightSynced(highlight.id);
      }

      this.logger.info('[VAULT] Sync complete', { syncedEvents: eventIds.length });

      return eventIds;
    } catch (error) {
      this.logger.error('[VAULT] Sync failed:', error as Error);
      throw error;
    }
  }

  /**
   * Clear all Vault Mode data (for testing/reset)
   */
  async clearAll(): Promise<void> {
    await this.storage.clearAll();
    this.logger.info('[VAULT] All Vault Mode data cleared');
  }
}

/**
 * Singleton instance
 */
let instance: VaultModeService | null = null;

/**
 * Get or create Vault Mode Service instance
 *
 * Implements Singleton pattern with lazy initialization.
 * Uses InMemoryHighlightRepository for backward compatibility.
 * To use DualWriteRepository (cloud sync), construct via DI container instead.
 *
 * @returns VaultModeService instance
 * @deprecated Use DI container for better testability and cloud sync support
 */
export function getVaultModeService(): VaultModeService {
  if (!instance) {
    // Import here to avoid circular dependencies
    const { InMemoryHighlightRepository } = require('@/background/repositories/in-memory-highlight-repository');

    const repository = new InMemoryHighlightRepository();
    const storage = new IndexedDBStorage();
    const selectorEngine = new MultiSelectorEngine();
    const logger: ILogger = {
      // eslint-disable-next-line no-console
      debug: (msg, ...args) => console.debug(msg, ...args),
      // eslint-disable-next-line no-console
      info: (msg, ...args) => console.info(msg, ...args),
      warn: (msg, ...args) => console.warn(msg, ...args),
      error: (msg, ...args) => console.error(msg, ...args),
      setLevel: () => { },
      getLevel: () => 1,
    };
    instance = new VaultModeService(repository, storage, selectorEngine, logger);
  }
  return instance;
}
