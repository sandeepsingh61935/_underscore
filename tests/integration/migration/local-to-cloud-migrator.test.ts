
import { describe, it, expect, beforeEach } from 'vitest';
import { LocalToCloudMigrator } from '@/background/migration/local-to-cloud-migrator';
import { InMemoryHighlightRepository } from '@/shared/repositories/in-memory-highlight-repository';
import { MockAPIClient } from '../../helpers/mocks/mock-api-client';
import { MockEventBus } from '../../helpers/mocks/mock-event-bus';
import { MockLogger } from '../../helpers/mocks/mock-logger';
import { MockPersistentStorage } from '../../helpers/mocks/mock-persistent-storage';
import { createTestHighlight } from '../../helpers/test-fixtures';
import { EventName } from '@/shared/types/events';

describe('LocalToCloudMigrator Integration', () => {
    let migrator: LocalToCloudMigrator;
    let localRepo: InMemoryHighlightRepository;
    let apiClient: MockAPIClient;
    let eventBus: MockEventBus;
    let logger: MockLogger;
    let storage: MockPersistentStorage;

    beforeEach(() => {
        localRepo = new InMemoryHighlightRepository();
        apiClient = new MockAPIClient();
        eventBus = new MockEventBus();
        logger = new MockLogger();
        storage = new MockPersistentStorage();

        migrator = new LocalToCloudMigrator(localRepo, apiClient, eventBus, logger, storage);
    });

    it('migrates empty local DB successfully', async () => {
        const result = await migrator.migrate();
        expect(result).toEqual({ migrated: 0, failed: 0, skipped: 0 });

        const events = eventBus.getEvents(EventName.MIGRATION_COMPLETED);
        expect(events.length).toBe(1);

        const isComplete = await storage.load('migration_v1_v2_complete');
        expect(isComplete).toBe(true);
    });

    it('migrates single highlight successfully', async () => {
        const h1 = createTestHighlight();
        await localRepo.add(h1);

        const result = await migrator.migrate();
        expect(result.migrated).toBe(1);
        expect(apiClient.createdHighlights).toHaveLength(1);
        expect(apiClient.createdHighlights[0]?.id).toBe(h1.id);
    });

    it('handles already completed migration', async () => {
        await storage.save('migration_v1_v2_complete', true);
        const h1 = createTestHighlight();
        await localRepo.add(h1);

        const result = await migrator.migrate();
        expect(result.migrated).toBe(0); // Should skip
        expect(apiClient.createdHighlights).toHaveLength(0);

        const events = eventBus.getEvents(EventName.MIGRATION_COMPLETED);
        expect(events.length).toBe(1);
    });

    it('handles partial failures without aborting', async () => {
        const h1 = createTestHighlight({ id: 'valid-1' });
        const h2 = createTestHighlight({ id: 'valid-2' });

        // Mock failure for specific ID
        const originalCreate = apiClient.createHighlight.bind(apiClient);
        apiClient.createHighlight = async (data) => {
            if (data.id === 'failing-id') throw new Error('API Error');
            return originalCreate(data);
        };

        const hFail = createTestHighlight({ id: 'failing-id' });

        await localRepo.addMany([h1, hFail, h2]);

        const result = await migrator.migrate();
        expect(result.migrated).toBe(2);
        expect(result.failed).toBe(1);

        // Verify valid ones were created
        const createdIds = apiClient.createdHighlights.map(h => h.id).sort();
        expect(createdIds).toEqual(['valid-1', 'valid-2'].sort());

        // Check events
        const progressEvents = eventBus.getEvents(EventName.MIGRATION_PROGRESS);
        expect(progressEvents.length).toBeGreaterThan(0);
        const lastProgress = progressEvents[progressEvents.length - 1];
        expect(lastProgress.failed).toBe(1);
    });

    it('migrates in batches', async () => {
        // Create 25 highlights
        const highlights = Array.from({ length: 25 }, (_, i) =>
            createTestHighlight({ id: `batch-test-${i}` })
        );
        await localRepo.addMany(highlights);

        const result = await migrator.migrate();
        expect(result.migrated).toBe(25);
        expect(apiClient.createdHighlights).toHaveLength(25);

        // Verify progress events were emitted for batches (10, 10, 5)
        const progressEvents = eventBus.getEvents(EventName.MIGRATION_PROGRESS);
        expect(progressEvents.length).toBe(3);
        expect(progressEvents[0].migrated).toBe(10);
        expect(progressEvents[1].migrated).toBe(20);
        expect(progressEvents[2].migrated).toBe(25);
    });

    it('skips invalid highlights', async () => {
        const hValid = createTestHighlight({ id: 'valid-h' });

        // Technically InMemoryRepo is strict, but we can bypass or construct invalid data
        // For proper testing, we assume repository gave us something that failed our internal check
        // Let's manually inject into the return of findAll
        const hInvalid = { ...hValid, id: 'invalid-h', text: '' };

        // Spy on localRepo.findAll
        localRepo.findAll = async () => [hValid, hInvalid as any];

        const result = await migrator.migrate();
        expect(result.migrated).toBe(1);
        expect(result.skipped).toBe(1);
        expect(result.failed).toBe(0);
    });
});
