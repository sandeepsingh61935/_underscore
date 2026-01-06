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
    selectorEngine: MultiSelectorEngine,
    logger: ILogger
  ) {
    this.repository = repository;
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
    range: Range
  ): Promise<void> {
    try {
      // Generate multi-selectors from the DOM Range
      const selectors = this.selectorEngine.createSelectors(range);

      // Store using repository pattern (local, cloud, or dual-write)
      // Note: We embed selectors directly into the highlight ranges
      // This eliminates the need for separate IndexedDB selector storage

      // key: Ensure we don't save DOM objects (liveRanges) to IndexedDB
      // clone the object to avoid mutating the runtime instance if shared
      const payload = { ...highlight };

      // Remove runtime-only properties that cause DataCloneError
      if ('liveRanges' in payload) {
        delete (payload as any).liveRanges;
      }

      // Attach the generated selectors to the first range
      if (payload.ranges && payload.ranges.length > 0) {
        payload.ranges[0] = {
          ...payload.ranges[0],
          selector: selectors
        };
      }

      await this.repository.add(payload);

      this.logger.info('[VAULT] Highlight saved', {
        id: payload.id,
        text: payload.text.substring(0, 50),
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

      // Fetch from Repository (DualWriteRepo handles local + cloud merging)
      const highlights = await this.repository.findByUrl(url);

      this.logger.info(`[VAULT] Restoring ${highlights.length} highlights from repository`);

      // Restore Ranges
      const results = await Promise.all(
        highlights.map(async (highlight) => {
          // Selectors are embedded in the highlight ranges (HighlightDataV2 schema)
          // We cast because schema parser might not be strictly typed for full object
          const selector = highlight.ranges[0]?.selector as unknown as MultiSelector;

          if (!selector) {
            this.logger.warn('[VAULT] No selectors found for highlight', highlight.id);
            return {
              highlight: highlight,
              range: null,
              restoredUsing: 'failed' as const,
            };
          }

          const range = await this.restoreHighlightRange(selector);

          return {
            highlight: highlight,
            range,
            restoredUsing: this.determineRestorationTier(range, selector),
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
   * Find a highlight by its content hash (for deduplication)
   * 
   * @param contentHash - Hash of the text content
   * @returns Highlight object if found, null otherwise
   */
  async findByContentHash(contentHash: string): Promise<HighlightDataV2 | null> {
    if ('findByContentHash' in this.repository && typeof (this.repository as any).findByContentHash === 'function') {
      return (this.repository as any).findByContentHash(contentHash);
    }
    return null;
  }

  /**
   * Delete a highlight from Vault Mode
   *
   * @param highlightId - Highlight ID to delete
   */
  async deleteHighlight(highlightId: string): Promise<void> {
    try {
      // Delete from repository only (Single Source of Truth)
      // Implementation handles local/cloud dual write
      await this.repository.remove(highlightId);

      this.logger.info('[VAULT] Highlight deleted', highlightId);
    } catch (error) {
      this.logger.error('[VAULT] Failed to delete highlight:', error as Error);
      throw error;
    }
  }

  /**
   * Get statistics about Vault Mode storage
   * @deprecated Vault Mode no longer uses direct storage access
   */
  async getStats(): Promise<{
    highlightCount: number;
    eventCount: number;
    collectionCount: number;
    tagCount: number;
    unsyncedCount: number;
  }> {
    // Return dummy stats as storage is removed
    return {
      highlightCount: 0,
      eventCount: 0,
      collectionCount: 0,
      tagCount: 0,
      unsyncedCount: 0
    };
  }

  /**
   * Sync unsynced data to server
   * @deprecated Sync is now handled automatically by DualWriteRepository
   */
  async syncToServer(): Promise<string[]> {
    this.logger.info('[VAULT] Manual sync requested - handled by repository automatically');
    return [];
  }

  /**
   * Clear all Vault Mode data (for testing/reset)
   * Note: This only clears local repository now
   */
  async clearAll(): Promise<void> {
    // Only clear if repository supports it (optional interface)
    if ('clear' in this.repository && typeof (this.repository as any).clear === 'function') {
      await (this.repository as any).clear();
    }
    this.logger.info('[VAULT] Vault Mode repository data cleared');
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
    instance = new VaultModeService(repository, selectorEngine, logger);
  }
  return instance;
}
