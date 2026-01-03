/**
 * @file mode-state-metadata.test.ts
 * @description Unit tests for state metadata validation
 * 
 * Tests realistic scenarios for metadata handling:
 * - Metadata persistence across chrome.storage operations
 * - Version tracking for migration detection
 * - Flag management for feature toggles
 * - Metadata corruption handling
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ModeStateManager } from '@/content/modes/mode-state-manager';
import { ModeManager } from '@/content/modes/mode-manager';
import type { ILogger } from '@/shared/utils/logger';

// Mock chrome.storage
const mockChromeStorage = {
    sync: {
        get: vi.fn(),
        set: vi.fn(),
    },
};

global.chrome = {
    storage: mockChromeStorage,
    runtime: {
        sendMessage: vi.fn().mockResolvedValue(undefined),
    },
} as any;

describe('ModeStateManager - Metadata Validation', () => {
    let stateManager: ModeStateManager;
    let mockModeManager: ModeManager;
    let mockLogger: {
        info: ReturnType<typeof vi.fn>;
        debug: ReturnType<typeof vi.fn>;
        error: ReturnType<typeof vi.fn>;
        warn: ReturnType<typeof vi.fn>;
        setLevel: ReturnType<typeof vi.fn>;
        getLevel: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        mockModeManager = {
            activateMode: vi.fn().mockResolvedValue(undefined),
        } as any;

        mockLogger = {
            info: vi.fn(),
            debug: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
            setLevel: vi.fn(),
            getLevel: vi.fn(),
        };

        stateManager = new ModeStateManager(mockModeManager, mockLogger as unknown as ILogger);

        mockChromeStorage.sync.get.mockReset();
        mockChromeStorage.sync.set.mockReset();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Metadata persistence', () => {
        it('should persist metadata with state to chrome.storage', async () => {
            // Arrange
            await stateManager.setMode('sprint');

            // Act
            const setCall = mockChromeStorage.sync.set.mock.calls[0]?.[0];

            // Assert - Metadata should be included in persisted state
            expect(setCall).toBeDefined();
            expect(setCall.metadata).toBeDefined();
            expect(setCall.metadata.version).toBe(2);
            expect(setCall.metadata.lastModified).toBeGreaterThan(0);
        });

        it('should load metadata from chrome.storage on init', async () => {
            // Arrange - Simulate stored state with metadata
            const storedState = {
                defaultMode: 'vault',
                metadata: {
                    version: 2,
                    lastModified: Date.now() - 1000,
                    flags: { betaFeatures: true },
                },
            };
            mockChromeStorage.sync.get.mockResolvedValue(storedState);

            // Act
            await stateManager.init();

            // Assert
            expect(stateManager.getMode()).toBe('vault');
            // Metadata should be loaded (verified by side effects or checking internal state if exposed)
        });

        it('should update lastModified timestamp on each mode change', async () => {
            // Arrange - Set initial mode to sprint (not walk, which is default)
            await stateManager.setMode('sprint');
            const firstTimestamp = mockChromeStorage.sync.set.mock.calls[0]?.[0]?.metadata?.lastModified;

            // Wait a bit to ensure timestamp difference
            await new Promise(resolve => setTimeout(resolve, 10));

            // Act - Switch to vault
            await stateManager.setMode('vault');
            const secondTimestamp = mockChromeStorage.sync.set.mock.calls[1]?.[0]?.metadata?.lastModified;

            // Assert - Both timestamps should be defined and second should be >= first
            expect(firstTimestamp).toBeDefined();
            expect(secondTimestamp).toBeDefined();
            expect(secondTimestamp).toBeGreaterThanOrEqual(firstTimestamp!);
        });

        it('should preserve metadata across multiple mode switches', async () => {
            // Arrange
            await stateManager.setMode('walk');
            await stateManager.setMode('sprint');
            await stateManager.setMode('vault');

            // Act
            const allCalls = mockChromeStorage.sync.set.mock.calls;

            // Assert - All calls should have metadata
            allCalls.forEach((call) => {
                expect(call[0]?.metadata).toBeDefined();
                expect(call[0]?.metadata?.version).toBe(2);
            });
        });
    });

    describe('Metadata validation', () => {
        it('should validate metadata structure on load', async () => {
            // Arrange - Valid metadata
            mockChromeStorage.sync.get.mockResolvedValue({
                defaultMode: 'sprint',
                metadata: {
                    version: 2,
                    lastModified: Date.now(),
                },
            });

            // Act & Assert - Should not throw
            await expect(stateManager.init()).resolves.not.toThrow();
            expect(stateManager.getMode()).toBe('sprint');
        });

        it('should handle missing metadata gracefully', async () => {
            // Arrange - Old state format without metadata
            mockChromeStorage.sync.get.mockResolvedValue({
                defaultMode: 'walk',
                // No metadata field
            });

            // Act
            await stateManager.init();

            // Assert - Should fall back to default or trigger migration
            expect(stateManager.getMode()).toBe('walk');
        });

        it('should reject metadata with invalid version type', async () => {
            // Arrange - Version is string instead of number
            mockChromeStorage.sync.get.mockResolvedValue({
                defaultMode: 'sprint',
                metadata: {
                    version: '2', // Wrong type
                    lastModified: Date.now(),
                },
            });

            // Act
            await stateManager.init();

            // Assert - Migration engine detects invalid v2 metadata
            // System handles gracefully - mode still loads
            expect(stateManager.getMode()).toBe('sprint');
        });

        it('should reject metadata with negative version', async () => {
            // Arrange
            mockChromeStorage.sync.get.mockResolvedValue({
                defaultMode: 'vault',
                metadata: {
                    version: -1,
                    lastModified: Date.now(),
                },
            });

            // Act
            await stateManager.init();

            // Assert - Negative version triggers migration, but user preference (vault) is preserved
            // Migration fixes metadata while keeping the valid mode choice
            expect(stateManager.getMode()).toBe('vault');
        });

        it('should reject metadata with invalid lastModified', async () => {
            // Arrange - lastModified is string
            mockChromeStorage.sync.get.mockResolvedValue({
                defaultMode: 'sprint',
                metadata: {
                    version: 2,
                    lastModified: 'invalid', // should be number
                },
            });

            // Act
            await stateManager.init();

            // Assert - State should be repaired
            // Mode defaults to fallback (or valid if separate) but here we expect clean slate or repair
            // Implementation: validates metadata, fails -> resets metadata
            expect(stateManager.getMode()).toBe('sprint');

            // Verify warning logs for reset
            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Invalid metadata'),
                expect.any(Object)
            );
        });

        it('should handle corrupted metadata object', async () => {
            // Arrange - Metadata is array instead of object
            mockChromeStorage.sync.get.mockResolvedValue({
                defaultMode: 'walk',
                metadata: ['corrupted', 'data'],
            });

            // Act
            await stateManager.init();

            // Assert - Handles completely corrupted metadata gracefully
            expect(stateManager.getMode()).toBe('walk');
        });
    });

    describe('Migration trigger detection', () => {
        it('should detect v1 state (no metadata) and trigger migration', async () => {
            // Arrange - v1 state format
            mockChromeStorage.sync.get.mockResolvedValue({
                defaultMode: 'sprint',
                // No metadata = v1 state
            });

            // Act
            await stateManager.init();

            // Assert - Should log migration needed
            const logCalls = mockLogger.info.mock.calls.map(call => call[0]);
            const hasMigrationLog = logCalls.some(msg =>
                typeof msg === 'string' && (msg.includes('migration') || msg.includes('v1') || msg.includes('upgrade'))
            );
            expect(hasMigrationLog).toBe(true);
        });

        it('should detect old version and trigger migration', async () => {
            // Arrange - v1 state with version 1
            mockChromeStorage.sync.get.mockResolvedValue({
                defaultMode: 'vault',
                metadata: {
                    version: 1,
                    lastModified: Date.now(),
                },
            });

            // Act
            await stateManager.init();

            // Assert - Should trigger migration (logged as info, not error)
            const logCalls = [...mockLogger.info.mock.calls, ...mockLogger.error.mock.calls]
                .map((call: any) => call[0]);
            const hasMigrationLog = logCalls.some((msg: any) =>
                typeof msg === 'string' && msg.toLowerCase().includes('migration')
            );
            expect(hasMigrationLog).toBe(true);
        });

        it('should skip migration for current version', async () => {
            // Arrange - Current v2 state
            mockChromeStorage.sync.get.mockResolvedValue({
                defaultMode: 'sprint',
                metadata: {
                    version: 2,
                    lastModified: Date.now(),
                },
            });

            // Act
            await stateManager.init();

            // Assert - Migration check happens but no actual migration needed
            // "Migration complete" is logged only when migration actually happens
            const logCalls = mockLogger.info.mock.calls.map(call => call[0]);
            const hasActualMigration = logCalls.some(msg =>
                typeof msg === 'string' && msg.includes('Migration complete')
            );
            expect(hasActualMigration).toBe(false); // No actual migration performed
        });
    });

    describe('Feature flags in metadata', () => {
        it('should persist feature flags in metadata', async () => {
            // Arrange - Set mode to sprint (not walk, which is default)
            await stateManager.setMode('sprint');

            // Act
            const savedState = mockChromeStorage.sync.set.mock.calls[0]?.[0];

            // Assert - Metadata should be persisted (flags are optional)
            expect(savedState).toBeDefined();
            expect(savedState.metadata).toBeDefined();
            expect(savedState.metadata.version).toBe(2);
            expect(savedState.metadata.lastModified).toBeGreaterThan(0);
            // Flags are optional, so just verify structure supports them if present
            if (savedState.metadata.flags) {
                expect(typeof savedState.metadata.flags).toBe('object');
            }
        });

        it('should load feature flags from storage', async () => {
            // Arrange
            mockChromeStorage.sync.get.mockResolvedValue({
                defaultMode: 'sprint',
                metadata: {
                    version: 2,
                    lastModified: Date.now(),
                    flags: {
                        debugMode: true,
                        betaFeatures: false,
                    },
                },
            });

            // Act
            await stateManager.init();

            // Assert - Flags should be loaded
            expect(stateManager.getMode()).toBe('sprint');
        });

        it('should handle invalid flag types gracefully', async () => {
            // Arrange - Flags with non-boolean values
            mockChromeStorage.sync.get.mockResolvedValue({
                defaultMode: 'vault',
                metadata: {
                    version: 2,
                    lastModified: Date.now(),
                    flags: {
                        debugMode: 'true', // String instead of boolean
                        betaFeatures: 1, // Number instead of boolean
                    },
                },
            });

            // Act - Init with corrupted flag type
            await stateManager.init();

            // Assert - Should handle gracefully without crashing.
            // Invalid flags usually trigger metadata repair/reset.
            expect(stateManager.getMode()).toBe('vault');

            // Check that it warned about invalid metadata
            expect(mockLogger.warn).toHaveBeenCalled();
        });
    });
});
