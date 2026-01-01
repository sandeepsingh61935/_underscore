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
});
