/**
 * @file migration-validator.ts
 * @description Validates migration integrity by comparing local and remote data
 */

import type { MigrationResult } from './interfaces/i-migrator';
import type { IHighlightRepository } from '@/background/repositories/i-highlight-repository';
import type { IAPIClient } from '@/background/api/interfaces/i-api-client';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { HighlightDataV2 } from '@/background/schemas/highlight-schema';

export class MigrationValidator {
    constructor(
        private readonly localRepo: IHighlightRepository,
        private readonly apiClient: IAPIClient,
        private readonly logger: ILogger
    ) { }

    /**
     * Validate migration success
     * @param result - Result from migration process
     */
    async validate(result: MigrationResult): Promise<boolean> {
        const localCount = await this.localRepo.count();
        const remoteHighlights = await this.apiClient.getHighlights();
        const remoteCount = remoteHighlights.length;

        // Expected remote count is local count minus skipped items
        // (Assuming cloud was empty or we only care about migrating these)
        // If cloud had data, this check is brittle. 
        // Ideally we verify that ALL local items exist on remote.

        // Check 1: Count sanity check
        const expectedCount = localCount - result.skipped;

        // If we have explicit failures, migration is "failed" anyway, but validate() checks data integrity.
        // If failed > 0, we expect missing items.
        // But validate() returns true if data matches EXPECTATIONS.
        // If result.failed > 0, typically validate would likely be false effectively for "complete success".
        // But let's check if "what succeeded is correct".

        // Let's go with strict check: Everything in Local (except skipped) MUST be in Remote.
        // We don't care if Remote has EXTRA (unless we want strict 1:1).

        if (remoteCount < expectedCount - result.failed) {
            this.logger.error('Migration validation failed: Remote count too low', undefined, {
                local: localCount,
                remote: remoteCount,
                skipped: result.skipped,
                failed: result.failed
            });
            return false;
        }

        // 2. Spot Check Strategy
        // Pick 10 random highlights from local and verify they exist and match on remote
        if (localCount > 0) {
            const localHighlights = await this.localRepo.findAll();
            const validLocalHighlights = localHighlights.filter(h => h.id && h.text); // Rudimentary validity check matching Migrator

            if (validLocalHighlights.length === 0) return true;

            const checkCount = Math.min(10, validLocalHighlights.length);
            const indices = new Set<number>();

            while (indices.size < checkCount) {
                indices.add(Math.floor(Math.random() * validLocalHighlights.length));
            }

            for (const index of indices) {
                const local = validLocalHighlights[index];
                if (!local) continue; // Should not happen given indices logic
                const remote = remoteHighlights.find(h => h.id === local.id);

                if (!remote) {
                    // If this specific highlight was one that failed, it's "expected" to be missing,
                    // but validate() usually implies verifying success of the whole operation?
                    // If migration failed for this item, then validation of "migration success" should probably fail.
                    this.logger.error('Migration validation failed: Highlight missing on remote', undefined, { id: local.id });
                    return false;
                }

                if (!this.highlightsMatch(local, remote)) {
                    this.logger.error('Migration validation failed: Content mismatch', undefined, { id: local.id });
                    return false;
                }
            }
        }

        return true;
    }

    private highlightsMatch(a: HighlightDataV2, b: HighlightDataV2): boolean {
        if (a.text !== b.text) return false;
        // contentHash check if available
        if (a.contentHash && b.contentHash && a.contentHash !== b.contentHash) return false;
        // Check colorRole
        if (a.colorRole !== b.colorRole) return false;

        return true;
    }
}
