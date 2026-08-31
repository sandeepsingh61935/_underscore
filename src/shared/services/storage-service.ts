/**
 * @file storage-service.ts
 * @description Domain-scoped storage service with event sourcing
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
import { hashDomain } from '@/shared/utils/crypto-utils';
import { LoggerFactory } from '@/shared/utils/logger';
import type { ILogger } from '@/shared/utils/logger';

/**
 * Storage service for domain-scoped highlight persistence.
 * Highlights persist until the user removes them.
 */
export class StorageService implements IStorage {
  private logger: ILogger;
  private currentDomain: string;
  private config: StorageConfig;

  constructor(config: Partial<StorageConfig> = {}) {
    this.logger = LoggerFactory.getLogger('StorageService');

    if (typeof window !== 'undefined' && window.location) {
      this.currentDomain = window.location.hostname;
    } else {
      const swLocation = (globalThis as unknown as { location?: Location }).location;
      this.currentDomain = swLocation?.hostname || 'background-service';
    }

    this.config = { ...DEFAULT_STORAGE_CONFIG, ...config };
  }

  async saveEvent(event: AnyHighlightEvent): Promise<void> {
    if (!isValidHighlightEvent(event)) {
      throw new ValidationError('Invalid highlight event structure', {
        eventType: (event as { type?: string }).type,
        eventId: (event as { eventId?: string }).eventId,
      });
    }

    try {
      const events = await this.loadEvents();
      events.push(event);
      const trimmed = events.slice(-this.config.maxEventsPerDomain);
      await this.saveEvents(trimmed);

      this.logger.debug('Event saved', { type: event.type, eventId: event.eventId });
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      this.logger.error('Failed to save event', error as Error);
      throw error;
    }
  }

  async loadEvents(): Promise<AnyHighlightEvent[]> {
    try {
      const hashedDomain = await hashDomain(this.currentDomain);

      this.logger.info('[LOAD] Starting load operation', {
        domain: this.currentDomain,
        hashedDomain,
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
      });

      const eventLog: EventLog = JSON.parse(domainStorage.data);
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
      });

      const sorted = validEvents.sort((a, b) => a.timestamp - b.timestamp);
      await this.backfillIndexIfMissing(hashedDomain, sorted);

      return sorted;
    } catch (error) {
      this.logger.error('Failed to load events', error as Error);
      return [];
    }
  }

  private async backfillIndexIfMissing(
    hashedDomain: string,
    events: AnyHighlightEvent[]
  ): Promise<void> {
    try {
      const result = await browser.storage.local.get(COLLECTIONS_INDEX_KEY);
      const index: CollectionsIndex =
        (result[COLLECTIONS_INDEX_KEY] as CollectionsIndex) ?? {};

      if (hashedDomain in index) return;

      const count = computeHighlightCount(events);
      if (count === 0) return;

      const lastActive =
        events.length > 0 ? Math.max(...events.map((e) => e.timestamp)) : Date.now();

      index[hashedDomain] = {
        domain: this.currentDomain,
        mode: this.config.mode,
        count,
        lastActive,
      };

      await browser.storage.local.set({ [COLLECTIONS_INDEX_KEY]: index });
      this.logger.info('[MIGRATE] Backfilled collections index', {
        domain: this.currentDomain,
        count,
      });
    } catch (err) {
      this.logger.warn('Failed to backfill collections index', {
        error: (err as Error).message,
      });
    }
  }

  private async saveEvents(events: AnyHighlightEvent[]): Promise<void> {
    const hashedDomain = await hashDomain(this.currentDomain);

    this.logger.info('[SAVE] Starting save operation', {
      domain: this.currentDomain,
      hashedDomain,
      eventCount: events.length,
    });

    const eventLog: EventLog = { events };
    const serialized = JSON.stringify(eventLog);
    const now = Date.now();

    const domainStorage: DomainStorage = {
      data: serialized,
      lastAccessed: now,
      version: 1,
    };

    await browser.storage.local.set({ [hashedDomain]: domainStorage });
    await this.updateCollectionsIndex(hashedDomain, events, now);

    this.logger.info('[OK] [SAVE] Save completed', {
      eventCount: events.length,
    });
  }

  private async updateCollectionsIndex(
    hashedDomain: string,
    events: AnyHighlightEvent[],
    now: number
  ): Promise<void> {
    try {
      const result = await browser.storage.local.get(COLLECTIONS_INDEX_KEY);
      const index: CollectionsIndex =
        (result[COLLECTIONS_INDEX_KEY] as CollectionsIndex) ?? {};

      const count = computeHighlightCount(events);
      const lastActive =
        events.length > 0 ? Math.max(...events.map((e) => e.timestamp)) : now;

      index[hashedDomain] = {
        domain: this.currentDomain,
        mode: this.config.mode,
        count,
        lastActive,
      };

      await browser.storage.local.set({ [COLLECTIONS_INDEX_KEY]: index });
    } catch (err) {
      this.logger.warn('Failed to update collections index', {
        error: (err as Error).message,
      });
    }
  }

  async clear(): Promise<void> {
    const hashedDomain = await hashDomain(this.currentDomain);
    await browser.storage.local.remove(hashedDomain);

    try {
      const result = await browser.storage.local.get(COLLECTIONS_INDEX_KEY);
      const index: CollectionsIndex =
        (result[COLLECTIONS_INDEX_KEY] as CollectionsIndex) ?? {};
      if (hashedDomain in index) {
        delete index[hashedDomain];
        await browser.storage.local.set({ [COLLECTIONS_INDEX_KEY]: index });
      }
    } catch (err) {
      this.logger.warn('Failed to remove from collections index', {
        error: (err as Error).message,
      });
    }

    this.logger.info('Storage cleared', { domain: this.currentDomain });
  }

  async getStats(): Promise<{ eventCount: number }> {
    const events = await this.loadEvents();
    return { eventCount: events.length };
  }
}
