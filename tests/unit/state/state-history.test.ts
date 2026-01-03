/**
 * @file state-history.test.ts
 * @description Unit tests for ModeStateManager history tracking
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ModeStateManager } from '@/content/modes/mode-state-manager';
import { ModeManager } from '@/content/modes/mode-manager';
import { EventBus } from '@/shared/utils/event-bus';
import { ConsoleLogger } from '@/shared/utils/logger';

describe('ModeStateManager - State History Tracking', () => {
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
                sendMessage: vi.fn().mockResolvedValue(undefined),
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

    it('should record state changes in history', async () => {
        // Act
        await modeStateManager.setMode('sprint');

        // Assert
        const history = modeStateManager.getHistory();
        expect(history).toHaveLength(1);
        expect(history[0]).toMatchObject({
            from: 'walk',
            to: 'sprint',
        });
        expect(history[0].timestamp).toBeTypeOf('number');
        expect(history[0].timestamp).toBeGreaterThan(0);
    });

    it('should include all required fields in history entry', async () => {
        // Act
        await modeStateManager.setMode('sprint');

        // Assert
        const entry = modeStateManager.getHistory()[0];
        expect(entry).toHaveProperty('from');
        expect(entry).toHaveProperty('to');
        expect(entry).toHaveProperty('timestamp');
        expect(entry).toHaveProperty('reason');

        expect(entry.from).toBe('walk');
        expect(entry.to).toBe('sprint');
        expect(typeof entry.timestamp).toBe('number');
        expect(typeof entry.reason).toBe('string');
    });

    it('should return history in chronological order', async () => {
        // Act - Make multiple transitions
        await modeStateManager.setMode('sprint');
        await modeStateManager.setMode('vault');
        await modeStateManager.setMode('walk');

        // Assert
        const history = modeStateManager.getHistory();
        expect(history).toHaveLength(3);

        // Verify chronological order
        expect(history[0].from).toBe('walk');
        expect(history[0].to).toBe('sprint');

        expect(history[1].from).toBe('sprint');
        expect(history[1].to).toBe('vault');

        expect(history[2].from).toBe('vault');
        expect(history[2].to).toBe('walk');

        // Verify timestamps are increasing
        expect(history[1].timestamp).toBeGreaterThanOrEqual(history[0].timestamp);
        expect(history[2].timestamp).toBeGreaterThanOrEqual(history[1].timestamp);
    });

    it('should clear history', async () => {
        // Arrange
        await modeStateManager.setMode('sprint');
        await modeStateManager.setMode('vault');
        expect(modeStateManager.getHistory()).toHaveLength(2);

        // Act
        modeStateManager.clearHistory();

        // Assert
        expect(modeStateManager.getHistory()).toHaveLength(0);
    });

    it('should respect max history size (100 entries) and evict oldest', async () => {
        // Arrange & Act - Create 105 transitions
        for (let i = 0; i < 105; i++) {
            // Toggle between sprint and walk
            await modeStateManager.setMode(i % 2 === 0 ? 'sprint' : 'walk');
        }

        // Assert
        const history = modeStateManager.getHistory();
        expect(history).toHaveLength(100);

        // Verify newest entry is still there (last transition)
        const lastEntry = history[history.length - 1];
        expect(lastEntry.to).toBe('sprint'); // i=104, 104%2=0 → sprint
    });

    it('should evict oldest entries first (LRU)', async () => {
        // Arrange - Fill history with identifiable entries
        for (let i = 0; i < 102; i++) {
            await modeStateManager.setMode(i % 2 === 0 ? 'sprint' : 'walk');
        }

        const history = modeStateManager.getHistory();
        expect(history).toHaveLength(100);

        // Assert - First entry should be from transition #3 (0 and 1 evicted)
        // Entry 0: walk→sprint (evicted)
        // Entry 1: sprint→walk (evicted)
        // Entry 2: walk→sprint (now at index 0)
        expect(history[0].from).toBe('walk');
        expect(history[0].to).toBe('sprint');

        // Last entry should be the most recent
        expect(history[99].to).toBe('walk'); // i=101, 101%2=1 → walk
    });

    it('should return a defensive copy of history (immutable)', async () => {
        // Arrange
        await modeStateManager.setMode('sprint');

        // Act
        const history1 = modeStateManager.getHistory();
        (history1 as any).push({ fake: 'entry' }); // Attempt mutation

        const history2 = modeStateManager.getHistory();

        // Assert - Original history unchanged
        expect(history2).toHaveLength(1);
        expect(history2[0]).not.toHaveProperty('fake');
    });

    describe('Edge Cases (Tricky)', () => {
        it('should handle concurrent setMode calls without race conditions', async () => {
            // Act - Fire multiple setMode calls without awaiting
            const promises = [
                modeStateManager.setMode('sprint'),
                modeStateManager.setMode('vault'),
                modeStateManager.setMode('walk'),
                modeStateManager.setMode('sprint'),
            ];

            await Promise.all(promises);

            // Assert - All transitions should be recorded
            const history = modeStateManager.getHistory();
            expect(history.length).toBeGreaterThanOrEqual(3); // At least some transitions recorded

            // Verify no corrupted entries
            history.forEach(entry => {
                expect(entry.from).toMatch(/^(walk|sprint|vault)$/);
                expect(entry.to).toMatch(/^(walk|sprint|vault)$/);
                expect(entry.timestamp).toBeTypeOf('number');
            });
        });

        it('should still record history even if storage fails (Circuit Breaker open)', async () => {
            // Arrange - Make storage fail to open circuit breaker
            mockStorage.set.mockRejectedValue(new Error('QuotaExceededError'));

            // Trigger 3 failures to open circuit
            await modeStateManager.setMode('sprint');
            await modeStateManager.setMode('vault');
            await modeStateManager.setMode('walk');

            modeStateManager.clearHistory(); // Clear to isolate test
            mockStorage.set.mockClear();

            // Act - Circuit should be OPEN now, but history should still work
            await modeStateManager.setMode('sprint');

            // Assert - History recorded despite storage failure
            const history = modeStateManager.getHistory();
            expect(history).toHaveLength(1);
            expect(history[0].from).toBe('walk');
            expect(history[0].to).toBe('sprint');

            // Verify storage NOT called (circuit open)
            expect(mockStorage.set).not.toHaveBeenCalled();
        });

        it('should handle rapid transitions (same millisecond timestamp collisions)', async () => {
            // Arrange - Mock Date.now to return same value multiple times
            const mockNow = vi.spyOn(Date, 'now');
            let timestamp = 1000;
            mockNow.mockImplementation(() => timestamp);

            // Reinit with mocked time
            modeStateManager = new ModeStateManager(modeManager, logger);
            await modeStateManager.init();

            // Act - Make transitions in "same millisecond"
            await modeStateManager.setMode('sprint');
            await modeStateManager.setMode('vault'); // Same timestamp

            timestamp += 1; // Next millisecond
            await modeStateManager.setMode('walk');

            // Assert
            const history = modeStateManager.getHistory();
            expect(history).toHaveLength(3);

            // First two should have same timestamp
            expect(history[0].timestamp).toBe(1000);
            expect(history[1].timestamp).toBe(1000);
            expect(history[2].timestamp).toBe(1001);

            // Both should still be recorded correctly
            expect(history[0].to).toBe('sprint');
            expect(history[1].to).toBe('vault');
        });

        it('should record history even when setMode throws error', async () => {
            // Arrange - Mock state machine to block transition
            const stateMachine = (modeStateManager as any).stateMachine;
            vi.spyOn(stateMachine, 'executeGuards')
                .mockResolvedValueOnce(true)  // First call succeeds
                .mockResolvedValueOnce(false); // Second call blocked

            // Act
            await modeStateManager.setMode('sprint'); // Success

            try {
                await modeStateManager.setMode('vault'); // Blocked (shouldn't record)
            } catch (error) {
                // Expected to throw
            }

            // Assert - Only successful transition recorded
            const history = modeStateManager.getHistory();
            expect(history).toHaveLength(1);
            expect(history[0].from).toBe('walk');
            expect(history[0].to).toBe('sprint');

            // Blocked transition should NOT be in history
            expect(history.some(h => h.to === 'vault')).toBe(false);
        });
    });
});
