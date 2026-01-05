/**
 * @file storage-service.ts
 * @description Domain-scoped storage service with event sourcing and encryption
 */

import { browser } from 'wxt/browser';

import { ValidationError } from '@/shared/errors/app-error';
import type { IStorage } from '@/shared/interfaces/i-storage';
import type {
  AnyHighlightEvent,
  DomainStorage,
  EventLog,
  StorageConfig,
} from '@/shared/types/storage';
import { DEFAULT_STORAGE_CONFIG, isValidHighlightEvent } from '@/shared/types/storage';
import { hashDomain, encryptData, decryptData } from '@/shared/utils/crypto-utils';
import { LoggerFactory } from '@/shared/utils/logger';
import type { ILogger } from '@/shared/utils/logger';

/**
 * Storage service for domain-scoped highlight persistence
 *
 * Features:
 * - Event sourcing (append-only event log)
 * - Per-domain encryption
 * - TTL-based expiration
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
    } else if (typeof self !== 'undefined' && self.location) {
      this.currentDomain = self.location.hostname || 'background-service';
    } else {
      this.currentDomain = 'unknown-context';
    }

    this.config = { ...DEFAULT_STORAGE_CONFIG, ...config };
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

      this.logger.info('🔍 [LOAD] Starting load operation', {
        domain: this.currentDomain,
        hashedDomain,
      });

      // Debug: Dump all storage keys
      const allKeys = await browser.storage.local.get(null);
      this.logger.info('🔍 [LOAD] Storage dump', {
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

      this.logger.info('🔍 [LOAD] Found data', {
        domain: this.currentDomain,
        lastModified: new Date(domainStorage.lastAccessed).toISOString(),
        ttl: domainStorage.ttl,
        ttlDate: new Date(domainStorage.ttl).toISOString(),
      });

      // Check TTL with detailed calculation
      const now = Date.now();
      const timeUntilExpiry = domainStorage.ttl - now;
      const hoursUntilExpiry = timeUntilExpiry / (1000 * 60 * 60);

      this.logger.info('🔍 [LOAD] TTL check', {
        now,
        nowDate: new Date(now).toISOString(),
        ttl: domainStorage.ttl,
        ttlDate: new Date(domainStorage.ttl).toISOString(),
        timeUntilExpiryMs: timeUntilExpiry,
        hoursUntilExpiry: hoursUntilExpiry.toFixed(2),
        isExpired: now > domainStorage.ttl,
        comparison: `${now} > ${domainStorage.ttl} = ${now > domainStorage.ttl}`,
      });

      if (now > domainStorage.ttl) {
        this.logger.warn('⏰ [LOAD] Data EXPIRED - clearing', {
          domain: this.currentDomain,
          expiredAt: new Date(domainStorage.ttl).toISOString(),
          expiredAgo: `${((now - domainStorage.ttl) / (1000 * 60)).toFixed(1)} minutes`,
        });
        await browser.storage.local.remove(hashedDomain);
        return [];
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
        hoursUntilExpiry: hoursUntilExpiry.toFixed(2),
      });

      // ✅ Sort by timestamp (oldest first) for event sourcing correctness
      // Events must be replayed in chronological order to reconstruct state
      return validEvents.sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      this.logger.error('Failed to load events', error as Error);
      return []; // Fail gracefully
    }
  }

  /**
   * Save events to storage
   */
  private async saveEvents(events: AnyHighlightEvent[]): Promise<void> {
    const hashedDomain = await hashDomain(this.currentDomain);

    this.logger.info('🔍 [SAVE] Starting save operation', {
      domain: this.currentDomain,
      hashedDomain,
      eventCount: events.length,
    });

    // Create event log
    const eventLog: EventLog = { events };

    // Encrypt
    const encrypted = await encryptData(JSON.stringify(eventLog), this.currentDomain);

    // Calculate TTL
    const now = Date.now();
    const ttl = now + this.config.ttlDuration;

    this.logger.info('🔍 [SAVE] TTL calculation', {
      now,
      nowDate: new Date(now).toISOString(),
      ttlDuration: this.config.ttlDuration,
      ttlDurationHours: (this.config.ttlDuration / (1000 * 60 * 60)).toFixed(2),
      ttl,
      ttlDate: new Date(ttl).toISOString(),
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

    // Verify save
    const verification = await browser.storage.local.get(hashedDomain);
    this.logger.info('[OK] [SAVE] Save completed and verified', {
      keyExists: !!verification[hashedDomain],
      savedTtl: new Date(ttl).toISOString(),
      eventCount: events.length,
    });
  }

  /**
   * Clear all events for current domain
   */
  async clear(): Promise<void> {
    const hashedDomain = await hashDomain(this.currentDomain);
    await browser.storage.local.remove(hashedDomain);
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
      ttl: new Date(domainStorage.ttl),
    };
  }
}
