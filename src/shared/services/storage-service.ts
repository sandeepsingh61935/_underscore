/**
 * @file storage-service.ts
 * @description Domain-scoped storage service with event sourcing and encryption
 */

import { browser } from 'wxt/browser';

import { ValidationError } from '@/shared/errors/app-error';
import type { IStorage } from '@/shared/interfaces/i-storage';
import {
  DEFAULT_STORAGE_CONFIG,
  isValidHighlightEvent,
  computeHighlightCount,
  COLLECTIONS_INDEX_KEY,
} from '@/shared/types/storage';
import type {
  AnyHighlightEvent,
  CollectionsIndex,
  DomainStorage,
  EventLog,
  StorageConfig,
} from '@/shared/types/storage';
import { hashDomain, encryptData, decryptData } from '@/shared/utils/crypto-utils';
import { LoggerFactory } from '@/shared/utils/logger';
import type { ILogger } from '@/shared/utils/logger';

/**
 * Storage service for domain-scoped highlight persistence.
 * Used by Walk mode (24h TTL) and Sprint mode (permanent / null TTL).
 * Vault mode will add Supabase sync on top of this local store.
 *
 * Features:
 * - Event sourcing (append-only event log)
 * - Per-domain encryption
 * - Optional TTL-based expiration (null = permanent)
 * - Domain isolation
 *
 * @example
 * ```typescript
 * const storage = new StorageService();
 * await storage.saveEvent({
 *   type: 'highlight.created',
 *   timestamp: Date.now(),
 *   eventId: crypto.randomUUID(),
 *   data: highlight
 * });
 * ```
 */
export class StorageService implements IStorage {
  private logger: ILogger;
  private currentDomain: string;
  private config: StorageConfig;

  constructor(config: Partial<StorageConfig> = {}) {
    this.logger = LoggerFactory.getLogger('StorageService');

    // Handle both Window (Browser) and Service Worker (Background) contexts
    if (typeof window !== 'undefined' && window.location) {
      this.currentDomain = window.location.hostname;
    } else {
      // globalThis.location is available in ServiceWorker scope
      const swLocation = (globalThis as unknown as { location?: Location }).location;
      this.currentDomain = swLocation?.hostname || 'background-service';
    }

    this.config = { ...DEFAULT_STORAGE_CONFIG, ...config };
  }

  /**
   * Update the TTL duration used for subsequent saves.
   *
   * @remarks
   * Used by BasicMode to apply the user's configured Basic TTL preference
   * (24h/2d/7d/30d/forever) without needing a new StorageService instance.
   */
  setTtlDuration(ttlDurationMs: number | null): void {
    this.config = { ...this.config, ttlDuration: ttlDurationMs };
  }

  /**
   * Save event to storage
   * Appends to event log, applies TTL, encrypts
   */
  async saveEvent(event: AnyHighlightEvent): Promise<void> {
    // Validate event structure
    if (!isValidHighlightEvent(event)) {
      throw new ValidationError('Invalid highlight event structure', {
        eventType: (event as { type?: string }).type,
        eventId: (event as { eventId?: string }).eventId,
      });
    }

    try {
      // Get existing events
      const events = await this.loadEvents();

      // Append new event
      events.push(event);

      // Trim to max size (keep recent events)
      const trimmed = events.slice(-this.config.maxEventsPerDomain);

      // Save
      await this.saveEvents(trimmed);

      this.logger.debug('Event saved', { type: event.type, eventId: event.eventId });
    } catch (error) {
      // Re-throw ValidationError as-is
      if (error instanceof ValidationError) {
        throw error;
      }
      this.logger.error('Failed to save event', error as Error);
      throw error;
    }
  }

  /**
   * Load events from storage
   * Returns empty array if expired or not found
   */
  async loadEvents(): Promise<AnyHighlightEvent[]> {
    try {
      const hashedDomain = await hashDomain(this.currentDomain);

      this.logger.info('[LOAD] Starting load operation', {
        domain: this.currentDomain,
        hashedDomain,
      });

      // Debug: Dump all storage keys
      const allKeys = await browser.storage.local.get(null);
      this.logger.info('[LOAD] Storage dump', {
        totalKeys: Object.keys(allKeys).length,
        allKeys: Object.keys(allKeys),
        ourKey: hashedDomain,
        keyExists: hashedDomain in allKeys,
      });

      const result = await browser.storage.local.get(hashedDomain);

      if (!result[hashedDomain]) {
        this.logger.warn('[ERROR] [LOAD] No data found', {
          domain: this.currentDomain,
          hashedDomain,
        });
        return [];
      }

      const domainStorage = result[hashedDomain] as DomainStorage;

      this.logger.info('[LOAD] Found data', {
        domain: this.currentDomain,
        lastModified: new Date(domainStorage.lastAccessed).toISOString(),
        ttl: domainStorage.ttl,
      });

      // Check TTL — null means permanent, skip expiry check
      const now = Date.now();
      let hoursUntilExpiry = Infinity;

      if (domainStorage.ttl !== null) {
        const timeUntilExpiry = domainStorage.ttl - now;
        hoursUntilExpiry = timeUntilExpiry / (1000 * 60 * 60);

        this.logger.info('[LOAD] TTL check', {
          now,
          ttl: domainStorage.ttl,
          hoursUntilExpiry: hoursUntilExpiry.toFixed(2),
          isExpired: now > domainStorage.ttl,
        });

        if (now > domainStorage.ttl) {
          this.logger.warn('⏰ [LOAD] Data EXPIRED - clearing', {
            domain: this.currentDomain,
            expiredAt: new Date(domainStorage.ttl).toISOString(),
          });
          await browser.storage.local.remove(hashedDomain);
          return [];
        }
      } else {
        this.logger.info('[LOAD] TTL check skipped (permanent storage)');
      }

      // Decrypt
      const decrypted = await decryptData(domainStorage.data, this.currentDomain);
      const eventLog: EventLog = JSON.parse(decrypted);

      // Validate events
      const validEvents = eventLog.events.filter(isValidHighlightEvent);

      if (validEvents.length !== eventLog.events.length) {
        this.logger.warn('Invalid events filtered', {
          total: eventLog.events.length,
          valid: validEvents.length,
        });
      }

      this.logger.info('[OK] [LOAD] Events loaded successfully', {
        domain: this.currentDomain,
        count: validEvents.length,
        hoursUntilExpiry: isFinite(hoursUntilExpiry) ? hoursUntilExpiry.toFixed(2) : 'permanent',
      });

      const sorted = validEvents.sort((a, b) => a.timestamp - b.timestamp);

      // Lazy backfill: if this domain has no index entry yet, create one now.
      // Covers highlights saved before __collections_index existed.
      await this.backfillIndexIfMissing(hashedDomain, sorted, domainStorage.ttl);

      return sorted;
    } catch (error) {
      this.logger.error('Failed to load events', error as Error);
      return []; // Fail gracefully
    }
  }

  /**
   * Backfill __collections_index for domains that pre-date the index.
   * Called lazily on first load of each domain after the migration.
   */
  private async backfillIndexIfMissing(
    hashedDomain: string,
    events: AnyHighlightEvent[],
    ttl: number | null
  ): Promise<void> {
    try {
      const result = await browser.storage.local.get(COLLECTIONS_INDEX_KEY);
      const index: CollectionsIndex = (result[COLLECTIONS_INDEX_KEY] as CollectionsIndex) ?? {};

      if (hashedDomain in index) return; // Already indexed

      const count = computeHighlightCount(events);
      if (count === 0) return; // Nothing to index

      const lastActive =
        events.length > 0 ? Math.max(...events.map(e => e.timestamp)) : Date.now();

      index[hashedDomain] = {
        domain: this.currentDomain,
        mode: this.config.mode,
        count,
        lastActive,
        ttl,
      };

      await browser.storage.local.set({ [COLLECTIONS_INDEX_KEY]: index });
      this.logger.info('[MIGRATE] Backfilled collections index', {
        domain: this.currentDomain,
        count,
      });
    } catch (err) {
      this.logger.warn('Failed to backfill collections index', { error: (err as Error).message });
    }
  }

  /**
   * Save events to storage
   */
  private async saveEvents(events: AnyHighlightEvent[]): Promise<void> {
    const hashedDomain = await hashDomain(this.currentDomain);

    this.logger.info('[SAVE] Starting save operation', {
      domain: this.currentDomain,
      hashedDomain,
      eventCount: events.length,
    });

    // Create event log
    const eventLog: EventLog = { events };

    // Encrypt
    const encrypted = await encryptData(JSON.stringify(eventLog), this.currentDomain);

    // Calculate TTL — null means permanent
    const now = Date.now();
    const ttl = this.config.ttlDuration !== null ? now + this.config.ttlDuration : null;

    this.logger.info('[SAVE] TTL calculation', {
      now,
      ttlDuration: this.config.ttlDuration,
      ttl,
      permanent: ttl === null,
    });

    // Create storage object
    const domainStorage: DomainStorage = {
      data: encrypted,
      ttl,
      lastAccessed: now,
      version: 1,
    };

    // Save
    await browser.storage.local.set({ [hashedDomain]: domainStorage });

    // Update plain-domain collections index
    await this.updateCollectionsIndex(hashedDomain, events, ttl, now);

    this.logger.info('[OK] [SAVE] Save completed', {
      savedTtl: ttl !== null ? new Date(ttl).toISOString() : 'permanent',
      eventCount: events.length,
    });
  }

  /** Update __collections_index entry for the current domain */
  private async updateCollectionsIndex(
    hashedDomain: string,
    events: AnyHighlightEvent[],
    ttl: number | null,
    now: number
  ): Promise<void> {
    try {
      const result = await browser.storage.local.get(COLLECTIONS_INDEX_KEY);
      const index: CollectionsIndex = (result[COLLECTIONS_INDEX_KEY] as CollectionsIndex) ?? {};

      const count = computeHighlightCount(events);
      const lastActive = events.length > 0 ? Math.max(...events.map(e => e.timestamp)) : now;

      index[hashedDomain] = {
        domain: this.currentDomain,
        mode: this.config.mode,
        count,
        lastActive,
        ttl,
      };

      await browser.storage.local.set({ [COLLECTIONS_INDEX_KEY]: index });
    } catch (err) {
      this.logger.warn('Failed to update collections index', { error: (err as Error).message });
    }
  }

  /**
   * Clear all events for current domain
   */
  async clear(): Promise<void> {
    const hashedDomain = await hashDomain(this.currentDomain);
    await browser.storage.local.remove(hashedDomain);

    // Remove from collections index
    try {
      const result = await browser.storage.local.get(COLLECTIONS_INDEX_KEY);
      const index: CollectionsIndex = (result[COLLECTIONS_INDEX_KEY] as CollectionsIndex) ?? {};
      if (hashedDomain in index) {
        delete index[hashedDomain];
        await browser.storage.local.set({ [COLLECTIONS_INDEX_KEY]: index });
      }
    } catch (err) {
      this.logger.warn('Failed to remove from collections index', { error: (err as Error).message });
    }

    this.logger.info('Storage cleared', { domain: this.currentDomain });
  }

  /**
   * Get storage stats
   */
  async getStats(): Promise<{ eventCount: number; ttl: Date | null }> {
    const hashedDomain = await hashDomain(this.currentDomain);
    const result = await browser.storage.local.get(hashedDomain);

    if (!result[hashedDomain]) {
      return { eventCount: 0, ttl: null };
    }

    const events = await this.loadEvents();
    const domainStorage = result[hashedDomain] as DomainStorage;

    return {
      eventCount: events.length,
      ttl: domainStorage.ttl !== null ? new Date(domainStorage.ttl) : null,
    };
  }
}
