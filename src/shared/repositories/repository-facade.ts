/**
 * @file repository-facade.ts
 * @description Synchronous Facade over async Repository
 *
 * Design Patterns Applied:
 * - Facade Pattern: Simple sync interface over complex async Repository
 * - Cache Pattern: In-memory cache for fast synchronous access
 * - Lazy Loading: Async initialization, sync access thereafter
 *
 * From Quality Framework: "Facade Pattern for complex subsystems"
 *
 * Consolidated from src/background/repositories/repository-facade.ts
 * (had getCollections/getHighlightsByDomain/getDashboardData) and the prior
 * bare shared version (had getHighlightsForUrl). This is the single shared
 * facade used by both background and content contexts.
 */

import type { HighlightDataV2, SerializedRange } from '../schemas/highlight-schema';
import { LoggerFactory } from '../utils/logger';
import type { ILogger } from '../utils/logger';

import type {
  IHighlightRepository,
  IReadableHighlightRepository,
} from './i-highlight-repository';

/**
 * Synchronous Repository Facade
 *
 * Provides synchronous API by maintaining in-memory cache
 * All persistence happens async in background
 *
 * Usage:
 * ```typescript
 * const facade = new RepositoryFacade(repository);
 * await facade.initialize();  // Once at startup
 *
 * // Then use synchronously
 * facade.add(highlight);  // Sync!
 * const all = facade.getAll();  // Sync!
 * ```
 */
export class RepositoryFacade {
  private repository: IHighlightRepository;
  private cache = new Map<string, HighlightDataV2>();
  private contentHashIndex = new Map<string, string>();
  private initialized = false;
  private logger: ILogger;

  constructor(repository: IHighlightRepository) {
    if (!repository) throw new Error('Repository is required');
    this.repository = repository;
    this.logger = LoggerFactory.getLogger('RepositoryFacade');
  }

  /**
   * Underlying storage readable (IndexedDB / dual-write). Reads may lag
   * behind the in-memory cache immediately after facade writes.
   */
  getReadable(): IReadableHighlightRepository {
    return this.repository;
  }

  /**
   * Readable backed by the facade cache. Use in the background for Library
   * queries so deletes/adds are visible before async IndexedDB persistence.
   */
  asCacheReadable(): IReadableHighlightRepository {
    const facade = this;
    return {
      findAll: async () => facade.getAll(),
      findById: async (id) => facade.get(id) ?? null,
      findByUrl: async (url) => facade.findByUrl(url),
      findByContentHash: async (hash) => facade.findByContentHash(hash) ?? null,
      findOverlapping: async (range) => facade.findOverlapping(range),
      count: async () => facade.count(),
      exists: async (id) => facade.has(id),
    };
  }

  /**
   * Initialize facade (async, called once at startup)
   * Loads existing data into cache
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.warn('Facade already initialized');
      return;
    }

    try {
      // Load all existing data into cache
      const all = await this.repository.findAll();

      for (const item of all) {
        this.cache.set(item.id, item);
        this.contentHashIndex.set(item.contentHash, item.id);
      }

      this.initialized = true;

      this.logger.info('Repository facade initialized', {
        count: this.cache.size,
      });
    } catch (error) {
      this.logger.error('Failed to initialize facade', error as Error);
      throw error;
    }
  }

  /**
   * Ensure facade is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('RepositoryFacade not initialized. Call initialize() first.');
    }
  }

  /**
   * Reload facade cache from the underlying repository.
   * Used after auth state changes (login/logout) so the cache reflects
   * the new user's data instead of the previous session's.
   */
  async reload(): Promise<void> {
    this.cache.clear();
    this.contentHashIndex.clear();
    this.initialized = false;
    await this.initialize();
  }

  // ============================================
  // SYNCHRONOUS API (from cache)
  // ============================================

  /**
   * Fire-and-forget add: cache immediately, persist async without awaiting.
   *
   * Prefer {@link addPersisted} for user-facing create/save paths where
   * reload/library correctness depends on IndexedDB (or IPC) completing.
   * Keep `add` for best-effort cache warm-ups where awaiting is impractical.
   */
  add(highlight: HighlightDataV2): void {
    this.ensureInitialized();

    // Update cache immediately (sync)
    this.cache.set(highlight.id, highlight);
    this.contentHashIndex.set(highlight.contentHash, highlight.id);

    this.logger.debug('Added to cache', { id: highlight.id });

    // Persist async in background (fire and forget)
    this.repository.add(highlight).catch((error) => {
      this.logger.error('Background persist failed', error);
    });
  }

  /**
   * Add to cache and await durable repository persistence.
   * Use for create/save (content → background IPC/IDB) and bridge handlers
   * that must not return success until the row is stored.
   */
  async addPersisted(highlight: HighlightDataV2): Promise<void> {
    this.ensureInitialized();

    this.cache.set(highlight.id, highlight);
    this.contentHashIndex.set(highlight.contentHash, highlight.id);
    this.logger.debug('Added to cache (persisted)', { id: highlight.id });

    await this.repository.add(highlight);
  }

  /**
   * Batch add with awaited durable persistence.
   */
  async addManyPersisted(highlights: HighlightDataV2[]): Promise<void> {
    this.ensureInitialized();

    for (const highlight of highlights) {
      this.cache.set(highlight.id, highlight);
      this.contentHashIndex.set(highlight.contentHash, highlight.id);
    }
    this.logger.debug('Added many to cache (persisted)', { count: highlights.length });

    await this.repository.addMany(highlights);
  }

  /**
   * Remove highlight (sync)
   */
  remove(id: string): void {
    this.ensureInitialized();

    const highlight = this.cache.get(id);
    if (!highlight) {
      this.logger.debug('Highlight not in cache', { id });
      return;
    }

    // Remove from cache immediately (sync)
    this.cache.delete(id);
    this.contentHashIndex.delete(highlight.contentHash);

    this.logger.debug('Removed from cache', { id });

    // Persist async in background
    this.repository.remove(id).catch((error) => {
      this.logger.error('Background removal failed', error);
    });
  }

  /**
   * Remove from cache and await IndexedDB persistence (destructive deletes).
   */
  async removePersisted(id: string): Promise<void> {
    this.ensureInitialized();

    const highlight = this.cache.get(id);
    if (!highlight) {
      this.logger.debug('Highlight not in cache', { id });
      return;
    }

    this.cache.delete(id);
    this.contentHashIndex.delete(highlight.contentHash);
    this.logger.debug('Removed from cache', { id });

    await this.repository.remove(id);
  }

  /**
   * Drop a highlight from the in-memory cache only (no repository write).
   * Used after background-authoritative deletes so content does not re-send IPC_HIGHLIGHT_REMOVE.
   */
  evict(id: string): void {
    this.ensureInitialized();

    const highlight = this.cache.get(id);
    if (!highlight) return;

    this.cache.delete(id);
    this.contentHashIndex.delete(highlight.contentHash);
    this.logger.debug('Evicted from cache', { id });
  }

  /**
   * Add a highlight to the in-memory cache only (no repository write).
   * Used when background already persisted the row (e.g. undo restore).
   */
  rehydrate(highlight: HighlightDataV2): void {
    this.ensureInitialized();
    this.cache.set(highlight.id, highlight);
    this.contentHashIndex.set(highlight.contentHash, highlight.id);
    this.logger.debug('Rehydrated cache', { id: highlight.id });
  }

  /**
   * Fire-and-forget update. Prefer {@link updatePersisted} for bridge IPC.
   */
  update(id: string, updates: Partial<HighlightDataV2>): void {
    this.ensureInitialized();

    const existing = this.cache.get(id);
    if (!existing) {
      throw new Error(`Highlight not found: ${id}`);
    }

    // Update cache immediately (sync)
    const updated: HighlightDataV2 = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    this.cache.set(id, updated);

    // Update content hash index if changed
    if (updates.contentHash && updates.contentHash !== existing.contentHash) {
      this.contentHashIndex.delete(existing.contentHash);
      this.contentHashIndex.set(updates.contentHash, id);
    }

    this.logger.debug('Updated in cache', { id });

    // Persist async in background
    this.repository.update(id, updates).catch((error) => {
      this.logger.error('Background update failed', error);
    });
  }

  /**
   * Update cache and await durable repository persistence.
   */
  async updatePersisted(id: string, updates: Partial<HighlightDataV2>): Promise<void> {
    this.ensureInitialized();

    const existing = this.cache.get(id);
    if (!existing) {
      throw new Error(`Highlight not found: ${id}`);
    }

    const updated: HighlightDataV2 = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    this.cache.set(id, updated);

    if (updates.contentHash && updates.contentHash !== existing.contentHash) {
      this.contentHashIndex.delete(existing.contentHash);
      this.contentHashIndex.set(updates.contentHash, id);
    }

    this.logger.debug('Updated in cache (persisted)', { id });
    await this.repository.update(id, updates);
  }

  /**
   * Get highlight by ID (sync)
   */
  get(id: string): HighlightDataV2 | undefined {
    this.ensureInitialized();
    return this.cache.get(id);
  }

  /**
   * Get all highlights (sync)
   */
  getAll(): HighlightDataV2[] {
    this.ensureInitialized();
    const all = Array.from(this.cache.values());
    return all;
  }

  /**
   * Find by content hash (sync)
   */
  findByContentHash(hash: string): HighlightDataV2 | undefined {
    this.ensureInitialized();

    const id = this.contentHashIndex.get(hash);
    if (!id) return undefined;

    return this.cache.get(id);
  }

  /**
   * Find highlights by page URL (sync, filters from cache)
   *
   * Same pattern as the BackgroundHighlightOrchestrator's
   * onFindByUrl handler: filter the in-memory cache by URL.
   */
  findByUrl(url: string): HighlightDataV2[] {
    this.ensureInitialized();
    return this.getAll().filter((h) => h.url === url);
  }

  /**
   * Find overlapping highlights (sync)
   */
  findOverlapping(_range: SerializedRange): HighlightDataV2[] {
    this.ensureInitialized();

    // TODO: Implement range overlap detection
    // For now, return empty array
    return [];
  }

  /**
   * Check if highlight exists (sync)
   */
  has(id: string): boolean {
    this.ensureInitialized();
    return this.cache.has(id);
  }

  /**
   * Get count (sync)
   */
  count(): number {
    this.ensureInitialized();
    this.logger.debug('count() called', {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    });
    return this.cache.size;
  }

  /**
   * Clear all (sync)
   */
  clear(): void {
    this.ensureInitialized();

    this.cache.clear();
    this.contentHashIndex.clear();

    this.logger.warn('Cleared cache');

    // Persist async in background
    this.repository.clear().catch((error) => {
      this.logger.error('Background clear failed', error);
    });
  }

  /**
   * Clear cache and await IndexedDB persistence (library wipe).
   */
  async clearPersisted(): Promise<void> {
    this.ensureInitialized();

    this.cache.clear();
    this.contentHashIndex.clear();
    this.logger.warn('Cleared cache');

    await this.repository.clear();
  }

  /**
   * Bulk add (sync)
   */
  addMany(highlights: HighlightDataV2[]): void {
    this.ensureInitialized();

    for (const hl of highlights) {
      this.cache.set(hl.id, hl);
      this.contentHashIndex.set(hl.contentHash, hl.id);
    }

    this.logger.info('Bulk added to cache', { count: highlights.length });

    // Persist async in background
    this.repository.addMany(highlights).catch((error) => {
      this.logger.error('Background bulk add failed', error);
    });
  }

  /**
   * Get highlights for a specific URL (async)
   *
   * Convenience wrapper used by the content restore pipeline
   * (src/entrypoints/content.ts:646). Falls back to initializing
   * the facade on first call.
   */
  async getHighlightsForUrl(url: string): Promise<HighlightDataV2[]> {
    await this.initialize();
    return this.findByUrl(url);
  }
}
