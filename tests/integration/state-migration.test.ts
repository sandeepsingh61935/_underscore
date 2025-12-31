/**
 * @file state-migration.test.ts
 * @description Integration tests for full state migration flow
 * 
 * Tests end-to-end migration scenarios with real chrome.storage mock.
 * Follows testing-strategy-v2 Principle #6: Real, tricky test cases.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModeStateManager } from '@/content/modes/mode-state-manager';
import { ModeManager } from '@/content/modes/mode-manager';
import type { ILogger } from '@/shared/utils/logger';

// Persistent storage for integration test
const storageData: Record<string, any> = {};

const mockChromeStorage = {
    sync: {
        get: vi.fn().mockImplementation((keys) => {
            if (Array.isArray(keys)) {
                return Promise.resolve(
                    keys.reduce((acc, key) => ({ ...acc, [key]: storageData[key] }), {})
                );
            }
            return Promise.resolve({ [keys]: storageData[keys] });
        }),
        set: vi.fn().mockImplementation((items) => {
            Object.assign(storageData, items);
            return Promise.resolve();
        }),
    },
};

global.chrome = {
    storage: mockChromeStorage,
    runtime: {
        sendMessage: vi.fn(),
    },
} as any;

describe('State Migration Integration', () => {
    let stateManager: ModeStateManager;
    let mockModeManager: ModeManager;
    let mockLogger: ILogger;

    beforeEach(() => {
        // Clear storage
        for (const key in storageData) delete storageData[key];

        mockModeManager = {
            activateMode: vi.fn().mockResolvedValue(undefined),
        } as any;

        mockLogger = {
            info: vi.fn(),
            debug: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
        } as any;

        stateManager = new ModeStateManager(mockModeManager, mockLogger);
        vi.clearAllMocks();
    });

    describe('Full migration flow: v1 → v2', () => {
        it('should load v1 state, migrate, persist v2, and reload correctly', async () => {
            // STEP 1: Simulate v1 state in storage
            storageData['defaultMode'] = 'sprint';
            // No metadata = v1 state

            // STEP 2: Initialize - should trigger migration
            await stateManager.init();

            // STEP 3: Verify state is now v2
            expect(stateManager.getMode()).toBe('sprint'); // Preference preserved

            // STEP 4: Verify v2 state was persisted
            expect(storageData['defaultMode']).toBe('sprint');
            expect(storageData['metadata']).toBeDefined();
            expect(storageData['metadata'].version).toBe(2);
            expect(storageData['metadata'].lastModified).toBeGreaterThan(0);

            // STEP 5: Create new manager instance and reload
            vi.clearAllMocks(); // Clear logs from first init
            const stateManager2 = new ModeStateManager(mockModeManager, mockLogger);
            await stateManager2.init();

            // STEP 6: Verify no re-migration occurs (v2 → v2)
            expect(stateManager2.getMode()).toBe('sprint');
            const migrationLogs = (mockLogger.info as any).mock.calls.filter((call: any[]) =>
                call[0]?.includes?.('Migration complete')
            );
            // After clearing mocks, should have 0 migration logs (v2 loaded, no migration)
            expect(migrationLogs.length).toBe(0);
        });

        it('should handle migration with real chrome.storage async operations', async () => {
            // Simulate v1 state with async delay
            storageData['defaultMode'] = 'vault';

            // Add realistic delay to storage operations
            mockChromeStorage.sync.get.mockImplementation((keys) => {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        if (Array.isArray(keys)) {
                            resolve(keys.reduce((acc, key) => ({ ...acc, [key]: storageData[key] }), {}));
                        } else {
                            resolve({ [keys]: storageData[keys] });
                        }
                    }, 10); // 10ms delay
                });
            });

            mockChromeStorage.sync.set.mockImplementation((items) => {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        Object.assign(storageData, items);
                        resolve(undefined);
                    }, 10);
                });
            });

            // Should handle async correctly
            await stateManager.init();

            expect(stateManager.getMode()).toBe('vault');
            expect(storageData['metadata']).toBeDefined();
            expect(storageData['metadata'].version).toBe(2);
        });

        it('should preserve all valid v1 modes through migration', async () => {
            const modes = ['walk', 'sprint', 'vault'] as const;

            for (const mode of modes) {
                // Clear storage
                for (const key in storageData) delete storageData[key];

                // Set v1 state
                storageData['defaultMode'] = mode;

                // Migrate
                const manager = new ModeStateManager(mockModeManager, mockLogger);
                await manager.init();

                // Verify
                expect(manager.getMode()).toBe(mode);
                expect(storageData['metadata'].version).toBe(2);
            }
        });
    });

    describe('Migration edge cases', () => {
        it('should handle corrupted v1 state with fallback', async () => {
            // Corrupted v1 state
            storageData['defaultMode'] = 'corrupted-mode-value';

            await stateManager.init();

            // Should fallback to walk
            expect(stateManager.getMode()).toBe('walk');
            // Should still create v2 metadata
            expect(storageData['metadata'].version).toBe(2);
        });

        it('should handle missing defaultMode in v1 state', async () => {
            // Empty v1 state
            // (no defaultMode set)

            await stateManager.init();

            // Should use default
            expect(stateManager.getMode()).toBe('walk');
            // Should create v2 metadata
            expect(storageData['metadata']).toBeDefined();
            expect(storageData['metadata'].version).toBe(2);
        });

        it('should handle partial v2 state (metadata exists but invalid)', async () => {
            // Partially migrated or corrupted v2 state
            storageData['defaultMode'] = 'sprint';
            storageData['metadata'] = {
                version: '2', // Wrong type!
                lastModified: Date.now(),
            };

            await stateManager.init();

            // Should handle gracefully
            expect(stateManager.getMode()).toBe('sprint');
        });
    });

    describe('Migration logging and observability', () => {
        it('should log migration steps at each stage', async () => {
            storageData['defaultMode'] = 'vault';

            await stateManager.init();

            // Should log migration detection
            const infoLogs = (mockLogger.info as any).mock.calls.map((call: any[]) => call[0]);
            const hasMigrationNeeded = infoLogs.some((msg: string) => msg.includes('Migration needed'));
            const hasMigrationComplete = infoLogs.some((msg: string) => msg.includes('Migration complete'));

            expect(hasMigrationNeeded).toBe(true);
            expect(hasMigrationComplete).toBe(true);
        });

        it('should include version information in migration logs', async () => {
            storageData['defaultMode'] = 'walk';

            await stateManager.init();

            // Check that logs include version context
            const infoLogs = (mockLogger.info as any).mock.calls;
            const migrationLog = infoLogs.find((call: any[]) =>
                call[0]?.includes?.('Migration needed')
            );

            expect(migrationLog).toBeDefined();
            expect(migrationLog[1]).toMatchObject({
                currentVersion: 1,
                targetVersion: 2,
            });
        });
    });

    describe('Tricky edge cases (production scenarios)', () => {
        it('should handle chrome.storage quota exceeded during migration write', async () => {
            storageData['defaultMode'] = 'vault';

            // Simulate quota exceeded on write
            mockChromeStorage.sync.set.mockRejectedValueOnce(
                new Error('QUOTA_BYTES_PER_ITEM quota exceeded')
            );

            // Migration should still complete in memory
            await stateManager.init();

            // State loaded in memory
            expect(stateManager.getMode()).toBe('vault');

            // Should log persistence error
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed to persist'),
                expect.any(Error)
            );
        });

        it('should handle concurrent init() from multiple tabs', async () => {
            storageData['defaultMode'] = 'sprint';

            // Simulate two tabs initializing simultaneously
            const manager1 = new ModeStateManager(mockModeManager, mockLogger);
            const manager2 = new ModeStateManager(mockModeManager, mockLogger);

            // Both init at same time (race condition)
            await Promise.all([
                manager1.init(),
                manager2.init()
            ]);

            // Both should end up with same state
            expect(manager1.getMode()).toBe(manager2.getMode());
            expect(manager1.getMode()).toBe('sprint');

            // Storage should have v2 metadata
            expect(storageData['metadata']).toBeDefined();
            expect(storageData['metadata'].version).toBe(2);
        });

        it('should handle storage write failing halfway through migration', async () => {
            storageData['defaultMode'] = 'vault';

            let writeCount = 0;
            mockChromeStorage.sync.set.mockImplementation((items) => {
                writeCount++;
                if (writeCount === 1) {
                    // First write (during migration) fails
                    return Promise.reject(new Error('Storage write failed'));
                }
                // Subsequent writes succeed
                Object.assign(storageData, items);
                return Promise.resolve();
            });

            // Init should handle gracefully
            await stateManager.init();

            // Mode should still be loaded
            expect(stateManager.getMode()).toBe('vault');

            // Error should be logged
            expect(mockLogger.error).toHaveBeenCalled();
        });

        it('should handle race condition: setMode() during migration', async () => {
            storageData['defaultMode'] = 'walk';

            // Make migration slow
            mockChromeStorage.sync.set.mockImplementation((items) => {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        Object.assign(storageData, items);
                        resolve(undefined);
                    }, 50); // 50ms delay
                });
            });

            // Start init (triggers slow migration)
            const initPromise = stateManager.init();

            // Immediately try to change mode while migrating
            await new Promise(resolve => setTimeout(resolve, 10)); // Wait 10ms
            await stateManager.setMode('vault'); // Changed to vault

            // Wait for migration to finish
            await initPromise;

            // The later operation should win
            // (setMode happened after init started but might finish in different order)
            const finalMode = stateManager.getMode();
            expect(['walk', 'vault']).toContain(finalMode);
        });

        it('should handle orphaned state from browser crash mid-migration', async () => {
            // Simulate: migration started, wrote partial data, crashed
            storageData['defaultMode'] = 'sprint';
            storageData['metadata'] = {
                version: 1, // Old version still there
                lastModified: Date.now() - 1000000, // Very old
            };

            // Init should detect incomplete migration and re-run
            await stateManager.init();

            // Should complete migration
            expect(stateManager.getMode()).toBe('sprint');
            expect(storageData['metadata'].version).toBe(2);
        });

        it('should handle very large metadata objects', async () => {
            storageData['defaultMode'] = 'vault';

            // Create bloated v1 state (simulates user adding lots of data manually)
            const largeObject: any = { defaultMode: 'vault' };
            for (let i = 0; i < 100; i++) {
                largeObject[`someRandomField${i}`] = 'x'.repeat(100);
            }
            Object.assign(storageData, largeObject);

            // Migration should handle large state
            const startTime = Date.now();
            await stateManager.init();
            const duration = Date.now() - startTime;

            // Should complete reasonably fast (< 1 second)
            expect(duration).toBeLessThan(1000);
            expect(stateManager.getMode()).toBe('vault');
        });

        it('should handle rapid sequential migrations', async () => {
            // Simulate: v1 → v2 → setMode → setMode → reload
            storageData['defaultMode'] = 'walk';

            await stateManager.init(); // v1 → v2
            await stateManager.setMode('sprint');
            await stateManager.setMode('vault');

            // Reload
            const manager2 = new ModeStateManager(mockModeManager, mockLogger);
            await manager2.init();

            expect(manager2.getMode()).toBe('vault');
            expect(storageData['metadata'].version).toBe(2);
        });
    });
});
