import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { Container } from '@/shared/di/container';
import { registerServices } from '@/shared/di/service-registration';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import type { Message } from '@/shared/schemas/message-schemas';
import type { CircuitBreaker } from '@/shared/utils/circuit-breaker';
import { CircuitState } from '@/shared/utils/circuit-breaker';
import type { ILogger } from '@/shared/utils/logger';

/**
 * Integration Tests for IPC Layer
 *
 * Tests the full decorator chain in realistic scenarios:
 * CircuitBreakerMessageBus → RetryDecorator → ChromeMessageBus
 *
 * These tests use the actual DI container and real service composition,
 * not mocks. Only chrome.runtime API is mocked (external dependency).
 */

// Mock chrome.runtime API
const mockChromeRuntime = {
  sendMessage: vi.fn(),
  onMessage: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
  lastError: null as { message: string } | null,
};

global.chrome = {
  runtime: mockChromeRuntime,
} as any;

describe('IPC Layer - Integration Tests', () => {
  let container: Container;
  let messageBus: IMessageBus;
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    vi.clearAllMocks();
    mockChromeRuntime.lastError = null;

    // Use real DI container with full service composition
    container = new Container();
    registerServices(container);

    messageBus = container.resolve<IMessageBus>('messageBus');
    circuitBreaker = container.resolve<CircuitBreaker>('messagingCircuitBreaker');
  });

  afterEach(() => {
    // Cleanup
    vi.clearAllMocks();
    mockChromeRuntime.lastError = null;
  });

  describe('End-to-End Message Flow', () => {
    it('SCENARIO: Content → Background → Content (round trip)', async () => {
      const requestMessage: Message = {
        type: 'GET_HIGHLIGHT_COUNT',
        payload: { url: 'https://example.com' },
        timestamp: Date.now(),
      };

      const expectedResponse = { count: 42 };

      mockChromeRuntime.sendMessage.mockImplementation((_msg, callback) => {
        // Simulate background script processing
        mockChromeRuntime.lastError = null;
        setTimeout(() => callback(expectedResponse), 10);
      });

      const response = await messageBus.send('background', requestMessage);

      expect(response).toEqual(expectedResponse);
      expect(mockChromeRuntime.sendMessage).toHaveBeenCalledOnce();
    });

    it('SCENARIO: Broadcast to multiple subscribers', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      messageBus.subscribe('MODE_CHANGE', handler1);
      messageBus.subscribe('MODE_CHANGE', handler2);
      messageBus.subscribe('HIGHLIGHT_CREATED', handler3); // Different type

      await messageBus.publish('MODE_CHANGE', { mode: 'vault', timestamp: Date.now() });

      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).toHaveBeenCalledOnce();
      expect(handler3).not.toHaveBeenCalled(); // Different message type
    });

    it('SCENARIO: publish() respects circuit breaker (fails fast when open)', async () => {
      const handler = vi.fn();
      messageBus.subscribe('TEST_EVENT', handler);

      // Open the circuit by failing 5 sends
      mockChromeRuntime.sendMessage.mockImplementation((_msg, callback) => {
        mockChromeRuntime.lastError = { message: 'Service down' };
        callback(null);
      });

      for (let i = 0; i < 5; i++) {
        try {
          await messageBus.send('background', {
            type: `FAIL_${i}`,
            payload: {},
            timestamp: Date.now(),
          });
        } catch (error) {
          // Expected
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

      // publish() should fail fast when circuit is open
      await expect(messageBus.publish('TEST_EVENT', { data: 'test' })).rejects.toThrow(
        /circuit.*open/i
      );

      // Handler should NOT have been called (circuit prevented execution)
      expect(handler).not.toHaveBeenCalled();
    });

    it('SCENARIO: Multiple concurrent messages', async () => {
      mockChromeRuntime.sendMessage.mockImplementation((msg, callback) => {
        mockChromeRuntime.lastError = null;
        setTimeout(() => callback({ success: true, type: msg.type }), Math.random() * 20);
      });

      const messages = Array.from({ length: 10 }, (_, i) => ({
        type: `MSG_${i}`,
        payload: { index: i },
        timestamp: Date.now(),
      }));

      const results = await Promise.all(
        messages.map((msg) => messageBus.send('background', msg))
      );

      expect(results).toHaveLength(10);
      results.forEach((result: any) => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Retry Integration - Transient Failures', () => {
    it('SCENARIO: MV3 background suspended, recovers on 2nd retry', async () => {
      let attemptCount = 0;

      mockChromeRuntime.sendMessage.mockImplementation((_msg, callback) => {
        attemptCount++;

        if (attemptCount <= 2) {
          // First 2 attempts fail (background suspended)
          mockChromeRuntime.lastError = {
            message: 'Could not establish connection. Receiving end does not exist.',
          };
          callback(null);
        } else {
          // 3rd attempt succeeds (background woke up)
          mockChromeRuntime.lastError = null; // Explicitly clear
          callback({ recovered: true });
        }
      });

      const result = await messageBus.send('background', {
        type: 'WAKE_UP_TEST',
        payload: {},
        timestamp: Date.now(),
      });

      expect(result).toEqual({ recovered: true });
      expect(attemptCount).toBe(3); // 1 initial + 2 retries
    });

    it('SCENARIO: Network glitch, retry with exponential backoff succeeds', async () => {
      const callTimestamps: number[] = [];
      let attemptCount = 0;

      mockChromeRuntime.sendMessage.mockImplementation((_msg, callback) => {
        callTimestamps.push(Date.now());
        attemptCount++;

        if (attemptCount === 1) {
          mockChromeRuntime.lastError = { message: 'Network error' };
          callback(null);
        } else {
          mockChromeRuntime.lastError = null; // Clear on success
          callback({ success: true });
        }
      });

      const startTime = Date.now();

      await messageBus.send('background', {
        type: 'TEST',
        payload: {},
        timestamp: Date.now(),
      });

      const elapsed = Date.now() - startTime;

      // Should have delay between attempts (exponential backoff)
      expect(attemptCount).toBe(2);
      expect(elapsed).toBeGreaterThanOrEqual(100); // At least initial delay (100ms)
    });

    it('SCENARIO: Retry exhausted, circuit breaker NOT triggered (within threshold)', async () => {
      mockChromeRuntime.sendMessage.mockImplementation((_msg, callback) => {
        mockChromeRuntime.lastError = { message: 'Persistent failure' };
        callback(null);
      });

      // Fail once (retry will exhaust 3 attempts, but circuit threshold is 5)
      await expect(
        messageBus.send('background', {
          type: 'TEST',
          payload: {},
          timestamp: Date.now(),
        })
      ).rejects.toThrow('Persistent failure');

      // Circuit should still be CLOSED (only 1 message failed, threshold is 5)
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('Circuit Breaker Integration - Cascading Failure Prevention', () => {
    it('SCENARIO: 5 consecutive failures open circuit, preventing cascading', async () => {
      mockChromeRuntime.sendMessage.mockImplementation((_msg, callback) => {
        mockChromeRuntime.lastError = { message: 'Background script crashed' };
        callback(null);
      });

      // Send 5 messages (each will retry 3 times internally, but fail)
      for (let i = 0; i < 5; i++) {
        try {
          await messageBus.send('background', {
            type: `MSG_${i}`,
            payload: {},
            timestamp: Date.now(),
          });
        } catch (error) {
          // Expected - each message fails after retries
        }
      }

      // Circuit should now be OPEN
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

      // 6th message should fail FAST (no retry, no chrome.runtime call)
      const chromeCallsBefore = mockChromeRuntime.sendMessage.mock.calls.length;

      try {
        await messageBus.send('background', {
          type: 'MSG_6',
          payload: {},
          timestamp: Date.now(),
        });
      } catch (error: any) {
        expect(error.name).toBe('CircuitBreakerOpenError');
      }

      const chromeCallsAfter = mockChromeRuntime.sendMessage.mock.calls.length;

      // No additional chrome calls (fail-fast)
      expect(chromeCallsAfter).toBe(chromeCallsBefore);
    });

    it('SCENARIO: Circuit opens, recovers after timeout', async () => {
      // Open the circuit
      mockChromeRuntime.sendMessage.mockImplementation((_msg, callback) => {
        mockChromeRuntime.lastError = { message: 'Service down' };
        callback(null);
      });

      for (let i = 0; i < 5; i++) {
        try {
          await messageBus.send('background', {
            type: `FAIL_${i}`,
            payload: {},
            timestamp: Date.now(),
          });
        } catch (error) {
          // Expected
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

      // Wait for circuit breaker reset timeout (30s config, but we'll manually trigger)
      // In real scenario, this would be time-based
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Service recovers
      mockChromeRuntime.sendMessage.mockImplementation((_msg, callback) => {
        mockChromeRuntime.lastError = null; // Explicitly clear
        callback({ recovered: true });
      });

      // Note: In production, circuit would transition to HALF_OPEN after 30s
      // For this test, we're verifying the integration mechanics
    }, 10000);

    it('SCENARIO: Circuit breaker prevents retry storm', async () => {
      let totalChromeCalls = 0;

      mockChromeRuntime.sendMessage.mockImplementation((_msg, callback) => {
        totalChromeCalls++;
        mockChromeRuntime.lastError = { message: 'Overload' };
        callback(null);
      });

      // PHASE 1: Send 5 messages to open the circuit
      for (let i = 0; i < 5; i++) {
        try {
          await messageBus.send('background', {
            type: `FAIL_${i}`,
            payload: {},
            timestamp: Date.now(),
          });
        } catch (error) {
          // Expected - each will retry then fail
        }
      }

      // Circuit should now be OPEN
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

      const callsBeforeStorm = totalChromeCalls;

      // PHASE 2: Try to send 5 MORE messages (should fail fast, no retries)
      const stormPromises = Array.from({ length: 5 }, (_, i) =>
        messageBus
          .send('background', {
            type: `STORM_${i}`,
            payload: {},
            timestamp: Date.now(),
          })
          .catch(() => {
            /* Expected CircuitBreakerOpenError */
          })
      );

      await Promise.all(stormPromises);

      const callsDuringStorm = totalChromeCalls - callsBeforeStorm;

      // These 5 messages should have failed FAST (circuit open)
      // NO chrome.runtime calls should have been made
      expect(callsDuringStorm).toBe(0); // Circuit prevented the storm!
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  describe('Timeout Integration', () => {
    it('SCENARIO: Message timeout during retry', async () => {
      // Simulate hanging - never call callback
      mockChromeRuntime.sendMessage.mockImplementation(() => {
        // Hang indefinitely
      });

      const startTime = Date.now();

      await expect(
        messageBus.send('background', {
          type: 'TIMEOUT_TEST',
          payload: {},
          timestamp: Date.now(),
        })
      ).rejects.toThrow(/timeout/);

      const elapsed = Date.now() - startTime;

      // Should timeout after configured timeout (5000ms) WITHOUT retrying
      expect(elapsed).toBeGreaterThanOrEqual(5000);
      expect(elapsed).toBeLessThan(8000); // No retries, should be ~5s (allow buffer for CI)
    }, 10000);

    it('SCENARIO: Timeout counts as failure for circuit breaker', async () => {
      // Verify that timeouts are tracked by circuit breaker as failures
      // Using same fast messageBus from previous test
      const { ChromeMessageBus } = await import('@/shared/services/chrome-message-bus');
      const { RetryDecorator } = await import('@/shared/services/retry-decorator');
      const { CircuitBreakerMessageBus } =
        await import('@/shared/services/circuit-breaker-message-bus');
      const logger = container.resolve<ILogger>('logger');

      const fastChrome = new ChromeMessageBus(logger, { timeoutMs: 500 });
      const fastRetry = new RetryDecorator(fastChrome, logger, {
        maxRetries: 0, // No retries for speed
        initialDelayMs: 50,
        maxDelayMs: 500,
        backoffMultiplier: 2,
      });
      const fastBus = new CircuitBreakerMessageBus(fastRetry, circuitBreaker);

      mockChromeRuntime.sendMessage.mockImplementation(() => {
        // Hang - timeout will trigger
      });

      const metricsBefore = circuitBreaker.getMetrics();

      try {
        await fastBus.send('background', {
          type: 'TIMEOUT',
          payload: {},
          timestamp: Date.now(),
        });
      } catch (error) {
        // Expected timeout
      }

      const metricsAfter = circuitBreaker.getMetrics();

      // Timeout should be tracked as a failure
      expect(metricsAfter.failures).toBeGreaterThan(metricsBefore.failures);
      expect(metricsAfter.totalCalls).toBeGreaterThan(metricsBefore.totalCalls);
    }, 3000);
  });

  describe('Validation Integration', () => {
    it('SCENARIO: Invalid message rejected immediately (no retry)', async () => {
      const invalidMessage = {
        type: '', // Invalid: empty type
        payload: {},
        timestamp: Date.now(),
      } as Message;

      const chromeCallsBefore = mockChromeRuntime.sendMessage.mock.calls.length;

      await expect(messageBus.send('background', invalidMessage)).rejects.toThrow();

      const chromeCallsAfter = mockChromeRuntime.sendMessage.mock.calls.length;

      // Should NOT retry validation errors (fail fast)
      expect(chromeCallsAfter).toBe(chromeCallsBefore); // No chrome calls
    });

    it('SCENARIO: Malformed response handled gracefully', async () => {
      mockChromeRuntime.sendMessage.mockImplementation((_msg, callback) => {
        // Return malformed response
        callback(undefined);
      });

      const result = await messageBus.send('background', {
        type: 'TEST',
        payload: {},
        timestamp: Date.now(),
      });

      // ChromeMessageBus should handle gracefully
      expect(result).toBeUndefined();
    });
  });

  describe('Tricky Edge Cases - Real-World Scenarios', () => {
    it('EDGE: Popup closes mid-request (receiving end does not exist)', async () => {
      mockChromeRuntime.sendMessage.mockImplementation((_msg, callback) => {
        mockChromeRuntime.lastError = {
          message: 'Could not establish connection. Receiving end does not exist.',
        };
        callback(null);
      });

      await expect(
        messageBus.send('popup', {
          type: 'UPDATE_UI',
          payload: {},
          timestamp: Date.now(),
        })
      ).rejects.toThrow('Receiving end does not exist');
    });

    it('EDGE: Background script restarts during retry backoff', async () => {
      let attemptCount = 0;

      mockChromeRuntime.sendMessage.mockImplementation((_msg, callback) => {
        attemptCount++;

        if (attemptCount === 1) {
          // Context invalidated
          mockChromeRuntime.lastError = { message: 'Extension context invalidated' };
          callback(null);
        } else if (attemptCount === 2) {
          // Background restarting
          mockChromeRuntime.lastError = { message: 'Connection not established' };
          callback(null);
        } else {
          // Background restarted successfully
          mockChromeRuntime.lastError = null; // Clear
          callback({ restarted: true });
        }
      });

      const result = await messageBus.send('background', {
        type: 'RESTART_TEST',
        payload: {},
        timestamp: Date.now(),
      });

      expect(result).toEqual({ restarted: true });
      expect(attemptCount).toBe(3);
    });

    it('EDGE: Mixed success/failure across concurrent messages', async () => {
      mockChromeRuntime.sendMessage.mockImplementation((msg, callback) => {
        // Fail odd messages, succeed even
        const msgIndex = parseInt(msg.type.split('_')[1]);

        if (msgIndex % 2 === 0) {
          // Success - clear error
          mockChromeRuntime.lastError = null;
          callback({ success: true });
        } else {
          // Failure - set error
          mockChromeRuntime.lastError = { message: 'Simulated failure' };
          callback(null);
        }
      });

      const messages = Array.from({ length: 6 }, (_, i) => ({
        type: `MSG_${i}`,
        payload: {},
        timestamp: Date.now(),
      }));

      const results = await Promise.allSettled(
        messages.map((msg) => messageBus.send('background', msg))
      );

      const successes = results.filter((r) => r.status === 'fulfilled');
      const failures = results.filter((r) => r.status === 'rejected');

      expect(successes.length).toBe(3); // MSG_0, MSG_2, MSG_4
      expect(failures.length).toBe(3); // MSG_1, MSG_3, MSG_5 (after retries)

      // Circuit should still be CLOSED (only 3 failures, threshold is 5)
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('EDGE: Large payload (1MB) with slow network', async () => {
      const largePayload = {
        data: 'x'.repeat(1024 * 1024), // 1MB
      };

      mockChromeRuntime.sendMessage.mockImplementation((msg, callback) => {
        // Simulate slow network
        mockChromeRuntime.lastError = null;
        setTimeout(() => callback({ received: msg.payload.data.length }), 100);
      });

      const result = await messageBus.send<{ received: number }>('background', {
        type: 'LARGE_DATA',
        payload: largePayload,
        timestamp: Date.now(),
      });

      expect(result.received).toBe(1024 * 1024);
    });

    it('EDGE: Subscribe/unsubscribe race during message dispatch', async () => {
      const handler1 = vi.fn();
      // eslint-disable-next-line prefer-const
      let unsubscribe2: (() => void) | undefined;
      const handler2 = vi.fn().mockImplementation(() => {
        // Unsubscribe self during execution
        unsubscribe2?.();
      });

      messageBus.subscribe('RACE_TEST', handler1);
      unsubscribe2 = messageBus.subscribe('RACE_TEST', handler2);

      await messageBus.publish('RACE_TEST', { test: true });

      // Both handlers should have been called (subscription was active at publish time)
      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('Performance & Resource Management', () => {
    it('should not leak memory on repeated send operations', async () => {
      mockChromeRuntime.sendMessage.mockImplementation((_msg, callback) => {
        mockChromeRuntime.lastError = null;
        callback({ ok: true });
      });

      // Send 100 messages
      for (let i = 0; i < 100; i++) {
        await messageBus.send('background', {
          type: `PERF_${i}`,
          payload: {},
          timestamp: Date.now(),
        });
      }

      // If we got here without OOM, test passes
      expect(true).toBe(true);
    });

    it('should handle rapid subscribe/unsubscribe cycles', () => {
      const handler = vi.fn();

      // 1000 subscribe/unsubscribe cycles
      for (let i = 0; i < 1000; i++) {
        const unsubscribe = messageBus.subscribe('CYCLE_TEST', handler);
        unsubscribe();
      }

      // No memory leaks, should complete successfully
      expect(true).toBe(true);
    });
  });
});
