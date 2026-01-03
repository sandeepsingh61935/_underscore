/**
 * @file state-metrics.test.ts
 * @description Unit tests for ModeStateManager metrics tracking
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { ModeManager } from '@/content/modes/mode-manager';
import { ModeStateManager } from '@/content/modes/mode-state-manager';
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
    ['walk', 'sprint', 'vault'].forEach((mode) => {
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
    // Current mode (vault) hasn't switched yet, so timeInMode isn't updated
    expect(metrics.timeInMode['vault']).toBeUndefined();
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

  describe('Edge Cases (Tricky)', () => {
    it('should handle concurrent transitions affecting counts correctly', async () => {
      // Act - Fire concurrent transitions
      const promises = [
        modeStateManager.setMode('sprint'),
        modeStateManager.setMode('vault'),
        modeStateManager.setMode('walk'),
      ];

      await Promise.all(promises);

      // Assert - All transitions counted (no lost updates)
      const metrics = modeStateManager.getMetrics();
      const totalTransitions = Object.values(metrics.transitionCounts).reduce(
        (sum, count) => sum + count,
        0
      );

      expect(totalTransitions).toBeGreaterThanOrEqual(2); // At least some succeeded

      // No negative or NaN counts
      Object.values(metrics.transitionCounts).forEach((count) => {
        expect(count).toBeGreaterThan(0);
        expect(Number.isNaN(count)).toBe(false);
      });
    });

    it('should accurately track time for rapid mode switches (< 1ms apart)', async () => {
      // Arrange - Mock time with sub-millisecond precision
      const mockNow = vi.spyOn(Date, 'now');
      let currentTime = 1000;
      mockNow.mockImplementation(() => currentTime);

      modeStateManager = new ModeStateManager(modeManager, logger);
      await modeStateManager.init();

      // Act - Rapid switches (0ms elapsed each)
      await modeStateManager.setMode('sprint'); // 0ms in walk
      await modeStateManager.setMode('vault'); // 0ms in sprint
      await modeStateManager.setMode('walk'); // 0ms in vault

      currentTime += 1000; // Now spend actual time

      // Assert
      const metrics = modeStateManager.getMetrics();

      // Previous modes should have 0ms
      expect(metrics.timeInMode['sprint'] || 0).toBeLessThanOrEqual(1);
      expect(metrics.timeInMode['vault'] || 0).toBeLessThanOrEqual(1);

      // Current mode time not updated yet for the *current* session
      // But 'walk' was visited at start, so it has ~0ms accumulated
      expect(metrics.timeInMode['walk']).toBeLessThanOrEqual(1);
    });

    it('should continue tracking metrics even after errors', async () => {
      // Arrange - Block one transition
      const stateMachine = (modeStateManager as any).stateMachine;
      vi.spyOn(stateMachine, 'executeGuards')
        .mockResolvedValueOnce(true) // First succeeds
        .mockResolvedValueOnce(false) // Second blocked
        .mockResolvedValueOnce(true); // Third succeeds

      // Act
      await modeStateManager.setMode('sprint'); // Success

      try {
        await modeStateManager.setMode('vault'); // Blocked
      } catch (error) {
        // Expected
      }

      await modeStateManager.setMode('walk'); // Success

      // Assert
      const metrics = modeStateManager.getMetrics();

      // Successful transitions counted
      expect(metrics.transitionCounts['walk→sprint']).toBe(1);
      expect(metrics.transitionCounts['sprint→walk']).toBe(1);

      // Failed transition counted separately
      expect(metrics.failureCounts['sprint→vault']).toBe(1);

      // Successful NOT in failures
      expect(metrics.failureCounts['walk→sprint']).toBeUndefined();
    });

    it('should accumulate counts without integer overflow (stress test)', async () => {
      // Arrange - Mock to allow rapid transitions
      const mockNow = vi.spyOn(Date, 'now');
      mockNow.mockReturnValue(1000); // Freeze time

      modeStateManager = new ModeStateManager(modeManager, logger);
      await modeStateManager.init();

      // Act - Make many transitions (test accumulation)
      for (let i = 0; i < 1000; i++) {
        await modeStateManager.setMode('sprint');
        await modeStateManager.setMode('walk');
      }

      // Assert
      const metrics = modeStateManager.getMetrics();

      expect(metrics.transitionCounts['walk→sprint']).toBe(1000);
      expect(metrics.transitionCounts['sprint→walk']).toBe(1000);

      // No overflow or corruption
      expect(Number.isSafeInteger(metrics.transitionCounts['walk→sprint'])).toBe(true);
      expect(metrics.transitionCounts['walk→sprint']).toBeGreaterThan(0);
    });

    it('should handle metrics when storage fails (Circuit Breaker interaction)', async () => {
      // Arrange - Make storage fail
      mockStorage.set.mockRejectedValue(new Error('QuotaExceededError'));

      // Act - Trigger circuit breaker to open
      await modeStateManager.setMode('sprint');
      await modeStateManager.setMode('vault');
      await modeStateManager.setMode('walk');

      // Assert - Metrics still tracked despite storage failures
      const metrics = modeStateManager.getMetrics();

      expect(metrics.transitionCounts['walk→sprint']).toBe(1);
      expect(metrics.transitionCounts['sprint→vault']).toBe(1);
      expect(metrics.transitionCounts['vault→walk']).toBe(1);

      // Time tracking should also work
      expect(metrics.timeInMode).toBeDefined();
    });
  });
});
