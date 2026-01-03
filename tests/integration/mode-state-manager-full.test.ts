/**
 * @file mode-state-manager-full.test.ts
 * @description Comprehensive integration test for the full lifecycle of ModeStateManager.
 * Covers: Init -> Transition -> Persist -> Reload -> Migrate -> Error Recovery.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ModeStateManager } from '@/content/modes/mode-state-manager';
import { ModeManager } from '@/content/modes/mode-manager';
import { EventBus } from '@/shared/utils/event-bus';
import { ConsoleLogger } from '@/shared/utils/logger';
import { ModeType } from '@/shared/schemas/mode-state-schemas';

describe('ModeStateManager - Full Integration Lifecycle', () => {
    let eventBus: EventBus;
    let logger: ConsoleLogger;
    let modeManager: ModeManager;
    let stateManager: ModeStateManager;

    // Simulated Chrome Storage (Persistent across reloads in verification)
    let storageBackingStore: Record<string, any> = {};

    const mockChromeStorage = {
        sync: {
            get: vi.fn().mockImplementation((keys) => {
                if (typeof keys === 'string') return Promise.resolve({ [keys]: storageBackingStore[keys] });
                if (Array.isArray(keys)) return Promise.resolve(
                    keys.reduce((acc, k) => ({ ...acc, [k]: storageBackingStore[k] }), {})
                );
                return Promise.resolve(storageBackingStore);
            }),
            set: vi.fn().mockImplementation((items) => {
                storageBackingStore = { ...storageBackingStore, ...items };
                return Promise.resolve();
            }),
        },
    };

    beforeEach(async () => {
        vi.clearAllMocks();
        global.chrome = {
            storage: mockChromeStorage,
            runtime: {
                id: 'test-ext-id',
                sendMessage: vi.fn().mockResolvedValue(undefined),
            }
        } as any;
        storageBackingStore = {}; // Reset storage

        // Reset default mock implementations (in case tests overrode them)
        mockChromeStorage.sync.get.mockImplementation((keys) => {
            if (typeof keys === 'string') return Promise.resolve({ [keys]: storageBackingStore[keys] });
            if (keys === null) return Promise.resolve(storageBackingStore);
            if (Array.isArray(keys)) return Promise.resolve(
                keys.reduce((acc, k) => ({ ...acc, [k]: storageBackingStore[k] }), {})
            );
            return Promise.resolve(storageBackingStore);
        });

        mockChromeStorage.sync.set.mockImplementation((items) => {
            storageBackingStore = { ...storageBackingStore, ...items };
            return Promise.resolve();
        });

        // Setup real EventBus and Logger
        eventBus = new EventBus();
        logger = new ConsoleLogger('TestLogger');
        vi.spyOn(logger, 'error').mockImplementation(() => { });
        vi.spyOn(logger, 'warn').mockImplementation(() => { });

        // Setup ModeManager with real logic (or minimal mock if dependencies are heavy)
        modeManager = new ModeManager(eventBus, logger);
        // Register basic modes to allow switching
        ['walk', 'sprint', 'vault'].forEach(mode => {
            modeManager.registerMode({
                name: mode as ModeType,
                onActivate: vi.fn().mockResolvedValue(undefined),
                onDeactivate: vi.fn().mockResolvedValue(undefined),
                capabilities: {} as any
            } as any);
        });

        // Initialize Manager
        stateManager = new ModeStateManager(modeManager, logger);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    /**
     * Helper to simulate a "Page Reload" or "Extension Restart"
     * Re-creates the ModeStateManager but keeps the 'storageBackingStore' intact.
     */
    async function simulateReload() {
        // Create new instance
        stateManager = new ModeStateManager(modeManager, logger);
        await stateManager.init();
    }

    it('Scenario 1: Full Lifecycle (Init -> Set -> Persist -> Reload -> Verify)', async () => {
        // 1. Init
        await stateManager.init();
        expect(stateManager.getMode()).toBe('walk'); // Default

        // 2. Transition
        await stateManager.setMode('sprint');
        expect(stateManager.getMode()).toBe('sprint');

        // 3. Verify Persistence
        // Check backing store directly to ensure it was written
        expect(storageBackingStore).toHaveProperty('defaultMode', 'sprint');

        // 4. Reload (simulated)
        await simulateReload();

        // 5. Verify Resumed State
        expect(stateManager.getMode()).toBe('sprint'); // Should load from 'storageBackingStore'
    });

    it('Scenario 2: State Persistence & Validation', async () => {
        await stateManager.init();

        // Valid transition
        await stateManager.setMode('vault');
        expect(stateManager.getMode()).toBe('vault');

        // Invalid transition attempts (should fail validation/guards)
        await expect(stateManager.setMode('invalid_mode' as any)).rejects.toThrow();

        // State should remain unchanged
        expect(stateManager.getMode()).toBe('vault');

        await simulateReload();
        expect(stateManager.getMode()).toBe('vault');
    });

    it('Scenario 3: Migration on Reload (V1 -> V2)', async () => {
        // 1. Seed V1 State
        storageBackingStore = {
            'defaultMode': 'sprint', // V1 key
            // No metadata
        };

        // 2. Init (triggers migration)
        const manager = new ModeStateManager(modeManager, logger);
        await manager.init();

        // 3. Verify Migration
        expect(manager.getMode()).toBe('sprint');
        expect(storageBackingStore).toHaveProperty('defaultMode', 'sprint'); // V2 key
        expect(storageBackingStore['metadata']).toBeDefined();
        expect(storageBackingStore['metadata'].version).toBe(2);

        // 4. Cleanup check
        // We purposefully DO NOT delete legacy data for safety/backup reasons
        // expect(storageBackingStore['defaultMode']).toBeUndefined(); 
        expect(storageBackingStore['defaultMode']).toBe('sprint'); // Legacy data remains
    });

    it('Scenario 4: Error Recovery - Storage Failure', async () => {
        // 1. Simulate Storage Failure
        mockChromeStorage.sync.get.mockRejectedValueOnce(new Error('Storage unavailable'));

        // 2. Init
        const manager = new ModeStateManager(modeManager, logger);
        await manager.init();

        // 3. Verify Fallback
        // Should catch error and default to 'walk'
        expect(manager.getMode()).toBe('walk');
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to initialize'), expect.any(Object));

        // 4. Verify System works in-memory
        await manager.setMode('sprint');
        expect(manager.getMode()).toBe('sprint');
    });

    it('Scenario 5: Circuit Breaker resilience', async () => {
        // 1. Setup - Manager running
        await stateManager.init();

        // 2. Fail Writes Repeatedly to Trip Breaker
        mockChromeStorage.sync.set.mockRejectedValue(new Error('Write fail'));

        // Force 6 failures (threshold is 5)
        for (let i = 0; i < 6; i++) {
            await stateManager.setMode(i % 2 === 0 ? 'sprint' : 'walk').catch(() => { });
        }

        // 3. Check Breaker State (indirectly or via debug)
        // Since setMode updates call updateTimeInMode and recordHistory...
        // The circuit breaker status isn't directly exposed on stateManager, 
        // but we can verify that subsequent calls don't even try storage if we spy on it.

        mockChromeStorage.sync.set.mockClear();
        // This call should be blocked by CB immediately (not calling sync.set)
        await stateManager.setMode('vault');

        expect(mockChromeStorage.sync.set).not.toHaveBeenCalled(); // Fast fail
        expect(stateManager.getMode()).toBe('vault'); // Memory state still updates!
    });

    it('Scenario 6: Large Data Migration (Edge Case)', async () => {
        // 1. Seed V1 State with large payload
        storageBackingStore = {
            'defaultMode': 'vault',
            // Add junk data to simulate large store
            'junk_1': 'x'.repeat(5000),
            'junk_2': 'y'.repeat(5000),
        };

        // 2. Init
        const manager = new ModeStateManager(modeManager, logger);
        await manager.init();

        // 3. Verify Migration Succeeded despite size
        expect(manager.getMode()).toBe('vault');
        expect(storageBackingStore).toHaveProperty('defaultMode', 'vault');

        // 4. Verify we didn't lose/corrupt other data (though our logic doesn't touch other keys, storage mock might)
        // In real Chrome storage, other keys persist. In our mock, they persist.
        expect(storageBackingStore['junk_1']).toBeDefined();
    });
});
