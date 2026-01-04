/**
 * @file encrypted-api-client.ts
 * @description API Client decorator that adds E2E encryption
 * @architecture Decorator Pattern - wraps IAPIClient with transparent encryption
 */

import type { IAPIClient, SyncEvent, PushResult, Collection } from './interfaces/i-api-client';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import type { IEncryptionService, HighlightData } from '@/background/auth/interfaces/i-encryption-service';
import type { ILogger } from '@/shared/interfaces/i-logger';

/**
 * Encrypted API Client
 * 
 * Transparently encrypts/decrypts data flowing through the API client.
 * Uses decorator pattern to wrap any IAPIClient implementation.
 * 
 * @security All highlight text and selectors are encrypted before transmission
 * @performance Adds ~50ms overhead per operation for encryption
 */
export class EncryptedAPIClient implements IAPIClient {
    constructor(
        private readonly innerClient: IAPIClient,
        private readonly encryptionService: IEncryptionService,
        private readonly logger: ILogger,
        private readonly userId: string // Current user ID for encryption
    ) { }

    /**
     * Create highlight with encryption
     */
    async createHighlight(data: HighlightDataV2): Promise<void> {
        try {
            // Encrypt sensitive fields
            const encryptedData = await this.encryptHighlight(data);

            // Pass encrypted data to inner client
            await this.innerClient.createHighlight(encryptedData);

            this.logger.debug('Highlight created with encryption', { id: data.id });
        } catch (error) {
            this.logger.error('Failed to create encrypted highlight', error as Error, { id: data.id });
            throw error;
        }
    }

    /**
     * Update highlight with encryption
     */
    async updateHighlight(id: string, updates: Partial<HighlightDataV2>): Promise<void> {
        try {
            // If updates contain sensitive fields, encrypt them
            const encryptedUpdates = updates.text || updates.ranges
                ? await this.encryptHighlight(updates as HighlightDataV2)
                : updates;

            await this.innerClient.updateHighlight(id, encryptedUpdates);

            this.logger.debug('Highlight updated with encryption', { id });
        } catch (error) {
            this.logger.error('Failed to update encrypted highlight', error as Error, { id });
            throw error;
        }
    }

    /**
     * Delete highlight (no encryption needed)
     */
    async deleteHighlight(id: string): Promise<void> {
        return this.innerClient.deleteHighlight(id);
    }

    /**
     * Get highlights with decryption
     */
    async getHighlights(url?: string): Promise<HighlightDataV2[]> {
        try {
            const encryptedHighlights = await this.innerClient.getHighlights(url);

            // Decrypt each highlight
            const decryptedHighlights = await Promise.all(
                encryptedHighlights.map(h => this.decryptHighlight(h))
            );

            this.logger.debug('Highlights retrieved and decrypted', { count: decryptedHighlights.length });

            return decryptedHighlights;
        } catch (error) {
            this.logger.error('Failed to decrypt highlights', error as Error);
            throw error;
        }
    }

    /**
     * Push events with encryption
     */
    async pushEvents(events: SyncEvent[]): Promise<PushResult> {
        try {
            // Encrypt event data
            const encryptedEvents = await Promise.all(
                events.map(e => this.encryptEvent(e))
            );

            const result = await this.innerClient.pushEvents(encryptedEvents);

            this.logger.debug('Events pushed with encryption', {
                total: events.length,
                synced: result.synced_event_ids.length
            });

            return result;
        } catch (error) {
            this.logger.error('Failed to push encrypted events', error as Error);
            throw error;
        }
    }

    /**
     * Pull events with decryption
     */
    async pullEvents(since: number): Promise<SyncEvent[]> {
        try {
            const encryptedEvents = await this.innerClient.pullEvents(since);

            // Decrypt event data
            const decryptedEvents = await Promise.all(
                encryptedEvents.map(e => this.decryptEvent(e))
            );

            this.logger.debug('Events pulled and decrypted', { count: decryptedEvents.length });

            return decryptedEvents;
        } catch (error) {
            this.logger.error('Failed to decrypt events', error as Error);
            throw error;
        }
    }

    /**
     * Create collection (no encryption needed for metadata)
     */
    async createCollection(name: string, description?: string): Promise<Collection> {
        return this.innerClient.createCollection(name, description);
    }

    /**
     * Get collections (no encryption needed for metadata)
     */
    async getCollections(): Promise<Collection[]> {
        return this.innerClient.getCollections();
    }

    /**
     * Encrypt highlight data
     */
    private async encryptHighlight(data: HighlightDataV2): Promise<HighlightDataV2> {
        // Extract sensitive fields
        const sensitiveData: HighlightData = {
            text: data.text,
            url: data.url || '',
            selector: JSON.stringify(data.ranges), // Encrypt ranges as selector
            createdAt: data.createdAt,
            userId: this.userId,
        };

        // Encrypt
        const encrypted = await this.encryptionService.encrypt(sensitiveData);

        // Return highlight with encrypted data
        // Store encrypted payload in a special field (requires schema update)
        return {
            ...data,
            // For now, we'll store encrypted data in the text field
            // TODO: Update schema to have dedicated encryptedData field
            text: `[ENCRYPTED:${encrypted.data}]`,
            ranges: [], // Clear ranges (encrypted in text field)
        } as HighlightDataV2;
    }

    /**
     * Decrypt highlight data
     */
    private async decryptHighlight(data: HighlightDataV2): Promise<HighlightDataV2> {
        // Check if data is encrypted
        if (!data.text.startsWith('[ENCRYPTED:')) {
            // Legacy plaintext data - return as-is
            return data;
        }

        try {
            // Extract encrypted payload
            const encryptedData = data.text.substring(11, data.text.length - 1); // Remove [ENCRYPTED: and ]

            // Decrypt
            const decrypted = await this.encryptionService.decrypt({
                version: 1,
                keyId: `${this.userId}_${Date.now()}`, // TODO: Store actual keyId
                data: encryptedData,
                timestamp: Date.now(),
            });

            // Restore original data
            return {
                ...data,
                text: decrypted.text,
                url: decrypted.url,
                ranges: JSON.parse(decrypted.selector),
            } as HighlightDataV2;
        } catch (error) {
            this.logger.warn('Failed to decrypt highlight, returning empty', error as Error, { id: data.id });
            // Return empty highlight on decryption failure
            return {
                ...data,
                text: '[DECRYPTION FAILED]',
                ranges: [],
            } as HighlightDataV2;
        }
    }

    /**
     * Encrypt sync event
     */
    private async encryptEvent(event: SyncEvent): Promise<SyncEvent> {
        // Only encrypt highlight events
        if (!event.type.startsWith('highlight.')) {
            return event;
        }

        const encryptedData = await this.encryptHighlight(event.data as HighlightDataV2);

        return {
            ...event,
            data: encryptedData,
        };
    }

    /**
     * Decrypt sync event
     */
    private async decryptEvent(event: SyncEvent): Promise<SyncEvent> {
        // Only decrypt highlight events
        if (!event.type.startsWith('highlight.')) {
            return event;
        }

        const decryptedData = await this.decryptHighlight(event.data as HighlightDataV2);

        return {
            ...event,
            data: decryptedData,
        };
    }
}
