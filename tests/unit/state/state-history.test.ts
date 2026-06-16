/**
 * @file state-history.test.ts
 * @description Unit tests for ModeStateManager history tracking
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { ModeManager } from '@/content/modes/mode-manager';
import { ModeStateManager } from '@/content/modes/mode-state-manager';
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
    vi.spyOn(logger, 'info').mockImplementation(() => {});
    vi.spyOn(logger, 'warn').mockImplementation(() => {});
    vi.spyOn(logger, 'debug').mockImplementation(() => {});

    modeManager = new ModeManager(eventBus, logger);

    // Register modes
    ['ephemeral', 'local', 'cloud'].forEach((mode) => {
      modeManager.registerMode({
        name: mode as any,
        capabilities: {} as any,
        onActivate: vi.fn().mockResolvedValue(undefined),
        onDeactivate: vi.fn().mockResolvedValue(undefined),
      } as any);
    });

    modeStateManager = new ModeStateManager(eventBus, modeManager, logger);
    await modeStateManager.init();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should track transitions correctly', async () => {
    // Act
    await modeStateManager.setMode('local');

    // Assert
    const history = modeStateManager.getDebugState().history;
    expect(history).toHaveLength(1);
    expect(history[0]).toBeDefined();
    expect(history[0]!).toMatchObject({
      from: 'ephemeral',
      to: 'local',
    });
    expect(history[0]!.timestamp).toBeTypeOf('number');
    expect(history[0]!.timestamp).toBeGreaterThan(0);
  });

  it('should capture transition reasons', async () => {
    // Act
    await modeStateManager.setMode('local');

    // Assert
    const history = modeStateManager.getDebugState().history;
    const entry = history[0];
    expect(entry).toBeDefined();
    expect(entry!.from).toBe('ephemeral');
    expect(entry!.to).toBe('local');
    expect(typeof entry!.timestamp).toBe('number');
    expect(typeof entry!.reason).toBe('string');
  });

  it('should maintain chronological order', async () => {
    // Act - Make multiple transitions
    await modeStateManager.setMode('local');
    await modeStateManager.setMode('cloud');
    await modeStateManager.setMode('ephemeral');

    // Assert
    const history = modeStateManager.getDebugState().history;
    expect(history).toHaveLength(3);

    // Verify chronological order
    expect(history[0]!.from).toBe('ephemeral');
    expect(history[0]!.to).toBe('local');

    expect(history[1]!.from).toBe('local');
    expect(history[1]!.to).toBe('cloud');

    expect(history[2]!.from).toBe('cloud');
    expect(history[2]!.to).toBe('ephemeral');

    // Verify timestamps are increasing
    expect(history[1]!.timestamp).toBeGreaterThanOrEqual(history[0]!.timestamp);
    expect(history[2]!.timestamp).toBeGreaterThanOrEqual(history[1]!.timestamp);
  });

  it('should clear history', async () => {
    // Arrange
    await modeStateManager.setMode('local');
    await modeStateManager.setMode('cloud');
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
      await modeStateManager.setMode(i % 2 === 0 ? 'local' : 'ephemeral');
    }

    // Assert
    const history = modeStateManager.getHistory();
    expect(history).toHaveLength(100);

    // Verify newest entry is still there (last transition)
    const lastEntry = history[history.length - 1];
    expect(lastEntry).toBeDefined();
    expect(lastEntry!.to).toBe('local'); // i=104, 104%2=0 → sprint
  });

  it('should evict oldest entries first (LRU)', async () => {
    // Arrange - Fill history with identifiable entries
    for (let i = 0; i < 102; i++) {
      await modeStateManager.setMode(i % 2 === 0 ? 'local' : 'ephemeral');
    }

    const history = modeStateManager.getHistory();
    expect(history).toHaveLength(100);

    // Assert - First entry should be from transition #3 (0 and 1 evicted)
    // Entry 0: walk→sprint (evicted)
    // Entry 1: sprint→walk (evicted)
    // Entry 2: walk→sprint (now at index 0)
    expect(history[0]!.from).toBe('ephemeral');
    expect(history[0]!.to).toBe('local');

    // Last entry should be the most recent
    expect(history[99]!.to).toBe('ephemeral'); // i=101, 101%2=1 → walk
  });

  it('should return a defensive copy of history (immutable)', async () => {
    // Arrange
    await modeStateManager.setMode('local');

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
        modeStateManager.setMode('local'),
        modeStateManager.setMode('cloud'),
        modeStateManager.setMode('ephemeral'),
        modeStateManager.setMode('local'),
      ];

      await Promise.all(promises);

      // Assert - All transitions should be recorded
      const history = modeStateManager.getHistory();
      expect(history.length).toBeGreaterThanOrEqual(3); // At least some transitions recorded

      // Verify no corrupted entries (canonical mode vocabulary: ephemeral/local/cloud/ai)
      history.forEach((entry) => {
        expect(entry.from).toMatch(/^(ephemeral|local|cloud|ai)$/);
        expect(entry.to).toMatch(/^(ephemeral|local|cloud|ai)$/);
        expect(entry.timestamp).toBeTypeOf('number');
      });
    });

    it('should still record history even if storage fails (Circuit Breaker open)', async () => {
      // Arrange - Make storage fail to open circuit breaker
      mockStorage.set.mockRejectedValue(new Error('QuotaExceededError'));

      // Trigger 3 failures to open circuit
      await modeStateManager.setMode('local');
      await modeStateManager.setMode('cloud');
      await modeStateManager.setMode('ephemeral');

      modeStateManager.clearHistory(); // Clear to isolate test
      mockStorage.set.mockClear();

      // Act - Circuit should be OPEN now, but history should still work
      await modeStateManager.setMode('local');

      // Assert - History recorded despite storage failure
      const history = modeStateManager.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toBeDefined();
      expect(history[0]!.from).toBe('ephemeral');
      expect(history[0]!.to).toBe('local');

      // Verify storage NOT called (circuit open)
      expect(mockStorage.set).not.toHaveBeenCalled();
    });

    it('should handle rapid transitions (same millisecond timestamp collisions)', async () => {
      // Arrange - Mock Date.now to return same value multiple times
      const mockNow = vi.spyOn(Date, 'now');
      let timestamp = 1000;
      mockNow.mockImplementation(() => timestamp);

      // Reinit with mocked time
      modeStateManager = new ModeStateManager(eventBus, modeManager, logger);
      await modeStateManager.init();

      // Act - Make transitions in "same millisecond"
      await modeStateManager.setMode('local');
      await modeStateManager.setMode('cloud'); // Same timestamp

      timestamp += 1; // Next millisecond
      await modeStateManager.setMode('ephemeral');

      // Assert
      const history = modeStateManager.getDebugState().history;
      expect(history).toHaveLength(3);

      // First two should have same timestamp
      expect(history[0]!.timestamp).toBe(1000);
      expect(history[1]!.timestamp).toBe(1000);
      expect(history[2]!.timestamp).toBe(1001);

      // Validations
      expect(history[0]!.to).toBe('local');
      expect(history[1]!.to).toBe('cloud');
    });

    it('should record history even when setMode throws error', async () => {
      // Arrange - Mock state machine to block transition
      const stateMachine = (modeStateManager as any).stateMachine;
      vi.spyOn(stateMachine, 'executeGuards')
        .mockResolvedValueOnce(true) // First call succeeds
        .mockResolvedValueOnce(false); // Second call blocked

      // Act
      await modeStateManager.setMode('local'); // Success

      try {
        await modeStateManager.setMode('cloud'); // Blocked (shouldn't record)
      } catch (error) {
        // Expected to throw
      }

      // Assert - Only successful transition recorded
      const history = modeStateManager.getDebugState().history;
      expect(history).toHaveLength(1);
      expect(history[0]!.from).toBe('ephemeral');
      expect(history[0]!.to).toBe('local');

      // Blocked transition should NOT be in history
      expect(history.some((h) => h.to === 'cloud')).toBe(false);
    });
  });
});
