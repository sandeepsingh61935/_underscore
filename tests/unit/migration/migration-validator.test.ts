
import { describe, it, expect, beforeEach, vi } from 'vitest';
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

    it('validates empty migration (0=0)', async () => {
        const result = { migrated: 0, failed: 0, skipped: 0 };
        expect(await validator.validate(result)).toBe(true);
    });

    it('detects checksum mismatch', async () => {
        const h1 = createTestHighlight({ contentHash: 'hash-1' });
        await localRepo.add(h1);

        const hRemote = { ...h1, contentHash: 'hash-2' }; // Mismatch
        await apiClient.createHighlight(hRemote);

        const result = { migrated: 1, failed: 0, skipped: 0 };
        expect(await validator.validate(result)).toBe(false);
    });

    it('samples efficiently for large datasets', async () => {
        // Create 20 items locally
        const highlights = Array.from({ length: 20 }, (_, i) =>
            createTestHighlight({ id: `h-${i}` })
        );
        await localRepo.addMany(highlights);

        // Populate remote correctly
        for (const h of highlights) {
            await apiClient.createHighlight(h);
        }

        // We can't easily spy on internal sampling logic without exposing it, 
        // but we can verify it passes and runs fast. 
        // Or we intentionally break 1 item that is index 15 (likely to be picked or not?)
        // Sampling is random, so flaky test if we rely on picking the broken one.
        // Instead, valid test: large dataset validates true if all match.
        const result = { migrated: 20, failed: 0, skipped: 0 };
        expect(await validator.validate(result)).toBe(true);
    });

    it('fails if duplicate detection in local causes mismatch in remote count', async () => {
        // If local has duplicates (which repo might prevent, but assuming it exists)
        // and remote dedups, counts wont match.
        // Local: 2 (duplicate ids). Remote: 1.
        // Expected remote: 2. Actual: 1. Fail.
        // We simulate this by overriding count

        // Use spy instead of direct assignment to avoid TS issues
        vi.spyOn(localRepo, 'count').mockResolvedValue(2);
        await apiClient.createHighlight(createTestHighlight()); // 1 remote

        const result = { migrated: 2, failed: 0, skipped: 0 };
        expect(await validator.validate(result)).toBe(false);
    });

    it('returns false if invalid remote highlight detected', async () => {
        // Local exists
        const h1 = createTestHighlight();
        await localRepo.add(h1);

        // Remote exists but is somehow different structure? 
        // highlightsMatch checks text, hash, colorRole.
        const hRemote = { ...h1, colorRole: 'red' as any }; // diff color
        await apiClient.createHighlight(hRemote);

        const result = { migrated: 1, failed: 0, skipped: 0 };
        expect(await validator.validate(result)).toBe(false);
    });

    it('validates metrics are used correctly', async () => {
        // Sanity check that metrics params are respected
        const h1 = createTestHighlight();
        await localRepo.add(h1);

        // If we say failed=1, expected remote = 1 - 1 = 0.
        // Remote is 0. 
        // BUT strict validation spot check will look for h1 and fail because it's missing.
        // So validation should fail.
        const result = { migrated: 0, failed: 1, skipped: 0 };
        expect(await validator.validate(result)).toBe(false);
    });
});
