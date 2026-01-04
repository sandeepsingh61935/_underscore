
import { describe, it, expect, beforeEach } from 'vitest';
import { MigrationValidator } from '@/background/migration/migration-validator';
import { InMemoryHighlightRepository } from '@/shared/repositories/in-memory-highlight-repository';
import { MockAPIClient } from '../../helpers/mocks/mock-api-client';
import { MockLogger } from '../../helpers/mocks/mock-logger';
import { createTestHighlight } from '../../helpers/test-fixtures';

describe('MigrationValidator', () => {
    let validator: MigrationValidator;
    let localRepo: InMemoryHighlightRepository;
    let apiClient: MockAPIClient;
    let logger: MockLogger;

    beforeEach(() => {
        localRepo = new InMemoryHighlightRepository();
        apiClient = new MockAPIClient();
        logger = new MockLogger();
        validator = new MigrationValidator(localRepo, apiClient, logger);
    });

    it('returns true when counts match', async () => {
        const h1 = createTestHighlight();
        await localRepo.add(h1);
        await apiClient.createHighlight(h1);

        const result = { migrated: 1, failed: 0, skipped: 0 };
        expect(await validator.validate(result)).toBe(true);
    });

    it('returns false when count mismatch', async () => {
        const h1 = createTestHighlight();
        await localRepo.add(h1);
        // Remote is empty

        const result = { migrated: 1, failed: 0, skipped: 0 }; // Claims success but remote empty
        expect(await validator.validate(result)).toBe(false);
    });

    it('returns false when content mismatch', async () => {
        const h1 = createTestHighlight();
        await localRepo.add(h1);

        // Remote has same ID but different text
        const hRemote = { ...h1, text: 'altered' };
        await apiClient.createHighlight(hRemote);

        const result = { migrated: 1, failed: 0, skipped: 0 };
        expect(await validator.validate(result)).toBe(false);
    });

    it('accounts for skipped items', async () => {
        // Only add an invalid item that would be skipped
        const hInvalid = createTestHighlight({ text: '' });
        await localRepo.add(hInvalid as any);

        // Result says we skipped 1 item
        const result = { migrated: 0, failed: 0, skipped: 1 };


        // Local: 1. Skipped: 1. Expected Remote: 0. Actual Remote: 0.
        expect(await validator.validate(result)).toBe(true);
    });
});
