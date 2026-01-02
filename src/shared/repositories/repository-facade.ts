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
 */

import type { HighlightDataV2, SerializedRange } from '../schemas/highlight-schema';
import { LoggerFactory } from '../utils/logger';
import type { ILogger } from '../utils/logger';

import type { IHighlightRepository } from './i-highlight-repository';
import { RepositoryFactory } from './repository-factory';

/**
 * Synchronous Repository Facade
 *
 * Provides synchronous API by maintaining in-memory cache
 * All persistence happens async in background
 *
 * Usage:
 * ```typescript
 * const facade = new RepositoryFacade();
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

  constructor(repository?: IHighlightRepository) {
    this.repository = repository || RepositoryFactory.getHighlightRepository();
    this.logger = LoggerFactory.getLogger('RepositoryFacade');
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

  // ============================================
  // SYNCHRONOUS API (from cache)
  // ============================================

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
   * Update highlight (sync)
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
    console.log('[REPO-DEBUG] count() called, cache.size:', this.cache.size, 'cache keys:', Array.from(this.cache.keys()));
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
   * Add from data (backward compatibility with HighlightStore)
   * Automatically migrates old format to V2
   */
  async addFromData(data: unknown): Promise<void> {
    this.ensureInitialized();

    // Import migration service dynamically
    const { MigrationService } = await import('../services/migration-service');
    const migration = new MigrationService();

    // Auto-migrate to latest version
    const v2Data = await migration.migrateToLatest(data);

    // Add migrated data
    this.add(v2Data);

    this.logger.info('Data added (with migration if needed)', {
      id: v2Data.id,
      wasMigrated: migration.needsMigration(data),
    });
  }
}
