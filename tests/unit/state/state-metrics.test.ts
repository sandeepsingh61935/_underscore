/**
 * @file state-metrics.test.ts
 * @description Unit tests for ModeStateManager metrics tracking
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ModeStateManager } from '@/content/modes/mode-state-manager';
import { ModeManager } from '@/content/modes/mode-manager';
import { EventBus } from '@/shared/utils/event-bus';
import { ConsoleLogger } from '@/shared/utils/logger';

describe('ModeStateManager - State Metrics', () => {
    let modeStateManager: ModeStateManager;
    let modeManager: ModeManager;
    let eventBus: EventBus;
    let logger: ConsoleLogger;

    // Mock chrome.storage.sync
    const mockStorage = {
        get: vi.fn(),
        set: vi.fn(),
    };

    beforeEach(async () => {
        vi.clearAllMocks();

        global.chrome = {
            storage: {
                sync: mockStorage,
            },
            runtime: {
                id: 'test-extension-id',
            },
        } as any;

        mockStorage.get.mockResolvedValue({}); // Empty storage (defaults to walk mode)
        mockStorage.set.mockResolvedValue(undefined);

        eventBus = new EventBus();
        logger = new ConsoleLogger('TestLogger');

        // Mock logger to reduce noise
        vi.spyOn(logger, 'info').mockImplementation(() => { });
        vi.spyOn(logger, 'warn').mockImplementation(() => { });
        vi.spyOn(logger, 'debug').mockImplementation(() => { });

        modeManager = new ModeManager(eventBus, logger);

        // Register modes
        ['walk', 'sprint', 'vault'].forEach(mode => {
            modeManager.registerMode({
                name: mode as any,
                capabilities: {} as any,
                onActivate: vi.fn().mockResolvedValue(undefined),
                onDeactivate: vi.fn().mockResolvedValue(undefined),
            } as any);
        });

        modeStateManager = new ModeStateManager(modeManager, logger);
        await modeStateManager.init();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should track transition counts', async () => {
        // Act - Make same transition multiple times
        await modeStateManager.setMode('sprint');
        await modeStateManager.setMode('walk');
        await modeStateManager.setMode('sprint');
        await modeStateManager.setMode('walk');
        await modeStateManager.setMode('sprint');

        // Assert
        const metrics = modeStateManager.getMetrics();
        expect(metrics.transitionCounts).toBeDefined();
        expect(metrics.transitionCounts['walk→sprint']).toBe(3);
        expect(metrics.transitionCounts['sprint→walk']).toBe(2);
    });

    it('should track failure counts for blocked transitions', async () => {
        // Arrange - Mock state machine to block transition
        const stateMachine = (modeStateManager as any).stateMachine;
        vi.spyOn(stateMachine, 'executeGuards').mockResolvedValueOnce(false);

        // Act - Attempt transition that will be blocked
        try {
            await modeStateManager.setMode('vault');
        } catch (error) {
            // Expected to throw
        }

        // Assert
        const metrics = modeStateManager.getMetrics();
        expect(metrics.failureCounts).toBeDefined();
        expect(metrics.failureCounts['walk→vault']).toBe(1);
    });

    it('should track time spent in each mode', async () => {
        // Arrange - Mock Date.now() for predictable time tracking
        const mockNow = vi.spyOn(Date, 'now');
        let currentTime = 1000;
        mockNow.mockImplementation(() => currentTime);

        // Reinitialize manager with mocked time
        modeStateManager = new ModeStateManager(modeManager, logger);
        await modeStateManager.init();

        // Act - Spend time in different modes
        currentTime += 5000; // 5s in walk
        await modeStateManager.setMode('sprint');

        currentTime += 3000; // 3s in sprint
        await modeStateManager.setMode('vault');

        currentTime += 2000; // 2s in vault

        // Assert
        const metrics = modeStateManager.getMetrics();
        expect(metrics.timeInMode).toBeDefined();
        expect(metrics.timeInMode['walk']).toBe(5000);
        expect(metrics.timeInMode['sprint']).toBe(3000);
        expect(metrics.timeInMode['vault']).toBeGreaterThanOrEqual(2000); // Current mode time updated on getMetrics
    });

    it('should return complete metrics snapshot', async () => {
        // Arrange & Act
        await modeStateManager.setMode('sprint');
        await modeStateManager.setMode('vault');
        await modeStateManager.setMode('walk');

        // Assert
        const metrics = modeStateManager.getMetrics();

        // Should have all three properties
        expect(metrics).toHaveProperty('transitionCounts');
        expect(metrics).toHaveProperty('failureCounts');
        expect(metrics).toHaveProperty('timeInMode');

        // Should be plain objects (not Maps)
        expect(typeof metrics.transitionCounts).toBe('object');
        expect(typeof metrics.failureCounts).toBe('object');
        expect(typeof metrics.timeInMode).toBe('object');

        // Should contain expected transitions
        expect(metrics.transitionCounts['walk→sprint']).toBe(1);
        expect(metrics.transitionCounts['sprint→vault']).toBe(1);
        expect(metrics.transitionCounts['vault→walk']).toBe(1);
    });
});
