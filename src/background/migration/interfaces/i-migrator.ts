/**
 * @file i-migrator.ts
 * @description Migration Service Interface for migrating data from local to cloud
 */

export interface MigrationResult {
    migrated: number;
    failed: number;
    skipped: number;
}

export interface IMigrator {
    /**
     * Migrate data from local storage to cloud storage
     * @returns Promise resolving to migration result statistics
     */
    migrate(): Promise<MigrationResult>;
}
