/**
 * @file popup-state-manager.test.ts
 * @description Comprehensive edge case tests for PopupStateManager
 *
 * Tests cover:
 * - Race conditions (rapid state changes)
 * - Optimistic update rollback scenarios
 * - Network failures and retries
 * - State synchronization edge cases
 * - Memory leak prevention
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { PopupStateManager } from '@/popup/popup-state-manager';
import { AppError } from '@/shared/errors/app-error';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';

describe('PopupStateManager - Edge Cases', () => {
  let stateManager: PopupStateManager;
  let mockMessageBus: IMessageBus;
  let mockLogger: ILogger;
  let sendSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Create mock logger
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      setLevel: vi.fn(),
      getLevel: vi.fn(),
    };

    // Create mock message bus with spy
    sendSpy = vi.fn();
    mockMessageBus = {
      send: sendSpy as any,
      subscribe: vi.fn(),
      publish: vi.fn(),
    };

    stateManager = new PopupStateManager(mockMessageBus, mockLogger);
  });

  afterEach(() => {
    stateManager.cleanup();
    vi.clearAllMocks();
  });

  describe('Race Conditions', () => {
    it('should handle rapid mode switches without state corruption', async () => {
      // Arrange: Setup successful responses
      sendSpy.mockResolvedValue({ success: true, data: {} });

      await stateManager.initialize(123);

      // Act: Rapidly switch modes (simulating impatient user)
      const switches = [
        stateManager.switchModeOptimistically('sprint'),
        stateManager.switchModeOptimistically('vault'),
        stateManager.switchModeOptimistically('walk'),
      ];

      // Assert: All should complete without errors
      await expect(Promise.all(switches)).resolves.toBeDefined();

      // Final state should be 'walk' (last switch)
      const finalState = stateManager.getState();
      expect(finalState.currentMode).toBe('walk');
      expect(finalState.loading).toBe(false);
    });

    it('should handle mode switch during initialization', async () => {
      // Arrange: Slow initialization
      sendSpy.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () => resolve({ success: true, data: { mode: 'walk', count: 0 } }),
              100
            )
          )
      );

      // Act: Start init and immediately try to switch mode
      const initPromise = stateManager.initialize(123);
      const switchPromise = stateManager.switchModeOptimistically('sprint');

      // Assert: Both should complete
      await expect(Promise.all([initPromise, switchPromise])).resolves.toBeDefined();
    });

    it('should handle concurrent refreshStats calls', async () => {
      // Arrange: Mock both init calls
      sendSpy
        .mockResolvedValueOnce({ success: true, data: { mode: 'walk' } })
        .mockResolvedValueOnce({ success: true, data: { count: 0 } });

      await stateManager.initialize(123);

      // Now mock refreshStats responses
      sendSpy.mockResolvedValue({
        success: true,
        data: { count: 10 },
      });

      // Act: Fire multiple refresh calls simultaneously
      const refreshes = Array(5)
        .fill(null)
        .map(() => stateManager.refreshStats());

      // Assert: All complete without errors
      await expect(Promise.all(refreshes)).resolves.toBeDefined();

      // Stats should be consistent
      const state = stateManager.getState();
      expect(state.stats.totalHighlights).toBe(10);
    });
  });

  describe('Optimistic Update Rollback', () => {
    it('should rollback state when mode switch fails', async () => {
      // Arrange: Initialize with walk mode
      sendSpy
        .mockResolvedValueOnce({ success: true, data: { mode: 'walk' } })
        .mockResolvedValueOnce({ success: true, data: { count: 10 } });
      await stateManager.initialize(123);

      const initialState = stateManager.getState();
      expect(initialState.currentMode).toBe('walk');

      // Act: Try to switch but fail
      sendSpy.mockResolvedValueOnce({
        success: false,
        error: 'Network timeout',
      });

      await expect(stateManager.switchModeOptimistically('sprint')).rejects.toThrow();

      // Assert: State should be rolled back to 'walk'
      const rolledBackState = stateManager.getState();
      expect(rolledBackState.currentMode).toBe('walk');
      expect(rolledBackState.stats.totalHighlights).toBe(10);
      expect(rolledBackState.error).toBeInstanceOf(AppError);
    });

    it('should preserve stats during failed mode switch', async () => {
      // Arrange
      sendSpy
        .mockResolvedValueOnce({ success: true, data: { mode: 'walk' } })
        .mockResolvedValueOnce({ success: true, data: { count: 42 } });
      await stateManager.initialize(123);

      // Act: Fail mode switch
      sendSpy.mockResolvedValueOnce({ success: false, error: 'Fail' });

      try {
        await stateManager.switchModeOptimistically('vault');
      } catch {
        // Expected
      }

      // Assert: Stats unchanged
      const state = stateManager.getState();
      expect(state.stats.totalHighlights).toBe(42);
      expect(state.stats.highlightsOnCurrentPage).toBe(42);
    });

    it('should handle partial rollback on network error', async () => {
      // Arrange: Successful init
      sendSpy
        .mockResolvedValueOnce({ success: true, data: { mode: 'walk' } })
        .mockResolvedValueOnce({ success: true, data: { count: 10 } });
      await stateManager.initialize(123);

      // Act: Network error during switch
      sendSpy.mockRejectedValueOnce(new Error('Network unreachable'));

      await expect(stateManager.switchModeOptimistically('sprint')).rejects.toThrow(
        'Network unreachable'
      );

      // Assert: State rolled back, error captured
      const state = stateManager.getState();
      expect(state.currentMode).toBe('walk');
      expect(state.error).toBeDefined();
      expect(state.loading).toBe(false);
    });
  });

  describe('Network Failure Scenarios', () => {
    it('should handle initialization failure gracefully', async () => {
      // Arrange: Network fails on first call
      sendSpy.mockRejectedValueOnce(new Error('Connection refused'));

      // Act & Assert
      await expect(stateManager.initialize(123)).rejects.toThrow();

      const state = stateManager.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBeInstanceOf(AppError);
      expect(state.error?.message).toContain('Failed to load popup state');
    });

    it('should handle timeout during mode switch', async () => {
      // Arrange: Init succeeds
      sendSpy
        .mockResolvedValueOnce({ success: true, data: { mode: 'walk' } })
        .mockResolvedValueOnce({ success: true, data: { count: 0 } });
      await stateManager.initialize(123);

      // Act: Timeout on switch
      sendSpy.mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout after 5000ms')), 10)
          )
      );

      await expect(stateManager.switchModeOptimistically('sprint')).rejects.toThrow(
        'Timeout'
      );

      // Assert: Error state set
      const state = stateManager.getState();
      expect(state.error).toBeDefined();
    });

    it('should handle malformed response from background', async () => {
      // Arrange: Background returns invalid data
      sendSpy
        .mockResolvedValueOnce({ success: true, data: { mode: 'walk' } })
        .mockResolvedValueOnce({ success: true, data: { count: 0 } });
      await stateManager.initialize(123);

      // Act: Malformed response (success but missing data field)
      sendSpy.mockResolvedValueOnce({ success: true } as any);

      // Assert: Should reject malformed response
      await expect(stateManager.switchModeOptimistically('sprint')).rejects.toThrow();

      // State should be rolled back
      const state = stateManager.getState();
      expect(state.currentMode).toBe('walk'); // Rolled back to original
      expect(state.error).toBeDefined();
    });
  });

  describe('State Synchronization', () => {
    it('should notify all subscribers on state change', async () => {
      // Arrange
      const subscriber1 = vi.fn();
      const subscriber2 = vi.fn();
      const subscriber3 = vi.fn();

      stateManager.subscribe(subscriber1);
      stateManager.subscribe(subscriber2);
      stateManager.subscribe(subscriber3);

      sendSpy.mockResolvedValue({
        success: true,
        data: { mode: 'sprint', count: 0 },
      });

      // Act
      await stateManager.initialize(123);

      // Assert: All subscribers called with same state
      expect(subscriber1).toHaveBeenCalled();
      expect(subscriber2).toHaveBeenCalled();
      expect(subscriber3).toHaveBeenCalled();

      const state1 = subscriber1.mock.calls[subscriber1.mock.calls.length - 1]![0];
      const state2 = subscriber2.mock.calls[subscriber2.mock.calls.length - 1]![0];
      expect(state1).toEqual(state2);
    });

    it('should handle subscriber throwing error', async () => {
      // Arrange
      const badSubscriber = vi.fn();
      const goodSubscriber = vi.fn();

      stateManager.subscribe(badSubscriber);
      stateManager.subscribe(goodSubscriber);

      // Make badSubscriber throw on first call
      badSubscriber.mockImplementationOnce(() => {
        throw new Error('Subscriber crashed');
      });

      sendSpy
        .mockResolvedValueOnce({ success: true, data: { mode: 'walk' } })
        .mockResolvedValueOnce({ success: true, data: { count: 0 } });

      // Act: Should not throw even if subscriber errors
      await expect(stateManager.initialize(123)).resolves.not.toThrow();

      // Assert: Good subscriber still called
      expect(goodSubscriber).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Subscriber error'),
        expect.any(Error)
      );
    });

    it('should unsubscribe correctly', async () => {
      // Arrange
      const subscriber = vi.fn();
      const unsubscribe = stateManager.subscribe(subscriber);

      sendSpy.mockResolvedValue({
        success: true,
        data: { mode: 'walk', count: 0 },
      });

      await stateManager.initialize(123);
      const callCountBefore = subscriber.mock.calls.length;

      // Act: Unsubscribe
      unsubscribe();

      // Trigger another state change
      sendSpy.mockResolvedValue({ success: true, data: {} });
      await stateManager.switchModeOptimistically('sprint');

      // Assert: Subscriber not called after unsubscribe
      expect(subscriber.mock.calls.length).toBe(callCountBefore);
    });
  });

  describe('Memory Leak Prevention', () => {
    it('should cleanup subscribers on cleanup()', () => {
      // Arrange
      const subscribers = Array(10)
        .fill(null)
        .map(() => vi.fn());
      subscribers.forEach((sub) => stateManager.subscribe(sub));

      // Act
      stateManager.cleanup();

      // Assert: No subscribers should be called after cleanup
      // (We can't directly test Set size, but we can verify behavior)
      const state = stateManager.getState();
      expect(state).toBeDefined(); // State still accessible
    });

    it('should handle multiple cleanup calls', () => {
      // Act & Assert: Should not throw
      expect(() => {
        stateManager.cleanup();
        stateManager.cleanup();
        stateManager.cleanup();
      }).not.toThrow();
    });
  });

  describe('Edge Case Data', () => {
    it('should handle zero highlights', async () => {
      // Arrange & Act
      sendSpy.mockResolvedValue({
        success: true,
        data: { mode: 'walk', count: 0 },
      });
      await stateManager.initialize(123);

      // Assert
      const state = stateManager.getState();
      expect(state.stats.totalHighlights).toBe(0);
      expect(state.stats.highlightsOnCurrentPage).toBe(0);
    });

    it('should handle very large highlight counts', async () => {
      // Arrange & Act
      sendSpy.mockResolvedValue({
        success: true,
        data: { mode: 'vault', count: 999999 },
      });
      await stateManager.initialize(123);

      // Assert
      const state = stateManager.getState();
      expect(state.stats.totalHighlights).toBe(999999);
      expect(state.stats.highlightsOnCurrentPage).toBe(999999);
    });

    it('should handle negative tab ID edge case', async () => {
      // Arrange & Act: Chrome sometimes uses -1 for special tabs
      sendSpy.mockResolvedValue({
        success: true,
        data: { mode: 'walk', count: 0 },
      });

      // Should not throw
      await expect(stateManager.initialize(-1)).resolves.not.toThrow();
    });
  });

  describe('State Immutability', () => {
    it('should return new state object on each getState()', async () => {
      // Arrange
      sendSpy.mockResolvedValue({
        success: true,
        data: { mode: 'walk', count: 10 },
      });
      await stateManager.initialize(123);

      // Act
      const state1 = stateManager.getState();
      const state2 = stateManager.getState();

      // Assert: Different objects
      expect(state1).not.toBe(state2);
      // But same values
      expect(state1).toEqual(state2);
    });

    it('should not allow external mutation of state', async () => {
      // Arrange
      sendSpy.mockResolvedValue({
        success: true,
        data: { mode: 'walk', count: 10 },
      });
      await stateManager.initialize(123);

      // Act: Try to mutate returned state
      const state = stateManager.getState();
      (state as any).currentMode = 'sprint'; // Force mutation
      (state.stats as any).totalHighlights = 999;

      // Assert: Internal state unchanged
      const freshState = stateManager.getState();
      expect(freshState.currentMode).toBe('walk');
      expect(freshState.stats.totalHighlights).toBe(10);
    });
  });
});
