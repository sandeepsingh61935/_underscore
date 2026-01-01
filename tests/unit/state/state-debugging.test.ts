/**
 * @file state-debugging.test.ts
 * @description Unit tests for ModeStateManager debugging tools
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ModeStateManager } from '@/content/modes/mode-state-manager';
import { ModeManager } from '@/content/modes/mode-manager';
import { EventBus } from '@/shared/utils/event-bus';
import { ConsoleLogger } from '@/shared/utils/logger';

describe('ModeStateManager - Debugging Tools', () => {
    let modeStateManager: ModeStateManager;
    let modeManager: ModeManager;
    let eventBus: EventBus;
    let logger: ConsoleLogger;

    const mockStorage = {
        get: vi.fn(),
        set: vi.fn(),
    };

    beforeEach(async () => {
        vi.clearAllMocks();
        global.chrome = {
            storage: { sync: mockStorage },
            runtime: { id: 'test-id' },
        } as any;
        mockStorage.get.mockResolvedValue({});
        mockStorage.set.mockResolvedValue(undefined);

        eventBus = new EventBus();
        logger = new ConsoleLogger('TestLogger');
        // Silence logs
        vi.spyOn(logger, 'info').mockImplementation(() => { });
        vi.spyOn(logger, 'warn').mockImplementation(() => { });
        vi.spyOn(logger, 'debug').mockImplementation(() => { });

        modeManager = new ModeManager(eventBus, logger);
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

    it('should return comprehensive debug state', async () => {
        // Arrange - generate some state
        await modeStateManager.setMode('sprint');
        await modeStateManager.setMode('walk');

        // Act
        const debugState = modeStateManager.getDebugState();

        // Assert
        expect(debugState).toBeDefined();

        // Check current state
        expect(debugState.currentMode).toBe('walk');
        expect(debugState.metadata).toBeDefined();

        // Check history
        expect(debugState.history).toHaveLength(2);

        // Check metrics
        expect(debugState.metrics).toBeDefined();
        expect(debugState.metrics.transitionCounts['walk→sprint']).toBe(1);
    });

    it('should update time metrics before dumping debug state (pragmatic side effect)', async () => {
        // Arrange
        await modeStateManager.setMode('sprint');
        const mockNow = vi.spyOn(Date, 'now');
        mockNow.mockReturnValue(Date.now() + 5000); // Advance 5s

        // Act
        const debugState = modeStateManager.getDebugState();

        // Assert - Time in mode should be updated (~5000ms)
        expect(debugState.metrics.timeInMode['sprint']).toBeGreaterThanOrEqual(5000);
    });

    it('should be structured for easy JSON serialization', async () => {
        // Act
        const debugState = modeStateManager.getDebugState();
        const json = JSON.stringify(debugState);
        const parsed = JSON.parse(json);

        // Assert - Round trip successful
        expect(parsed.currentMode).toBe(debugState.currentMode);
        expect(parsed.metrics.transitionCounts).toEqual(debugState.metrics.transitionCounts);
    });

    describe('Edge Cases (Tricky)', () => {
        it('should ensure deep immutability (modifying return value does not corrupt internal state)', async () => {
            // Arrange
            await modeStateManager.setMode('sprint');
            const debugState = modeStateManager.getDebugState();

            // Act - Try to mutate everything
            (debugState as any).currentMode = 'broken';
            (debugState.metrics.transitionCounts as any)['walk→sprint'] = 999999;
            (debugState.history as any).push({ fake: 'entry' });

            // Assert - Internal state should be untouched
            const freshDebugState = modeStateManager.getDebugState();
            expect(freshDebugState.currentMode).toBe('sprint');
            expect(freshDebugState.metrics.transitionCounts['walk→sprint']).toBe(1);
            expect(freshDebugState.history).toHaveLength(1);
        });

        it('should handle massive state dump without crushing performance', async () => {
            // Arrange - Max out history and generate thousands of ops
            // We want to ensure JSON serialization doesn't choke on "large" (for this context) data
            for (let i = 0; i < 150; i++) { // Overfill history (100 max)
                await modeStateManager.setMode(i % 2 === 0 ? 'sprint' : 'walk');
            }
            // Manually inject massive metrics (simulation)
            const stateAny = modeStateManager as any;
            for (let i = 0; i < 10000; i++) {
                stateAny.transitionCounts.set(`random→${i}`, i);
            }

            // Act
            const start = performance.now();
            const debugState = modeStateManager.getDebugState();
            const json = JSON.stringify(debugState);
            const end = performance.now();

            // Assert
            expect(json.length).toBeGreaterThan(1000); // It's big
            expect(end - start).toBeLessThan(50); // Should be fast (<50ms)

            // Verify structure integretity
            expect(debugState.history).toHaveLength(100); // Capped
            expect(Object.keys(debugState.metrics.transitionCounts).length).toBeGreaterThan(10000);
        });

        it('should produce valid JSON even with "undefined" time values', async () => {
            // Arrange - Create state where some modes have undefined time
            await modeStateManager.setMode('sprint'); // Walk=0/undefined, Sprint=0

            // Act
            const debugState = modeStateManager.getDebugState();
            const json = JSON.stringify(debugState);
            const parsed = JSON.parse(json);

            // Assert
            // JSON.stringify drops keys with 'undefined' values, usually
            // We want to ensure the structure is still safe for consumers
            expect(parsed.metrics.timeInMode).toBeDefined();
            // 'walk' might be missing in JSON if undefined, or 0 if we init'd it.
            // Just ensure no crash.
            expect(parsed.currentMode).toBe('sprint');
        });
    });
});
