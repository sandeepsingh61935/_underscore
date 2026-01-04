/**
 * @file rollback-service.ts
 * @description Handles rollback of migration operations
 */

import type { IAPIClient } from '@/background/api/interfaces/i-api-client';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { IEventBus } from '@/shared/interfaces/i-event-bus';
import type { IPersistentStorage } from '@/shared/interfaces/i-storage';
import { EventName, createEvent } from '@/shared/types/events';

export class RollbackService {
    private static readonly MIGRATION_COMPLETE_KEY = 'migration_v1_v2_complete';

    constructor(
        private readonly apiClient: IAPIClient,
        private readonly storage: IPersistentStorage,
        private readonly eventBus: IEventBus,
        private readonly logger: ILogger
    ) { }

    /**
     * Rollback migration changes
     * Deletes all remote data and resets migration flag
     */
    async rollback(): Promise<void> {
        this.logger.warn('Initiating migration rollback');

        try {
            // 1. Delete all remote highlights
            // Note: This is a destructive operation intended for clean slate rollback
            const highlights = await this.apiClient.getHighlights();

            // Execute in parallel (limited if needed, but for now Promise.all)
            await Promise.all(
                highlights.map(h => this.apiClient.deleteHighlight(h.id))
            );

            // 2. Reset completion flag
            await this.storage.delete(RollbackService.MIGRATION_COMPLETE_KEY);

            // 3. Emit event
            this.eventBus.emit(
                EventName.MIGRATION_ROLLED_BACK,
                createEvent({
                    type: EventName.MIGRATION_ROLLED_BACK,
                })
            );

            this.logger.info('Rollback completed');
        } catch (error) {
            this.logger.error('Rollback failed', error as Error);
            throw error;
        }
    }
}
