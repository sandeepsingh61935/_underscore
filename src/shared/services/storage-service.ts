/**
 * @file storage-service.ts
 * @description Domain-scoped storage service with event sourcing and encryption
 */

import { hashDomain, encryptData, decryptData } from '@/shared/utils/crypto-utils';
import type {
    AnyHighlightEvent,
    DomainStorage,
    EventLog,
    StorageConfig,
    DEFAULT_STORAGE_CONFIG,
    isValidHighlightEvent
} from '@/shared/types/storage';
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
export class StorageService {
    private logger: ILogger;
    private currentDomain: string;
    private config: StorageConfig;

    constructor(config: Partial<StorageConfig> = {}) {
        this.logger = LoggerFactory.getLogger('StorageService');
        this.currentDomain = window.location.hostname;
        this.config = { ...DEFAULT_STORAGE_CONFIG, ...config };
    }

    /**
     * Save event to storage
     * Appends to event log, applies TTL, encrypts
     */
    async saveEvent(event: AnyHighlightEvent): Promise<void> {
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
            const result = await chrome.storage.local.get(hashedDomain);

            if (!result[hashedDomain]) {
                return [];
            }

            const domainStorage = result[hashedDomain] as DomainStorage;

            // Check TTL
            if (Date.now() > domainStorage.ttl) {
                this.logger.info('Storage expired, clearing', {
                    domain: this.currentDomain,
                    ttl: new Date(domainStorage.ttl)
                });
                await chrome.storage.local.remove(hashedDomain);
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
                    valid: validEvents.length
                });
            }

            this.logger.info('Events loaded', {
                domain: this.currentDomain,
                count: validEvents.length
            });

            return validEvents;
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

        // Create event log
        const eventLog: EventLog = { events };

        // Encrypt
        const encrypted = await encryptData(
            JSON.stringify(eventLog),
            this.currentDomain
        );

        // Create storage object
        const domainStorage: DomainStorage = {
            data: encrypted,
            ttl: Date.now() + this.config.ttlDuration,
            lastAccessed: Date.now(),
            version: 1
        };

        // Save
        await chrome.storage.local.set({ [hashedDomain]: domainStorage });
    }

    /**
     * Clear all events for current domain
     */
    async clear(): Promise<void> {
        const hashedDomain = await hashDomain(this.currentDomain);
        await chrome.storage.local.remove(hashedDomain);
        this.logger.info('Storage cleared', { domain: this.currentDomain });
    }

    /**
     * Get storage stats
     */
    async getStats(): Promise<{ eventCount: number; ttl: Date | null }> {
        const hashedDomain = await hashDomain(this.currentDomain);
        const result = await chrome.storage.local.get(hashedDomain);

        if (!result[hashedDomain]) {
            return { eventCount: 0, ttl: null };
        }

        const events = await this.loadEvents();
        const domainStorage = result[hashedDomain] as DomainStorage;

        return {
            eventCount: events.length,
            ttl: new Date(domainStorage.ttl)
        };
    }
}
