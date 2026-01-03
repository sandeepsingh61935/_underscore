import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import type { Message } from '@/shared/schemas/message-schemas';
import { CircuitBreakerMessageBus } from '@/shared/services/circuit-breaker-message-bus';
import {
  CircuitBreaker,
  CircuitState,
  CircuitBreakerOpenError,
} from '@/shared/utils/circuit-breaker';

// Mock inner MessageBus
class MockMessageBus implements IMessageBus {
  sendMock = vi.fn();
  subscribeMock = vi.fn();
  publishMock = vi.fn();

  async send<T>(target: string, message: Message): Promise<T> {
    return await this.sendMock(target, message);
  }

  subscribe(messageType: string, handler: Function): () => void {
    return this.subscribeMock(messageType, handler);
  }

  async publish(messageType: string, payload: unknown): Promise<void> {
    await this.publishMock(messageType, payload);
  }
}

// Mock logger
const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  setLevel: vi.fn(),
  getLevel: vi.fn(),
} as any;

describe('CircuitBreakerMessageBus', () => {
  let innerBus: MockMessageBus;
  let circuitBreaker: CircuitBreaker;
  let messageBus: CircuitBreakerMessageBus;

  beforeEach(() => {
    vi.clearAllMocks();
    innerBus = new MockMessageBus();
    circuitBreaker = new CircuitBreaker(
      {
        failureThreshold: 3,
        resetTimeout: 1000,
        successThreshold: 2,
        name: 'test-message-bus',
      },
      mockLogger
    );
    messageBus = new CircuitBreakerMessageBus(innerBus, circuitBreaker);
  });

  describe('Circuit CLOSED - Normal Operation', () => {
    it('should pass send() through to inner bus when circuit is CLOSED', async () => {
      const expectedResponse = { data: 'success' };
      innerBus.sendMock.mockResolvedValue(expectedResponse);

      const result = await messageBus.send('background', {
        type: 'TEST',
        payload: {},
        timestamp: Date.now(),
      });

      expect(result).toEqual(expectedResponse);
      expect(innerBus.sendMock).toHaveBeenCalledOnce();
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should pass publish() through when circuit is CLOSED', async () => {
      innerBus.publishMock.mockResolvedValue(undefined);

      await messageBus.publish('BROADCAST', { message: 'hello' });

      expect(innerBus.publishMock).toHaveBeenCalledWith('BROADCAST', {
        message: 'hello',
      });
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should track successful operations', async () => {
      innerBus.sendMock.mockResolvedValue({ ok: true });

      await messageBus.send('background', {
        type: 'TEST',
        payload: {},
        timestamp: Date.now(),
      });

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.totalCalls).toBe(1);
      expect(metrics.failures).toBe(0);
    });
  });

  describe('Circuit Opening After Failures', () => {
    it('should open circuit after failure threshold reached', async () => {
      innerBus.sendMock.mockRejectedValue(new Error('Connection failed'));

      // Fail 3 times (threshold)
      for (let i = 0; i < 3; i++) {
        try {
          await messageBus.send('background', {
            type: 'TEST',
            payload: {},
            timestamp: Date.now(),
          });
        } catch (error) {
          // Expected
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Circuit breaker opened'),
        expect.any(Object)
      );
    });

    it('should track failures from publish() operations', async () => {
      innerBus.publishMock.mockRejectedValue(new Error('Publish failed'));

      // Fail 3 times
      for (let i = 0; i < 3; i++) {
        try {
          await messageBus.publish('BROADCAST', {});
        } catch (error) {
          // Expected
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should reset failure count on successful send after partial failures', async () => {
      innerBus.sendMock
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce({ success: true }); // Success resets count

      // 2 failures
      for (let i = 0; i < 2; i++) {
        try {
          await messageBus.send('background', {
            type: 'TEST',
            payload: {},
            timestamp: Date.now(),
          });
        } catch (error) {
          // Expected
        }
      }

      // 1 success (resets failure count)
      await messageBus.send('background', {
        type: 'TEST',
        payload: {},
        timestamp: Date.now(),
      });

      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
      expect(circuitBreaker.getMetrics().failures).toBe(0);
    });
  });

  describe('Circuit OPEN - Fail Fast', () => {
    beforeEach(async () => {
      // Open the circuit
      innerBus.sendMock.mockRejectedValue(new Error('Connection failed'));
      for (let i = 0; i < 3; i++) {
        try {
          await messageBus.send('background', {
            type: 'TEST',
            payload: {},
            timestamp: Date.now(),
          });
        } catch (error) {
          // Expected
        }
      }
    });

    it('should fail fast without calling inner bus when circuit is OPEN', async () => {
      innerBus.sendMock.mockClear();

      await expect(
        messageBus.send('background', {
          type: 'TEST',
          payload: {},
          timestamp: Date.now(),
        })
      ).rejects.toThrow(CircuitBreakerOpenError);

      expect(innerBus.sendMock).not.toHaveBeenCalled(); // Fail fast!
    });

    it('should fail fast on publish when circuit is OPEN', async () => {
      innerBus.publishMock.mockClear();

      await expect(messageBus.publish('BROADCAST', {})).rejects.toThrow(
        CircuitBreakerOpenError
      );

      expect(innerBus.publishMock).not.toHaveBeenCalled();
    });

    it('should track rejected calls when circuit is OPEN', async () => {
      const metricsBefore = circuitBreaker.getMetrics();

      try {
        await messageBus.send('background', {
          type: 'TEST',
          payload: {},
          timestamp: Date.now(),
        });
      } catch (error) {
        // Expected
      }

      const metricsAfter = circuitBreaker.getMetrics();
      expect(metricsAfter.rejectedCalls).toBe(metricsBefore.rejectedCalls + 1);
    });
  });

  describe('Circuit HALF_OPEN - Testing Recovery', () => {
    beforeEach(async () => {
      // Open the circuit
      innerBus.sendMock.mockRejectedValue(new Error('Connection failed'));
      for (let i = 0; i < 3; i++) {
        try {
          await messageBus.send('background', {
            type: 'TEST',
            payload: {},
            timestamp: Date.now(),
          });
        } catch (error) {
          // Expected
        }
      }

      // Wait for reset timeout (1000ms)
      await new Promise((resolve) => setTimeout(resolve, 1100));
    });

    it('should transition to HALF_OPEN after reset timeout', async () => {
      innerBus.sendMock.mockResolvedValue({ success: true });

      // First call after timeout transitions to HALF_OPEN
      await messageBus.send('background', {
        type: 'TEST',
        payload: {},
        timestamp: Date.now(),
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Circuit breaker HALF_OPEN - testing recovery',
        expect.any(Object)
      );
    });

    it('should close circuit after success threshold in HALF_OPEN', async () => {
      innerBus.sendMock.mockResolvedValue({ success: true });

      // Need 2 successes (successThreshold) to close
      await messageBus.send('background', {
        type: 'TEST',
        payload: {},
        timestamp: Date.now(),
      });

      await messageBus.send('background', {
        type: 'TEST',
        payload: {},
        timestamp: Date.now(),
      });

      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Circuit breaker closed - service recovered',
        expect.any(Object)
      );
    });

    it('should re-open circuit on failure in HALF_OPEN', async () => {
      innerBus.sendMock
        .mockResolvedValueOnce({ success: true }) // First call succeeds (HALF_OPEN)
        .mockRejectedValueOnce(new Error('Failed again')); // Second call fails

      // First success (transitions to HALF_OPEN)
      await messageBus.send('background', {
        type: 'TEST',
        payload: {},
        timestamp: Date.now(),
      });

      // Second call fails, re-opens circuit
      try {
        await messageBus.send('background', {
          type: 'TEST',
          payload: {},
          timestamp: Date.now(),
        });
      } catch (error) {
        // Expected
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });
  }, 5000); // Extended timeout for timing tests

  describe('subscribe() - No Circuit Breaker', () => {
    it('should delegate subscribe directly without circuit breaker', () => {
      const handler = vi.fn();
      const cleanup = vi.fn();
      innerBus.subscribeMock.mockReturnValue(cleanup);

      const result = messageBus.subscribe('TEST', handler);

      expect(innerBus.subscribeMock).toHaveBeenCalledWith('TEST', handler);
      expect(result).toBe(cleanup);
    });

    it('should allow subscribe even when circuit is OPEN', async () => {
      // Open the circuit
      innerBus.sendMock.mockRejectedValue(new Error('Connection failed'));
      for (let i = 0; i < 3; i++) {
        try {
          await messageBus.send('background', {
            type: 'TEST',
            payload: {},
            timestamp: Date.now(),
          });
        } catch (error) {
          // Expected
        }
      }

      // subscribe should still work
      const handler = vi.fn();
      const mockCleanup = vi.fn();
      innerBus.subscribeMock.mockReturnValue(mockCleanup);

      const cleanup = messageBus.subscribe('TEST', handler);

      expect(cleanup).toBeDefined();
      expect(cleanup).toBe(mockCleanup);
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN); // Circuit still OPEN
    });
  });

  describe('Integration - Real-World Scenarios', () => {
    it('SCENARIO: Transient network failure recovers after circuit cooldown', async () => {
      // Fail 3 times (open circuit)
      innerBus.sendMock.mockRejectedValue(new Error('Network error'));

      for (let i = 0; i < 3; i++) {
        try {
          await messageBus.send('background', {
            type: 'TEST',
            payload: {},
            timestamp: Date.now(),
          });
        } catch (error) {
          // Expected
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

      // Wait for reset
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Network recovers
      innerBus.sendMock.mockResolvedValue({ recovered: true });

      // Test requests (HALF_OPEN)
      await messageBus.send('background', {
        type: 'TEST',
        payload: {},
        timestamp: Date.now(),
      });
      await messageBus.send('background', {
        type: 'TEST',
        payload: {},
        timestamp: Date.now(),
      });

      // Circuit should be CLOSED now
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    }, 5000);

    it('SCENARIO: Mixed send/publish failures count together', async () => {
      innerBus.sendMock.mockRejectedValue(new Error('Send failed'));
      innerBus.publishMock.mockRejectedValue(new Error('Publish failed'));

      // 2 send failures
      for (let i = 0; i < 2; i++) {
        try {
          await messageBus.send('background', {
            type: 'TEST',
            payload: {},
            timestamp: Date.now(),
          });
        } catch (error) {
          // Expected
        }
      }

      // 1 publish failure (3rd failure total, should open)
      try {
        await messageBus.publish('BROADCAST', {});
      } catch (error) {
        // Expected
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });

    it('SCENARIO: Circuit protects against cascading failures in retry chain', async () => {
      // Simulate retry decorator underneath (not actually implemented here, but conceptual)
      let attemptCount = 0;
      innerBus.sendMock.mockImplementation(async () => {
        attemptCount++;
        throw new Error('Persistent failure');
      });

      // Circuit should open after 3 failures
      for (let i = 0; i < 3; i++) {
        try {
          await messageBus.send('background', {
            type: 'TEST',
            payload: {},
            timestamp: Date.now(),
          });
        } catch (error) {
          // Expected
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

      // Next call should fail fast (no inner call)
      attemptCount = 0;
      try {
        await messageBus.send('background', {
          type: 'TEST',
          payload: {},
          timestamp: Date.now(),
        });
      } catch (error) {
        // Expected CircuitBreakerOpenError
      }

      expect(attemptCount).toBe(0); // Inner bus NOT called
    });
  });

  describe('Metrics', () => {
    it('should expose circuit breaker metrics', async () => {
      innerBus.sendMock.mockResolvedValue({ ok: true });

      await messageBus.send('background', {
        type: 'TEST',
        payload: {},
        timestamp: Date.now(),
      });

      const metrics = circuitBreaker.getMetrics();

      expect(metrics.state).toBe(CircuitState.CLOSED);
      expect(metrics.totalCalls).toBe(1);
      expect(metrics.failures).toBe(0);
      expect(metrics.successes).toBe(0); // Only tracked in HALF_OPEN
    });
  });
});
