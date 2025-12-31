/**
 * @file mode-state-validation.test.ts
 * @description Integration tests for ModeStateManager validation flow
 * 
 * Tests the full validation cycle:
 * setMode -> validate -> persist -> load -> validate -> apply
 * 
 * Follows testing-strategy-v2 Principle #6: Real, tricky test cases.
 * - Uses real chrome.storage mock (behavioral)
 * - Simulates manual corruption of storage
 * - Verifies consistency across restarts
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ModeStateManager } from '@/content/modes/mode-state-manager';
import { ModeManager } from '@/content/modes/mode-manager';
import { ValidationError } from '@/shared/errors/app-error';
import type { ILogger } from '@/shared/utils/logger';

// Realistic chrome.storage mock that behaves like the real one
const storageData: Record<string, any> = {};

const mockChromeStorage = {
    sync: {
        get: vi.fn().mockImplementation((keys) => {
            if (typeof keys === 'string') {
                return Promise.resolve({ [keys]: storageData[keys] });
            }
            if (Array.isArray(keys)) {
                return Promise.resolve(
                    keys.reduce((acc, key) => ({ ...acc, [key]: storageData[key] }), {})
                );
            }
            return Promise.resolve(storageData); // Get all
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

describe('ModeStateManager - Validation Integration', () => {
    let stateManager: ModeStateManager;
    let mockModeManager: ModeManager;
    let mockLogger: ILogger;

    beforeEach(() => {
        // Clear storage between tests
        for (const key in storageData) delete storageData[key];

        mockModeManager = {
            activateMode: vi.fn().mockResolvedValue(undefined),
        } as any;

        mockLogger = {
            info: vi.fn(),
            debug: vi.fn(),
            error: vi.fn(),
        } as any;

        stateManager = new ModeStateManager(mockModeManager, mockLogger);
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should pass full validation flow: set -> persist -> reload', async () => {
        // 1. Set mode to 'sprint'
        await stateManager.setMode('sprint');

        // Verify current state
        expect(stateManager.getMode()).toBe('sprint');

        // 2. Simulate app restart (new instance)
        const newStateManager = new ModeStateManager(mockModeManager, mockLogger);

        // 3. Initialize new instance (loads from storage)
        await newStateManager.init();

        // 4. Verify state was persisted and reloaded correctly
        expect(newStateManager.getMode()).toBe('sprint');
        expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should recover from manually corrupted storage', async () => {
        // 1. Manually corrupt storage (simulate user editing sync data or bug)
        storageData['defaultMode'] = 'invalid-mode-hacker';
        storageData['metadata'] = { version: 'bad' }; // Invalid metadata

        // 2. Initialize manager
        await stateManager.init();

        // 3. Verify fallback to safe default ('walk')
        expect(stateManager.getMode()).toBe('walk');

        // 4. Verify errors were logged
        expect(mockLogger.error).toHaveBeenCalledWith(
            expect.stringContaining('Invalid mode'),
            expect.any(Error)
        );
    });

    it('should propagate validation errors up to the caller with stack', async () => {
        // 1. Call setMode with invalid value
        try {
            await stateManager.setMode('god-mode' as any);
            expect.fail('Should have thrown ValidationError');
        } catch (error) {
            // 2. Verify error type and content
            expect(error).toBeInstanceOf(ValidationError);
            const err = error as ValidationError;
            expect(err.message).toContain('god-mode');
            expect(err.context).toBeDefined();
            // 3. Verify it didn't persist bad data
            expect(storageData['defaultMode']).toBeUndefined();
        }
    });

    it('should maintain state consistency on validation failure', async () => {
        // 1. Set valid initial state (use 'sprint' so persistence actually happens)
        // Default is 'walk', so setMode('walk') is a no-op and doesn't write to storage
        await stateManager.setMode('sprint');

        // 2. Attempt invalid transition
        try {
            await stateManager.setMode(undefined as any);
        } catch (e) {
            // Ignore expected error
        }

        // 3. Verify state remains 'sprint'
        expect(stateManager.getMode()).toBe('sprint');

        // 4. Verify storage remains 'sprint'
        expect(storageData['defaultMode']).toBe('sprint');
    });
});
