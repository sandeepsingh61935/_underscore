import { MultiSelectorEngine, type MultiSelector } from './multi-selector-engine';

import type { ILogger } from '@/shared/interfaces/i-logger';
import type { HighlightDataV2, TextQuoteSelector } from '@/shared/schemas/highlight-schema';
import type { RepositoryFacade } from '@/shared/repositories/repository-facade';
import { TextQuoteFinder } from '@/content/utils/text-quote-finder';
import { getCapturePageUrl, normalizePageUrl } from '@/shared/utils/normalize-page-url';

/**
 * Discriminated union: a highlight range's selector is either the W3C
 * TextQuoteSelector (current format written by saveHighlight) or the legacy
 * multi-tier MultiSelector (xpath/position/fuzzy). restoreHighlightRange
 * dispatches between them.
 */
type HighlightSelector = TextQuoteSelector | MultiSelector;

/**
 * @file cloud-mode-service.ts
 * @description Vault Mode Service - Integration Layer for highlight persistence
 *
 * Coordinates between Multi-Selector Engine and storage layer.
 * Implements the Facade pattern following quality framework guidelines.
 *
 * Per ADR-005, the service holds a RepositoryFacade (synchronous read/write
 * over the in-memory cache). Writes are fire-and-forget; reads are
 * immediate. This replaces the prior IHighlightRepository dependency
 * because the IPC adapter (the only thing available in content context)
 * is write-only.
 */
export class CloudModeService {
  private facade: RepositoryFacade;
  private selectorEngine: MultiSelectorEngine;
  private quoteFinder: TextQuoteFinder;
  private logger: ILogger;

  constructor(
    facade: RepositoryFacade,
    selectorEngine: MultiSelectorEngine,
    logger: ILogger
  ) {
    this.facade = facade;
    this.selectorEngine = selectorEngine;
    this.quoteFinder = new TextQuoteFinder();
    this.logger = logger;
  }


  /**
   * Save a highlight via the facade
   *
   * Flow:
   * 1. Generate multi-selectors from DOM Range
   * 2. Store highlight via facade.add
   * 3. Facade persists asynchronously in the background
   *
   * @param highlight - Highlight data to save
   * @param range - DOM Range for selector generation
   * @param options - Repository options (e.g. skipSync)
   * @returns Promise that resolves when highlight is saved
   *
   * @throws Error if highlight cannot be saved
   */
  async saveHighlight(
    highlight: HighlightDataV2,
    _range: Range
  ): Promise<void> {
    try {
      // Store using repository pattern (local, cloud, or dual-write)
      // Note: We embed a W3C TextQuoteSelector directly into the highlight
      // ranges; this eliminates the need for separate IndexedDB selector
      // storage. The MultiSelectorEngine is still used for restoration
      // via restoreHighlight().

      // key: Ensure we don't save DOM objects (liveRanges) to IndexedDB
      // clone the object to avoid mutating the runtime instance if shared
      const payload = { ...highlight };

      // Remove runtime-only properties that cause DataCloneError
      if ('liveRanges' in payload) {
        delete (payload as any).liveRanges;
      }

      // Attach a TextQuoteSelector to the first range
      if (payload.ranges && payload.ranges.length > 0) {
        const first = payload.ranges[0]!;
        payload.ranges[0] = {
          xpath: first.xpath,
          startOffset: first.startOffset,
          endOffset: first.endOffset,
          text: first.text,
          textBefore: first.textBefore,
          textAfter: first.textAfter,
          selector: {
            type: 'TextQuoteSelector',
            exact: highlight.text,
          },
        };
      }

      // Library / restore-by-url require url; never persist without it.
      if (!payload.url) {
        payload.url =
          typeof window !== 'undefined' ? getCapturePageUrl() : '';
      }

      // Activity sort (library Recent / sections) uses updatedAt when present.
      if (!payload.updatedAt) {
        payload.updatedAt = payload.createdAt ? new Date(payload.createdAt) : new Date();
      }

      // Await durable content→background write so createHighlight cannot return
      // before IPC/IDB has been attempted (PRD L1).
      await this.facade.addPersisted(payload);

      this.logger.info('[VAULT] Highlight saved', {
        id: payload.id,
        text: payload.text.substring(0, 50),
        repository: 'Facade',
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
      restoredUsing: 'xpath' | 'position' | 'fuzzy' | 'text-quote' | 'failed';
    }>
  > {
    try {
      const url = getCapturePageUrl();
      if (!url) return [];

      this.logger.info(`[VAULT] [QUERY] Querying highlights for URL: ${url}`);

      // Fetch from Repository (DualWriteRepo handles local + cloud merging)
      const highlights = this.facade
        .getAll()
        .filter((h) => h.url && normalizePageUrl(h.url) === url);

      this.logger.info(`[VAULT] [HIT] Found ${highlights.length} highlights from repository`);

      // Restore Ranges — tolerate missing/legacy shapes so one bad row
      // cannot abort the whole page restore (ranges undefined → [0] crash).
      const results = await Promise.all(
        highlights.map(async (highlight) => {
          try {
            const selector = this.extractSelector(highlight);
            if (!selector) {
              this.logger.warn('[VAULT] No selectors found for highlight', {
                id: highlight.id,
                hasRanges: Array.isArray(highlight.ranges),
              });
              return {
                highlight,
                range: null,
                restoredUsing: 'failed' as const,
              };
            }

            const range = await this.restoreHighlightRange(selector);
            return {
              highlight,
              range,
              restoredUsing: this.determineRestorationTier(range, selector),
            };
          } catch (rowError) {
            this.logger.error(
              '[VAULT] Failed to restore one highlight; continuing others',
              rowError as Error,
              { id: highlight.id }
            );
            return {
              highlight,
              range: null,
              restoredUsing: 'failed' as const,
            };
          }
        })
      );

      return results;
    } catch (error) {
      this.logger.error('[VAULT] Failed to restore highlights:', error as Error);
      throw error;
    }
  }

  /**
   * Pull a restorable selector from V2 ranges or legacy flat `selectors`.
   * Safe when `ranges` is missing/undefined (cloud or partial rows).
   */
  private extractSelector(highlight: HighlightDataV2): HighlightSelector | null {
    const ranges = highlight.ranges;
    if (Array.isArray(ranges) && ranges.length > 0) {
      const embedded = ranges[0]?.selector as unknown as HighlightSelector | undefined;
      if (embedded) return embedded;
    }

    const legacy = (highlight as { selectors?: HighlightSelector }).selectors;
    if (legacy) return legacy;

    return null;
  }

  /**
   * Restore a single highlight (Public API)
   * Useful for real-time sync / instant rendering
   * 
   * @param highlight - Highlight to restore
   * @returns Restoration result with range and tier used
   */
  async restoreHighlight(highlight: HighlightDataV2): Promise<{
    range: Range | null;
    restoredUsing: 'xpath' | 'position' | 'fuzzy' | 'text-quote' | 'failed';
  }> {
    try {
      this.logger.info('[VAULT] Restoring single highlight', {
        id: highlight.id,
        hasRanges: !!highlight.ranges,
        rangesType: typeof highlight.ranges,
        rangesIsArray: Array.isArray(highlight.ranges)
      });

      const selector = this.extractSelector(highlight);
      if (!selector) {
        this.logger.warn('[VAULT] No selectors found for highlight', {
          id: highlight.id,
          hasRanges: Array.isArray(highlight.ranges),
        });
        return { range: null, restoredUsing: 'failed' };
      }

      const range = await this.restoreHighlightRange(selector);

      return {
        range,
        restoredUsing: this.determineRestorationTier(range, selector),
      };
    } catch (error) {
      this.logger.error('[VAULT] Failed to restore single highlight', error as Error);
      return {
        range: null,
        restoredUsing: 'failed',
      };
    }
  }

  /**
   * Restore a single highlight's DOM Range from its serialized selector.
   *
   * Dispatches on selector shape:
   * - TextQuoteSelector (W3C) → TextQuoteFinder.find() (current format)
   * - MultiSelector (legacy) → MultiSelectorEngine.restore() (xpath/position/fuzzy)
   *
   * @param selectors - The serialized selector carried in the highlight range
   * @returns Restored Range or null
   */
  private async restoreHighlightRange(selectors: HighlightSelector): Promise<Range | null> {
    try {
      if (this.isTextQuoteSelector(selectors)) {
        return this.quoteFinder.find(selectors);
      }
      return await this.selectorEngine.restore(selectors);
    } catch (error) {
      this.logger.error('Restoration error:', error as Error);
      return null;
    }
  }

  /**
   * Type guard: discriminate TextQuoteSelector from MultiSelector by its
   * `type` discriminator field. W3C TextQuoteSelector uses
   * `type: 'TextQuoteSelector'`; legacy MultiSelector has no such field.
   */
  private isTextQuoteSelector(
    selector: HighlightSelector
  ): selector is TextQuoteSelector {
    return (
      typeof selector === 'object' &&
      selector !== null &&
      'type' in selector &&
      (selector as { type: unknown }).type === 'TextQuoteSelector'
    );
  }

  /**
   * Determine which tier was used for successful restoration
   *
   * @param range - Restored range
   * @param selectors - Selector data (TextQuoteSelector or MultiSelector)
   * @returns Tier name
   */
  private determineRestorationTier(
    range: Range | null,
    selectors: HighlightSelector
  ): 'xpath' | 'position' | 'fuzzy' | 'text-quote' | 'failed' {
    if (!range) return 'failed';

    if (this.isTextQuoteSelector(selectors)) {
      return 'text-quote';
    }

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
    return this.facade.findByContentHash(contentHash) ?? null;
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
      this.facade.remove(highlightId);

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
    this.facade.clear();
    this.logger.info('[VAULT] Vault Mode repository data cleared');
  }
}

/**
 * Singleton helper removed. Construct CloudModeService directly (typically
 * via the DI container) so dependencies are explicit and testable.
 */
