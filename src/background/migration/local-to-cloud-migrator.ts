/**
 * @file local-to-cloud-migrator.ts
 * @description Migrates highlights from local IndexedDB to Cloud Storage
 */

import type { IMigrator, MigrationResult } from './interfaces/i-migrator';
import type { IHighlightRepository } from '@/shared/repositories/i-highlight-repository';
import type { IAPIClient } from '@/background/api/interfaces/i-api-client';
import type { IEventBus } from '@/shared/interfaces/i-event-bus';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { IPersistentStorage } from '@/shared/interfaces/i-storage';
import { EventName, createEvent } from '@/shared/types/events';

export class LocalToCloudMigrator implements IMigrator {
    private static readonly BATCH_SIZE = 10;
    private static readonly MIGRATION_COMPLETE_KEY = 'migration_v1_v2_complete';
    private static readonly MAX_CONSECUTIVE_FAILURES = 3;
    private static isMigrating = false;

    constructor(
        private readonly localRepo: IHighlightRepository,
        private readonly apiClient: IAPIClient,
        private readonly eventBus: IEventBus,
        private readonly logger: ILogger,
        private readonly storage: IPersistentStorage
    ) { }

    /**
     * Migrate data from local storage to cloud storage
     * @returns Promise resolving to migration result statistics
     */
    async migrate(): Promise<MigrationResult> {
        if (LocalToCloudMigrator.isMigrating) {
            this.logger.warn('Migration already in progress');
            throw new Error('Migration already in progress');
        }

        LocalToCloudMigrator.isMigrating = true;
        const result: MigrationResult = { migrated: 0, failed: 0, skipped: 0 };
        let consecutiveFailures = 0;

        this.logger.info('Starting local-to-cloud migration');
        this.eventBus.emit(
            EventName.MIGRATION_STARTED,
            createEvent({
                type: EventName.MIGRATION_STARTED,
                total: 0,
            })
        );

        try {
            // Check if already completed
            const isComplete = await this.storage.load<boolean>(
                LocalToCloudMigrator.MIGRATION_COMPLETE_KEY
            );

            if (isComplete) {
                this.logger.info('Migration already completed');
                // Emit completion with 0 stats
                this.eventBus.emit(
                    EventName.MIGRATION_COMPLETED,
                    createEvent({
                        type: EventName.MIGRATION_COMPLETED,
                        result
                    })
                );
                return result;
            }

            const localHighlights = await this.localRepo.findAll();
            const total = localHighlights.length;

            // Re-emit started with correct total
            this.eventBus.emit(
                EventName.MIGRATION_STARTED,
                createEvent({
                    type: EventName.MIGRATION_STARTED,
                    total,
                })
            );

            if (total === 0) {
                await this.markMigrationComplete();
                this.eventBus.emit(
                    EventName.MIGRATION_COMPLETED,
                    createEvent({
                        type: EventName.MIGRATION_COMPLETED,
                        result,
                    })
                );
                return result;
            }

            // Process in batches
            for (let i = 0; i < total; i += LocalToCloudMigrator.BATCH_SIZE) {
                // Abort check
                if (consecutiveFailures >= LocalToCloudMigrator.MAX_CONSECUTIVE_FAILURES) {
                    const msg = `Aborting migration: ${consecutiveFailures} consecutive failures`;
                    this.logger.error(msg);
                    throw new Error(msg);
                }

                const batch = localHighlights.slice(
                    i,
                    i + LocalToCloudMigrator.BATCH_SIZE
                );

                await Promise.all(
                    batch.map(async (highlight) => {
                        try {
                            // Validate basic integrity
                            if (!highlight.id || !highlight.text) {
                                result.skipped++;
                                this.logger.warn('Skipping invalid highlight', { highlight });
                                return;
                            }

                            // Upload to cloud
                            await this.apiClient.createHighlight(highlight);
                            result.migrated++;
                            consecutiveFailures = 0; // Reset on success
                        } catch (error) {
                            this.logger.error(
                                'Failed to migrate highlight',
                                error as Error,
                                { id: highlight.id }
                            );
                            result.failed++;
                            consecutiveFailures++;
                        }
                    })
                );

                // Emit progress
                this.eventBus.emit(
                    EventName.MIGRATION_PROGRESS,
                    createEvent({
                        type: EventName.MIGRATION_PROGRESS,
                        migrated: result.migrated,
                        total,
                        failed: result.failed,
                    })
                );
            }

            // Only mark complete if we didn't abort/crash and failure rate is low?
            // For now, if we survived the loop without throwing, we consider it "done" (even if some failed).
            // Users can retry manually later if we don't set the flag?
            // But spec says: "Mark migration complete in chrome.storage"
            // Let's stick to: If we finish the loop, we mark complete. Failures are logged.
            if (result.failed < total) { // At least something succeeded or total was 0
                await this.markMigrationComplete();
            }

            this.eventBus.emit(
                EventName.MIGRATION_COMPLETED,
                createEvent({
                    type: EventName.MIGRATION_COMPLETED,
                    result,
                })
            );

            this.logger.info('Migration finished', result);
        } catch (error) {
            this.logger.error('Critical migration failure', error as Error);
            this.eventBus.emit(
                EventName.MIGRATION_FAILED,
                createEvent({
                    type: EventName.MIGRATION_FAILED,
                    error: error as Error,
                })
            );
            throw error;
        } finally {
            LocalToCloudMigrator.isMigrating = false;
        }

        return result;
    }

    private async markMigrationComplete(): Promise<void> {
        await this.storage.save(LocalToCloudMigrator.MIGRATION_COMPLETE_KEY, true);
    }
}
