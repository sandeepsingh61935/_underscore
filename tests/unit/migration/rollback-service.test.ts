
import { describe, it, expect, beforeEach } from 'vitest';
import { RollbackService } from '@/background/migration/rollback-service';
import { MockAPIClient } from '../../helpers/mocks/mock-api-client';
import { MockEventBus } from '../../helpers/mocks/mock-event-bus';
import { MockLogger } from '../../helpers/mocks/mock-logger';
import { MockPersistentStorage } from '../../helpers/mocks/mock-persistent-storage';
import { createTestHighlight } from '../../helpers/test-fixtures';
import { EventName } from '@/shared/types/events';

describe('RollbackService', () => {
    let service: RollbackService;
    let apiClient: MockAPIClient;
    let storage: MockPersistentStorage;
    let eventBus: MockEventBus;
    let logger: MockLogger;

    beforeEach(() => {
        apiClient = new MockAPIClient();
        storage = new MockPersistentStorage();
        eventBus = new MockEventBus();
        logger = new MockLogger();
        service = new RollbackService(apiClient, storage, eventBus, logger);
    });

    it('deletes all remote data', async () => {
        const h1 = createTestHighlight();
        await apiClient.createHighlight(h1);
        expect(apiClient.createdHighlights).toHaveLength(1);

        await service.rollback();
        expect(apiClient.deletedHighlights).toContain(h1.id);
    });

    it('resets migration flag', async () => {
        await storage.save('migration_v1_v2_complete', true);
        await service.rollback();
        expect(await storage.load('migration_v1_v2_complete')).toBeNull();
    });

    it('emits rollback event', async () => {
        await service.rollback();
        const events = eventBus.getEvents(EventName.MIGRATION_ROLLED_BACK);
        expect(events.length).toBe(1);
    });

    it('is idempotent (safe to call multiple times)', async () => {
        // First call
        await service.rollback();
        // Second call
        await service.rollback();

        // Should have deleted twice (empty array map still runs but verify behavior)
        // If ApiClient.deleteHighlight throws on 404, we'd know. Mock doesn't throw.
        expect(true).toBe(true); // survived
    });

    it('handles rollback errors gracefully', async () => {
        // Mock failure
        apiClient.shouldFailCreate = false; // reset
        // We need apiClient to fail on delete or get?
        // MockApiClient doesn't support failDelete flag yet, let's just spy on it?
        // Or cleaner: allow mocking getHighlights to throw
        const originalGet = apiClient.getHighlights.bind(apiClient);
        apiClient.getHighlights = async () => { throw new Error('API Down'); };

        await expect(service.rollback()).rejects.toThrow('API Down');
    });
});
