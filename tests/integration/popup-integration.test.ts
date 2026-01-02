/**
 * @file popup-integration.test.ts
 * @description Integration tests for popup with realistic scenarios
 * 
 * Tests full flow with real components (not mocked):
 * - Popup → StateManager → MessageBus → Background simulation
 * - Circuit breaker integration
 * - Retry logic integration
 * - Real error propagation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PopupStateManager } from '@/popup/popup-state-manager';
import { ChromeMessageBus } from '@/shared/services/chrome-message-bus';
import { RetryDecorator } from '@/shared/services/retry-decorator';
import { CircuitBreakerMessageBus } from '@/shared/services/circuit-breaker-message-bus';
import { CircuitBreaker } from '@/shared/utils/circuit-breaker';
import { ConsoleLogger } from '@/shared/utils/logger';
import type { MessageResponse } from '@/shared/schemas/message-schemas';

describe('Popup Integration - Realistic Scenarios', () => {
    let stateManager: PopupStateManager;
    let logger: ConsoleLogger;
    let circuitBreaker: CircuitBreaker;

    beforeEach(() => {
        logger = new ConsoleLogger('PopupIntegrationTest');
        circuitBreaker = new CircuitBreaker({
            failureThreshold: 3,
            successThreshold: 2,
            resetTimeout: 1000,
            name: 'TestCircuitBreaker',
        }, logger);

        // Mock chrome.runtime API
        // Mock chrome APIs
        const mockSendMessage = vi.fn();

        global.chrome = {
            runtime: {
                sendMessage: mockSendMessage,
                onMessage: {
                    addListener: vi.fn(),
                    removeListener: vi.fn(),
                },
                lastError: null,
            },
            tabs: {
                // Forward tabs.sendMessage to runtime.sendMessage mock for easier testing
                sendMessage: vi.fn((tabId, msg, callback) => {
                    // Check if runtime.sendMessage has an implementation
                    if (mockSendMessage.getMockImplementation()) {
                        mockSendMessage(msg, callback);
                    }
                }),
                query: vi.fn(),
            }
        } as any;
    });

    afterEach(() => {
        vi.clearAllMocks();
        circuitBreaker.reset();
    });

    describe('Network Glitch Recovery', () => {
        it('should retry and succeed after transient network failure', async () => {
            // Arrange: First 2 calls fail, 3rd succeeds (simulating network glitch)
            let callCount = 0;
            (chrome.runtime.sendMessage as any).mockImplementation((msg: any, callback: any) => {
                callCount++;
                if (callCount <= 2) {
                    // Simulate network error
                    chrome.runtime.lastError = { message: 'Network error' };
                    callback(null);
                } else {
                    // Success on 3rd try
                    chrome.runtime.lastError = null;
                    callback({
                        success: true,
                        data: { mode: 'walk', total: 10, currentPage: 5 }
                    });
                }
            });

            // Create real message bus with retry
            const baseMessageBus = new ChromeMessageBus(logger);
            const retryMessageBus = new RetryDecorator(baseMessageBus, logger, {
                maxRetries: 3,
                initialDelayMs: 10,
                maxDelayMs: 50,
                backoffMultiplier: 2,
            });

            stateManager = new PopupStateManager(retryMessageBus, logger);

            // Act: Should succeed after retries
            await expect(stateManager.initialize(123)).resolves.not.toThrow();

            // Assert
            // Assert
            // initialize() makes 2 calls (Mode + Stats).
            // Mode: Fail (1), Fail (2), Success (3)
            // Stats: Success (4)
            expect(callCount).toBe(4);
            const state = stateManager.getState();
            expect(state.currentMode).toBe('walk');
            expect(state.error).toBeNull();
        });

        it('should fail after exhausting retries', async () => {
            // Arrange: All calls fail
            (chrome.runtime.sendMessage as any).mockImplementation((msg: any, callback: any) => {
                chrome.runtime.lastError = { message: 'Persistent network error' };
                callback(null);
            });

            const baseMessageBus = new ChromeMessageBus(logger);
            const retryMessageBus = new RetryDecorator(baseMessageBus, logger, {
                maxRetries: 2,
                initialDelayMs: 10,
            });

            stateManager = new PopupStateManager(retryMessageBus, logger);

            // Act & Assert: Should fail after retries
            await expect(stateManager.initialize(123)).rejects.toThrow();

            const state = stateManager.getState();
            expect(state.error).toBeDefined();
            expect(state.loading).toBe(false);
        });
    });

    describe('Circuit Breaker Integration', () => {
        it('should open circuit after repeated failures', async () => {
            // Arrange: All calls fail
            (chrome.runtime.sendMessage as any).mockImplementation((msg: any, callback: any) => {
                chrome.runtime.lastError = { message: 'Service unavailable' };
                callback(null);
            });

            const baseMessageBus = new ChromeMessageBus(logger);
            const circuitBreakerMessageBus = new CircuitBreakerMessageBus(
                baseMessageBus,
                circuitBreaker
            );

            stateManager = new PopupStateManager(circuitBreakerMessageBus, logger);

            // Act: Trigger failures to open circuit
            const failures = [];
            for (let i = 0; i < 5; i++) {
                failures.push(
                    stateManager.initialize(123).catch(() => 'failed')
                );
            }

            await Promise.all(failures);

            // Assert: Circuit should be open
            expect(circuitBreaker.getState()).toBe('OPEN');

            // Next call should fail fast (not even try)
            const startTime = Date.now();
            await expect(stateManager.initialize(123)).rejects.toThrow('Circuit breaker');
            const duration = Date.now() - startTime;

            // Should fail immediately (< 10ms), not wait for timeout
            expect(duration).toBeLessThan(100);
        });

        it('should transition to HALF_OPEN and recover', async () => {
            // Arrange: Setup to fail initially, then succeed
            let shouldFail = true;
            (chrome.runtime.sendMessage as any).mockImplementation((msg: any, callback: any) => {
                if (shouldFail) {
                    chrome.runtime.lastError = { message: 'Service down' };
                    callback(null);
                } else {
                    chrome.runtime.lastError = null;
                    callback({
                        success: true,
                        data: { mode: 'walk', total: 0, currentPage: 0 }
                    });
                }
            });

            const baseMessageBus = new ChromeMessageBus(logger);
            const circuitBreakerMessageBus = new CircuitBreakerMessageBus(
                baseMessageBus,
                circuitBreaker
            );

            stateManager = new PopupStateManager(circuitBreakerMessageBus, logger);

            // Act: Open circuit
            for (let i = 0; i < 3; i++) {
                await stateManager.initialize(123).catch(() => { });
            }

            expect(circuitBreaker.getState()).toBe('OPEN');

            // Wait for reset timeout
            await new Promise(resolve => setTimeout(resolve, 1100));

            // Service recovers
            shouldFail = false;

            // Try again - should transition to HALF_OPEN then CLOSED
            await expect(stateManager.initialize(123)).resolves.not.toThrow();

            // Circuit should eventually close after successful calls
            expect(circuitBreaker.getState()).toBe('CLOSED');
        });
    });

    describe('Optimistic Update with Real IPC', () => {
        it('should rollback on IPC failure', async () => {
            // Arrange: Init succeeds, switch fails
            let initCalled = false;
            let callCount = 0;
            (chrome.runtime.sendMessage as any).mockImplementation((msg: any, callback: any) => {
                callCount++;
                // First 2 calls are initialize (Mode + Stats) - Succeed
                if (callCount <= 2) {
                    chrome.runtime.lastError = null;
                    callback({
                        success: true,
                        data: { mode: 'walk', count: 5, currentPage: 2 }
                    });
                } else {
                    // Mode switch fails (3rd call)
                    chrome.runtime.lastError = { message: 'Switch failed' };
                    callback(null);
                }
            });

            const baseMessageBus = new ChromeMessageBus(logger, { timeoutMs: 1000 });
            stateManager = new PopupStateManager(baseMessageBus, logger);

            await stateManager.initialize(123);

            const stateBefore = stateManager.getState();
            expect(stateBefore.currentMode).toBe('walk');
            expect(stateBefore.stats.totalHighlights).toBe(5);

            // Act: Try to switch (will fail)
            await expect(
                stateManager.switchModeOptimistically('sprint')
            ).rejects.toThrow();

            // Assert: State rolled back
            const stateAfter = stateManager.getState();
            expect(stateAfter.currentMode).toBe('walk'); // Rolled back
            expect(stateAfter.stats.totalHighlights).toBe(5); // Preserved
            expect(stateAfter.error).toBeDefined();
        });
    });

    describe('Timeout Scenarios', () => {
        it('should timeout if background does not respond', async () => {
            // Arrange: Never call callback (simulating hung background)
            (chrome.runtime.sendMessage as any).mockImplementation((msg: any, callback: any) => {
                // Never call callback - simulates timeout
            });

            const baseMessageBus = new ChromeMessageBus(logger, { timeoutMs: 100 });
            stateManager = new PopupStateManager(baseMessageBus, logger);

            // Act & Assert: Should timeout
            const startTime = Date.now();
            await expect(stateManager.initialize(123)).rejects.toThrow('timeout');
            const duration = Date.now() - startTime;

            // Should timeout around 100ms
            expect(duration).toBeGreaterThanOrEqual(100);
            expect(duration).toBeLessThan(200);
        });
    });

    describe('Race Condition Scenarios', () => {
        it('should handle rapid mode switches with real IPC', async () => {
            // Arrange: All calls succeed but with delay
            (chrome.runtime.sendMessage as any).mockImplementation((msg: any, callback: any) => {
                setTimeout(() => {
                    chrome.runtime.lastError = null;
                    callback({ success: true, data: {} });
                }, 50);
            });

            const baseMessageBus = new ChromeMessageBus(logger);
            stateManager = new PopupStateManager(baseMessageBus, logger);

            await stateManager.initialize(123);

            // Act: Fire rapid switches
            const switches = [
                stateManager.switchModeOptimistically('sprint'),
                stateManager.switchModeOptimistically('vault'),
                stateManager.switchModeOptimistically('walk'),
            ];

            // Assert: All should complete
            await expect(Promise.all(switches)).resolves.toBeDefined();
        });
    });

    describe('Full Stack Integration', () => {
        it('should work with full decorator chain (Circuit + Retry + Chrome)', async () => {
            // Arrange: Flaky network (fails sometimes)
            let callCount = 0;
            (chrome.runtime.sendMessage as any).mockImplementation((msg: any, callback: any) => {
                callCount++;
                // Fail on odd calls, succeed on even
                if (callCount % 2 === 1) {
                    chrome.runtime.lastError = { message: 'Flaky network' };
                    callback(null);
                } else {
                    chrome.runtime.lastError = null;
                    callback({
                        success: true,
                        data: { mode: 'walk', total: 0, currentPage: 0 }
                    });
                }
            });

            // Full decorator chain
            const baseMessageBus = new ChromeMessageBus(logger);
            const retryMessageBus = new RetryDecorator(baseMessageBus, logger, {
                maxRetries: 3,
                initialDelayMs: 10,
            });
            const fullMessageBus = new CircuitBreakerMessageBus(
                retryMessageBus,
                circuitBreaker
            );

            stateManager = new PopupStateManager(fullMessageBus, logger);

            // Act: Should succeed due to retry
            await expect(stateManager.initialize(123)).resolves.not.toThrow();

            // Assert: Retry kicked in
            expect(callCount).toBeGreaterThan(1);
        });
    });

    describe('Error Propagation', () => {
        it('should propagate validation errors without retry', async () => {
            // Arrange: Return validation error
            (chrome.runtime.sendMessage as any).mockImplementation((msg: any, callback: any) => {
                chrome.runtime.lastError = null;
                callback({
                    success: false,
                    error: 'Invalid message schema',
                    code: 'VALIDATION_ERROR'
                });
            });

            const baseMessageBus = new ChromeMessageBus(logger);
            const retryMessageBus = new RetryDecorator(baseMessageBus, logger);

            stateManager = new PopupStateManager(retryMessageBus, logger);

            // Act & Assert: Should fail immediately (no retry for validation errors)
            const startTime = Date.now();
            await expect(stateManager.initialize(123)).rejects.toThrow();
            const duration = Date.now() - startTime;

            // Should fail fast (< 50ms), not retry
            expect(duration).toBeLessThan(100);
        });
    });
});
