/**
 * @file mode-state-manager-validation.test.ts
 * @description Unit tests for ModeStateManager validation integration
 * 
 * Tests realistic scenarios that would break in production:
 * - Type coercion from chrome.storage (strings vs enums)
 * - Race conditions during async validation
 * - Partial chrome.storage failures
 * - Invalid data from corrupted storage
 * - Edge cases with null/undefined/empty values
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import type { ModeManager } from '@/content/modes/mode-manager';
import { ModeStateManager } from '@/content/modes/mode-state-manager';
import { ValidationError } from '@/shared/errors/app-error';
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
        sendMessage: vi.fn(),
    },
} as any;

describe('ModeStateManager - Validation Integration', () => {
    let stateManager: ModeStateManager;
    let mockModeManager: ModeManager;
    let mockLogger: ILogger;

    beforeEach(() => {
        // Setup mocks
        mockModeManager = {
            activateMode: vi.fn().mockResolvedValue(undefined),
        } as any;

        mockLogger = {
            info: vi.fn(),
            debug: vi.fn(),
            error: vi.fn(),
        } as any;

        stateManager = new ModeStateManager(mockModeManager, mockLogger);

        // Reset chrome.storage mocks
        mockChromeStorage.sync.get.mockReset();
        mockChromeStorage.sync.set.mockReset();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('setMode() validation', () => {
        it('should accept valid mode names', async () => {
            // Arrange
            const validModes = ['walk', 'sprint', 'vault'] as const;

            // Act & Assert
            for (const mode of validModes) {
                await expect(stateManager.setMode(mode)).resolves.not.toThrow();
            }
        });

        it('should reject invalid mode with ValidationError containing mode name', async () => {
            // Arrange
            const invalidMode = 'invalid-mode' as any;

            // Act & Assert
            await expect(stateManager.setMode(invalidMode)).rejects.toThrow(ValidationError);

            try {
                await stateManager.setMode(invalidMode);
            } catch (error) {
                expect(error).toBeInstanceOf(ValidationError);
                expect((error as ValidationError).message).toContain('invalid-mode');
            }
        });

        it('should reject mode with type coercion (number to string)', async () => {
            // Arrange - Simulate chrome.storage returning number instead of string
            const numericMode = 123 as any;

            // Act & Assert
            await expect(stateManager.setMode(numericMode)).rejects.toThrow(ValidationError);
        });

        it('should reject null and undefined modes', async () => {
            // Arrange
            const invalidModes = [null, undefined] as any[];

            // Act & Assert
            for (const mode of invalidModes) {
                await expect(stateManager.setMode(mode)).rejects.toThrow(ValidationError);
            }
        });

        it('should reject empty string mode', async () => {
            // Arrange
            const emptyMode = '' as any;

            // Act & Assert
            await expect(stateManager.setMode(emptyMode)).rejects.toThrow(ValidationError);
        });

        it('should reject mode with extra whitespace', async () => {
            // Arrange - Simulate user input or corrupted storage
            const whitespaceMode = ' walk ' as any;

            // Act & Assert
            await expect(stateManager.setMode(whitespaceMode)).rejects.toThrow(ValidationError);
        });

        it('should reject mode with wrong case (Walk vs walk)', async () => {
            // Arrange - Case sensitivity matters for enum
            const wrongCaseMode = 'Walk' as any;

            // Act & Assert
            await expect(stateManager.setMode(wrongCaseMode)).rejects.toThrow(ValidationError);
        });

        it('should log validation errors with context', async () => {
            // Arrange
            const invalidMode = 'gen' as any; // Future mode, not yet supported

            // Act
            try {
                await stateManager.setMode(invalidMode);
            } catch {
                // Expected to throw
            }

            // Assert
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Validation'),
                expect.any(Error)
            );
        });
    });

    describe('init() validation', () => {
        it('should validate loaded state from chrome.storage', async () => {
            // Arrange
            mockChromeStorage.sync.get.mockResolvedValue({ defaultMode: 'sprint' });

            // Act
            await stateManager.init();

            // Assert
            expect(stateManager.getMode()).toBe('sprint');
        });

        it('should fallback to walk when chrome.storage returns invalid mode', async () => {
            // Arrange - Simulate corrupted storage
            mockChromeStorage.sync.get.mockResolvedValue({ defaultMode: 'corrupted' });

            // Act
            await stateManager.init();

            // Assert - Migration handles corrupted data, falls back to walk
            expect(stateManager.getMode()).toBe('walk');
        });

        it('should fallback to walk when chrome.storage returns null', async () => {
            // Arrange
            mockChromeStorage.sync.get.mockResolvedValue({ defaultMode: null });

            // Act
            await stateManager.init();

            // Assert
            expect(stateManager.getMode()).toBe('walk');
        });

        it('should fallback to walk when chrome.storage returns undefined', async () => {
            // Arrange
            mockChromeStorage.sync.get.mockResolvedValue({});

            // Act
            await stateManager.init();

            // Assert
            expect(stateManager.getMode()).toBe('walk');
        });

        it('should fallback to walk when chrome.storage returns number', async () => {
            // Arrange - Type coercion edge case
            mockChromeStorage.sync.get.mockResolvedValue({ defaultMode: 123 });

            // Act
            await stateManager.init();

            // Assert
            expect(stateManager.getMode()).toBe('walk');
        });

        it('should fallback to walk when chrome.storage returns object', async () => {
            // Arrange - Corrupted data structure
            mockChromeStorage.sync.get.mockResolvedValue({
                defaultMode: { nested: 'object' }
            });

            // Act
            await stateManager.init();

            // Assert
            expect(stateManager.getMode()).toBe('walk');
        });

        it('should fallback to walk when chrome.storage throws error', async () => {
            // Arrange - Network failure, quota exceeded, etc.
            mockChromeStorage.sync.get.mockRejectedValue(new Error('Storage quota exceeded'));

            // Act
            await stateManager.init();

            // Assert
            expect(stateManager.getMode()).toBe('walk');
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed to load preference'),
                expect.any(Error)
            );
        });

        it('should handle race condition: init called twice simultaneously', async () => {
            // Arrange
            mockChromeStorage.sync.get.mockResolvedValue({ defaultMode: 'vault' });

            // Act - Call init() twice without awaiting
            const promise1 = stateManager.init();
            const promise2 = stateManager.init();

            await Promise.all([promise1, promise2]);

            // Assert - Should not crash, final state should be consistent
            expect(stateManager.getMode()).toBe('vault');
            // chrome.storage.get should be called twice (no deduplication)
            expect(mockChromeStorage.sync.get).toHaveBeenCalledTimes(2);
        });
    });

    describe('ValidationError context', () => {
        it('should include field name in validation error', async () => {
            // Arrange
            const invalidMode = 'invalid' as any;

            // Act & Assert
            try {
                await stateManager.setMode(invalidMode);
                expect.fail('Should have thrown ValidationError');
            } catch (error) {
                expect(error).toBeInstanceOf(ValidationError);
                const validationError = error as ValidationError;
                // Error should mention the field that failed
                expect(validationError.message.toLowerCase()).toContain('mode');
            }
        });

        it('should include invalid value in validation error', async () => {
            // Arrange
            const invalidMode = 'gen' as any;

            // Act & Assert
            try {
                await stateManager.setMode(invalidMode);
                expect.fail('Should have thrown ValidationError');
            } catch (error) {
                const validationError = error as ValidationError;
                // Error should mention what value was invalid
                expect(validationError.message).toContain('gen');
            }
        });

        it('should include valid options in validation error', async () => {
            // Arrange
            const invalidMode = 'invalid' as any;

            // Act & Assert
            try {
                await stateManager.setMode(invalidMode);
                expect.fail('Should have thrown ValidationError');
            } catch (error) {
                const validationError = error as ValidationError;
                // Error should tell user what the valid options are
                const message = validationError.message.toLowerCase();
                expect(
                    message.includes('walk') ||
                    message.includes('sprint') ||
                    message.includes('vault')
                ).toBe(true);
            }
        });
    });

    describe('Edge cases and boundary conditions', () => {
        it('should handle setMode() called during init()', async () => {
            // Arrange
            mockChromeStorage.sync.get.mockImplementation(() => {
                // Simulate slow storage read
                return new Promise(resolve => {
                    setTimeout(() => resolve({ defaultMode: 'sprint' }), 100);
                });
            });

            // Act - Start init, then immediately call setMode
            const initPromise = stateManager.init();
            await stateManager.setMode('vault'); // Completes first
            await initPromise; // Completes second, overwrites

            // Assert - init() wins because it completes last (race condition)
            // This is expected behavior - no locking mechanism
            expect(stateManager.getMode()).toBe('sprint');
        });

        it('should handle rapid mode switches', async () => {
            // Arrange
            const modes = ['walk', 'sprint', 'vault', 'walk', 'sprint'] as const;

            // Act - Rapidly switch modes
            for (const mode of modes) {
                await stateManager.setMode(mode);
            }

            // Assert - Final mode should be last one set
            expect(stateManager.getMode()).toBe('sprint');
        });

        it('should handle setMode() with same mode (no-op)', async () => {
            // Arrange
            await stateManager.setMode('walk');
            const callCountBefore = (mockModeManager.activateMode as any).mock.calls.length;

            // Act - Set to same mode
            await stateManager.setMode('walk');

            // Assert - Should return early, not call activateMode again
            const callCountAfter = (mockModeManager.activateMode as any).mock.calls.length;
            expect(callCountAfter).toBe(callCountBefore);
        });

        it('should validate mode even if chrome.storage.set fails', async () => {
            // Arrange
            mockChromeStorage.sync.set.mockRejectedValue(new Error('Storage quota exceeded'));

            // Act - Should still validate and switch mode
            await stateManager.setMode('sprint');

            // Assert - Mode switched despite storage failure
            expect(stateManager.getMode()).toBe('sprint');
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed to persist'),
                expect.any(Error)
            );
        });
    });

    describe('Real-world chrome.storage quirks', () => {
        it('should handle chrome.storage returning string "undefined"', async () => {
            // Arrange - Some browsers serialize undefined as string
            mockChromeStorage.sync.get.mockResolvedValue({ defaultMode: 'undefined' });

            // Act
            await stateManager.init();

            // Assert
            expect(stateManager.getMode()).toBe('walk');
        });

        it('should handle chrome.storage returning string "null"', async () => {
            // Arrange
            mockChromeStorage.sync.get.mockResolvedValue({ defaultMode: 'null' });

            // Act
            await stateManager.init();

            // Assert
            expect(stateManager.getMode()).toBe('walk');
        });

        it('should handle chrome.storage returning array instead of string', async () => {
            // Arrange - Corrupted data
            mockChromeStorage.sync.get.mockResolvedValue({ defaultMode: ['walk'] });

            // Act
            await stateManager.init();

            // Assert
            expect(stateManager.getMode()).toBe('walk');
        });

        it('should handle chrome.storage returning boolean', async () => {
            // Arrange
            mockChromeStorage.sync.get.mockResolvedValue({ defaultMode: true });

            // Act
            await stateManager.init();

            // Assert
            expect(stateManager.getMode()).toBe('walk');
        });
    });
});
