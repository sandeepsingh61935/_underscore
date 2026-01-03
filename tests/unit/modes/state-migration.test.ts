/**
 * @file state-migration.test.ts
 * @description Tests for state migration infrastructure
 *
 * Tests the migration engine that handles versioned state upgrades.
 * Follows testing-strategy-v2 Principle #6: Real, tricky test cases.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { MigrationEngine, type StateMigration } from '@/content/modes/state-migration';
import type { ILogger } from '@/shared/utils/logger';

describe('State Migration Infrastructure', () => {
  let engine: MigrationEngine;
  let mockLogger: ILogger;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      setLevel: vi.fn(),
      getLevel: vi.fn(),
    } as any;

    engine = new MigrationEngine(mockLogger);
  });

  describe('Migration registration', () => {
    it('should register migration for version 1→2', () => {
      const migration: StateMigration = {
        fromVersion: 1,
        toVersion: 2,
        migrate: async (state: any) => ({ ...state, version: 2 }),
        description: 'Add version field',
      };

      engine.registerMigration(migration);

      // Should not throw
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Registered migration'),
        expect.objectContaining({ from: 1, to: 2 })
      );
    });

    it('should prevent duplicate migration registration', () => {
      const migration: StateMigration = {
        fromVersion: 1,
        toVersion: 2,
        migrate: async (state: any) => state,
        description: 'Test',
      };

      engine.registerMigration(migration);

      // Try to register again
      expect(() => engine.registerMigration(migration)).toThrow();
    });
  });

  describe('Migration execution', () => {
    it('should execute migrations in sequential order (v1→v2→v3)', async () => {
      const executionOrder: number[] = [];

      const migration1to2: StateMigration = {
        fromVersion: 1,
        toVersion: 2,
        migrate: async (state: any) => {
          executionOrder.push(2);
          return { ...state, version: 2 };
        },
        description: 'v1→v2',
      };

      const migration2to3: StateMigration = {
        fromVersion: 2,
        toVersion: 3,
        migrate: async (state: any) => {
          executionOrder.push(3);
          return { ...state, version: 3 };
        },
        description: 'v2→v3',
      };

      engine.registerMigration(migration1to2);
      engine.registerMigration(migration2to3);

      const v1State = { defaultMode: 'walk' };
      const result = await engine.migrate(v1State, 1, 3);

      expect(result.success).toBe(true);
      expect(executionOrder).toEqual([2, 3]);
      if (result.success) {
        expect(result.value.version).toBe(3);
      }
    });

    it('should migrate v1 to v2 correctly', async () => {
      const migration: StateMigration = {
        fromVersion: 1,
        toVersion: 2,
        migrate: async (state: any) => ({
          currentMode: state.defaultMode || 'walk',
          version: 2,
          metadata: {
            version: 2,
            lastModified: Date.now(),
          },
        }),
        description: 'v1→v2: Add metadata',
      };

      engine.registerMigration(migration);

      const v1State = { defaultMode: 'walk' };
      const result = await engine.migrate(v1State, 1, 2);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.currentMode).toBe('walk');
        expect(result.value.version).toBe(2);
        expect(result.value.metadata).toBeDefined();
      }
    });

    it('should skip migration if already at target version', async () => {
      const migration: StateMigration = {
        fromVersion: 1,
        toVersion: 2,
        migrate: vi.fn().mockResolvedValue({ version: 2 }),
        description: 'Test',
      };

      engine.registerMigration(migration);

      const v2State = { version: 2, currentMode: 'walk' };
      const result = await engine.migrate(v2State, 2, 2);

      expect(result.success).toBe(true);
      expect(migration.migrate).not.toHaveBeenCalled();
      if (result.success) {
        expect(result.value).toEqual(v2State);
      }
    });
  });

  describe('Error handling', () => {
    it('should handle migration failure gracefully', async () => {
      const failingMigration: StateMigration = {
        fromVersion: 1,
        toVersion: 2,
        migrate: async () => {
          throw new Error('Migration failed');
        },
        description: 'Failing migration',
      };

      engine.registerMigration(failingMigration);

      const v1State = { defaultMode: 'walk' };
      const result = await engine.migrate(v1State, 1, 2);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Migration failed');
      }
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should validate state before and after migration', async () => {
      const migration: StateMigration = {
        fromVersion: 1,
        toVersion: 2,
        migrate: async (_state: any) => ({
          // Invalid: missing version field (or other required fields)
          // Migration produces incomplete state
        }),
        description: 'Invalid migration',
      };

      engine.registerMigration(migration);

      const v1State = { defaultMode: 'walk' };
      const result = await engine.migrate(v1State, 1, 2);

      // Migration completes but should warn about invalid result
      expect(result.success).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('version'),
        expect.anything()
      );
    });
  });

  describe('Migration logging', () => {
    it('should log all migrations with version numbers', async () => {
      const migration: StateMigration = {
        fromVersion: 1,
        toVersion: 2,
        migrate: async (state: any) => ({ ...state, version: 2 }),
        description: 'Test migration',
      };

      engine.registerMigration(migration);

      await engine.migrate({ defaultMode: 'walk' }, 1, 2);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Migrating'),
        expect.objectContaining({ from: 1, to: 2 })
      );
    });
  });

  describe('Version management', () => {
    it('should return current version', () => {
      expect(engine.getCurrentVersion()).toBe(2);
    });

    it('should detect state version from metadata', () => {
      const v2State = { version: 2, currentMode: 'walk' };
      expect(engine.detectVersion(v2State)).toBe(2);

      const v1State = { defaultMode: 'walk' };
      expect(engine.detectVersion(v1State)).toBe(1);
    });
  });

  describe('Migration chaining', () => {
    it('should chain migrations v1→v2→v3 correctly', async () => {
      const migration1to2: StateMigration = {
        fromVersion: 1,
        toVersion: 2,
        migrate: async (state: any) => ({
          currentMode: state.defaultMode || 'walk',
          version: 2,
        }),
        description: 'v1→v2',
      };

      const migration2to3: StateMigration = {
        fromVersion: 2,
        toVersion: 3,
        migrate: async (state: any) => ({
          ...state,
          version: 3,
          newField: 'added in v3',
        }),
        description: 'v2→v3',
      };

      engine.registerMigration(migration1to2);
      engine.registerMigration(migration2to3);

      const v1State = { defaultMode: 'sprint' };
      const result = await engine.migrate(v1State, 1, 3);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.version).toBe(3);
        expect(result.value.currentMode).toBe('sprint');
        expect(result.value.newField).toBe('added in v3');
      }
    });
  });
});
