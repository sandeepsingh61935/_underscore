/**
 * @file state-migration.ts
 * @description State migration infrastructure for versioned state upgrades
 *
 * Provides a framework for safely migrating state between versions.
 * Migrations are registered, validated, and executed in sequence.
 */

import type { ILogger } from '@/shared/utils/logger';

/**
 * Current state version
 */
export const CURRENT_STATE_VERSION = 2;

/**
 * Result type for migration operations
 */
export type MigrationResult<T> =
  | { success: true; value: T }
  | { success: false; error: Error };

/**
 * Represents a single state migration
 */
export interface StateMigration {
  /** Source version */
  fromVersion: number;
  /** Target version */
  toVersion: number;
  /** Migration function */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  migrate: (state: any) => Promise<any>;
  /** Human-readable description */
  description: string;
}

/**
 * Migration Engine
 *
 * Orchestrates state migrations by:
 * 1. Registering migrations
 * 2. Detecting current state version
 * 3. Executing migrations in sequence
 * 4. Logging all operations
 * 5. Handling errors gracefully
 */
export class MigrationEngine {
  private migrations: Map<string, StateMigration> = new Map();

  constructor(private readonly logger: ILogger) {}

  /**
   * Register a migration
   *
   * @param migration - Migration to register
   * @throws Error if migration already registered
   */
  registerMigration(migration: StateMigration): void {
    const key = `${migration.fromVersion}->${migration.toVersion}`;

    if (this.migrations.has(key)) {
      throw new Error(`Migration ${key} is already registered`);
    }

    this.migrations.set(key, migration);

    this.logger.debug('Registered migration', {
      from: migration.fromVersion,
      to: migration.toVersion,
      description: migration.description,
    });
  }

  /**
   * Migrate state from one version to another
   *
   * @param state - Current state
   * @param fromVersion - Source version
   * @param toVersion - Target version
   * @returns Migration result
   */
  async migrate(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    state: any,
    fromVersion: number,
    toVersion: number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<MigrationResult<any>> {
    // No migration needed
    if (fromVersion === toVersion) {
      this.logger.debug('No migration needed', { version: fromVersion });
      return { success: true, value: state };
    }

    if (fromVersion > toVersion) {
      return {
        success: false,
        error: new Error(`Cannot migrate backwards from ${fromVersion} to ${toVersion}`),
      };
    }

    this.logger.info('Starting migration', {
      from: fromVersion,
      to: toVersion,
    });

    try {
      let currentState = state;
      let currentVersion = fromVersion;

      // Execute migrations in sequence
      while (currentVersion < toVersion) {
        const nextVersion = currentVersion + 1;
        const key = `${currentVersion}->${nextVersion}`;
        const migration = this.migrations.get(key);

        if (!migration) {
          return {
            success: false,
            error: new Error(`No migration found for ${key}`),
          };
        }

        this.logger.info('Migrating state', {
          from: currentVersion,
          to: nextVersion,
          description: migration.description,
        });

        currentState = await migration.migrate(currentState);
        currentVersion = nextVersion;

        // Validate migrated state - warn if it looks invalid
        if (!currentState || typeof currentState !== 'object') {
          this.logger.warn('Migration produced invalid state', {
            migration: key,
            stateType: typeof currentState,
          });
        } else if (!('version' in currentState)) {
          // Migrations should always add version field
          this.logger.warn('Migration produced state without version field', {
            migration: key,
          });
        }
      }

      this.logger.info('Migration complete', {
        from: fromVersion,
        to: toVersion,
      });

      return { success: true, value: currentState };
    } catch (error) {
      this.logger.error('Migration failed', error as Error);
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  /**
   * Get current state version
   */
  getCurrentVersion(): number {
    return CURRENT_STATE_VERSION;
  }

  /**
   * Detect version from state object
   *
   * @param state - State to inspect
   * @returns Detected version (1 if no version field)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  detectVersion(state: any): number {
    if (!state || typeof state !== 'object') {
      return 1; // Assume v1 for invalid state
    }

    // Check for v2+ states: metadata.version exists
    if (state.metadata && typeof state.metadata === 'object') {
      if ('version' in state.metadata && typeof state.metadata.version === 'number') {
        // Only accept positive version numbers
        if (state.metadata.version > 0) {
          return state.metadata.version;
        }
        // Negative or zero version = corrupted, treat as v1
      }
    }

    // Check for migrated v2 state shape: { currentMode, version, metadata }
    if ('version' in state && typeof state.version === 'number' && state.version > 0) {
      return state.version;
    }

    // v1 states have defaultMode but no metadata
    if ('defaultMode' in state && !state.metadata) {
      return 1;
    }

    // Unknown state format, assume v1
    return 1;
  }

  /**
   * Check if a migration path exists
   *
   * @param fromVersion - Source version
   * @param toVersion - Target version
   * @returns true if migration path exists
   */
  hasMigrationPath(fromVersion: number, toVersion: number): boolean {
    if (fromVersion === toVersion) {
      return true;
    }

    let current = fromVersion;
    while (current < toVersion) {
      const next = current + 1;
      const key = `${current}->${next}`;
      if (!this.migrations.has(key)) {
        return false;
      }
      current = next;
    }

    return true;
  }
}
