
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ModeStateManager } from '@/content/modes/mode-state-manager';
import { ModeManager } from '@/content/modes/mode-manager';
import { StatePersistenceError, StateValidationError } from '@/shared/errors/state-errors';

// Mock dependencies
const mockChromeStorage = {
    sync: {
        get: vi.fn(),
        set: vi.fn(),
    },
};
global.chrome = { storage: mockChromeStorage } as any;

const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
};

const mockModeManager = {
    activateMode: vi.fn().mockResolvedValue(undefined),
} as unknown as ModeManager;

describe('ModeStateManager Error Handling & Graceful Degradation', () => {
    let stateManager: ModeStateManager;

    beforeEach(() => {
        vi.clearAllMocks();
        stateManager = new ModeStateManager(mockModeManager, mockLogger as any);

        // Default successful storage setup
        mockChromeStorage.sync.get.mockResolvedValue({
            defaultMode: 'walk',
            metadata: { version: 2 }
        });
        mockChromeStorage.sync.set.mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('init() Error Boundaries', () => {
        it('should fallback to "walk" mode if storage read completely fails', async () => {
            const error = new Error('Storage disconnected');
            mockChromeStorage.sync.get.mockRejectedValue(error);

            await stateManager.init();

            // Should have logged the error
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed to initialize mode state'),
                expect.any(StatePersistenceError)
            );

            // Should fallback to default mode
            expect(stateManager.getMode()).toBe('walk');
            expect(mockModeManager.activateMode).toHaveBeenCalledWith('walk');
        });

        it('should handle corrupted state data by falling back to default', async () => {
            // Return invalid data type for mode
            mockChromeStorage.sync.get.mockResolvedValue({
                defaultMode: 12345, // Invalid type
                metadata: { version: 2 }
            });

            await stateManager.init();

            // Should log validation error
            expect(mockLogger.warn).toHaveBeenCalled();

            // Should fallback (validation failure in applyMode or process causes fallback)
            // Note: Current implementation might just validate and fail, we want to ensure it falls back safe.
            expect(stateManager.getMode()).toBe('walk');
        });
    });

    describe('setMode() Error Boundaries', () => {
        it('should gracefully handle persistence failures but keep memory state', async () => {
            // Setup initial state
            await stateManager.init();

            // Make storage.set fail
            const persistenceError = new Error('Quota exceeded');
            mockChromeStorage.sync.set.mockRejectedValue(persistenceError);

            // Attempt to change mode
            await stateManager.setMode('sprint');

            // Should be in 'sprint' in memory
            expect(stateManager.getMode()).toBe('sprint');

            // Should have tried to activate it
            expect(mockModeManager.activateMode).toHaveBeenCalledWith('sprint');

            // Should have logged error specifically as StatePersistenceError or similar wrapped error
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed to persist mode'),
                expect.any(Object)
            );
        });

        it('should reject invalid modes and throw StateValidationError', async () => {
            await expect(stateManager.setMode('invalid_mode' as any))
                .rejects
                .toThrow(StateValidationError);

            // Should remain in previous mode
            expect(stateManager.getMode()).toBe('walk');
        });

        it('should handle errors during mode activation', async () => {
            await stateManager.init();

            // Mock activation failure
            const activationError = new Error('Activation failed');
            (mockModeManager.activateMode as any).mockRejectedValueOnce(activationError);

            // It should probably revert the state or at least log the error
            // Design choice: Does setMode throw if activation fails? 
            // Ideally yes, to let the caller know.

            await expect(stateManager.setMode('vault')).rejects.toThrow('Activation failed');

            // Logged?
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('Concurrency & resilience', () => {
        it('should recover from ephemeral storage errors on subsequent retries', async () => {
            await stateManager.init();

            // First attempt fails
            mockChromeStorage.sync.set.mockRejectedValueOnce(new Error('Network glitch'));
            await stateManager.setMode('sprint');
            expect(mockLogger.error).toHaveBeenCalled();

            // Second attempt succeeds
            mockChromeStorage.sync.set.mockResolvedValue(undefined);
            await stateManager.setMode('vault');

            expect(stateManager.getMode()).toBe('vault');
            // Check storage was called for vault
            expect(mockChromeStorage.sync.set).toHaveBeenCalledWith(expect.objectContaining({
                defaultMode: 'vault'
            }));
        });
    });
});
