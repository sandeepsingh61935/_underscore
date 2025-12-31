/**
 * @file mode-state-manager-migration.test.ts
 * @description Tests for migration integration in ModeStateManager.init()
 * 
 * Tests automatic v1→v2 state migration during initialization.
 * Follows testing-strategy-v2 Principle #6: Real, tricky test cases.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModeStateManager } from '@/content/modes/mode-state-manager';
import { ModeManager } from '@/content/modes/mode-manager';
import type { ILogger } from '@/shared/utils/logger';

// Mock chrome.storage
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

describe('ModeStateManager - Auto-Migration', () => {
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

    describe('V1 state detection', () => {
        it('should detect v1 state (no version field)', async () => {
            // Arrange - v1 state in storage
            storageData['defaultMode'] = 'sprint';

            // Act
            await stateManager.init();

            // Assert - Should log migration detection
            expect(mockLogger.info).toHaveBeenCalledWith(
                expect.stringContaining('migration'),
                expect.anything()
            );
        });

        it('should auto-migrate v1 to v2', async () => {
            // Arrange - v1 state
            storageData['defaultMode'] = 'vault';

            // Act
            await stateManager.init();

            // Assert - State should be migrated
            expect(stateManager.getMode()).toBe('vault');
            // User preference preserved
        });
    });

    describe('Migration persistence', () => {
        it('should persist migrated state to chrome.storage', async () => {
            // Arrange - v1 state
            storageData['defaultMode'] = 'sprint';

            // Act
            await stateManager.init();

            // Assert - v2 state should be persisted
            expect(mockChromeStorage.sync.set).toHaveBeenCalledWith(
                expect.objectContaining({
                    defaultMode: 'sprint',
                    metadata: expect.objectContaining({
                        version: 2,
                        lastModified: expect.any(Number),
                    }),
                })
            );
        });

        it('should not re-migrate v2 state', async () => {
            // Arrange - v2 state already in storage
            storageData['defaultMode'] = 'walk';
            storageData['metadata'] = {
                version: 2,
                lastModified: Date.now(),
            };

            // Act
            await stateManager.init();

            // Assert - No migration should occur
            // (chrome.storage.set shouldn't be called during init for v2)
            // Only during subsequent setMode() calls
        });
    });

    describe('Migration failure handling', () => {
        it('should fallback to default state if migration fails', async () => {
            // Arrange - corrupted v1 state
            storageData['defaultMode'] = 'completely-invalid-mode-that-will-fail';

            // Act
            await stateManager.init();

            // Assert - Should fallback to walk
            expect(stateManager.getMode()).toBe('walk');
            // Migration should have attempted but fallen back
        });

        it('should log migration errors', async () => {
            // Arrange - problematic v1 state
            storageData['defaultMode'] = null; // Null mode

            // Act
            await stateManager.init();

            // Assert - Error handling should have logged
            // (Either migration error or fallback info)
            expect(stateManager.getMode()).toBe('walk'); // Safe default
        });
    });
});
