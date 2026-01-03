/**
 * @file auth-state-observer.test.ts
 * @description Unit tests for AuthStateObserver
 * @testing 5 tests covering subscription, notification, error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthStateObserver } from '@/background/auth/auth-state-observer';
import type { AuthState } from '@/background/auth/interfaces/i-auth-manager';
import type { ILogger } from '@/shared/utils/logger';
import { EventBus } from '@/shared/utils/event-bus';

/**
 * Mock Logger
 */
class MockLogger implements ILogger {
    debug = vi.fn();
    info = vi.fn();
    warn = vi.fn();
    error = vi.fn();
    setLevel = vi.fn();
    getLevel = vi.fn(() => 1);
}

describe('AuthStateObserver Unit Tests', () => {
    let observer: AuthStateObserver;
    let eventBus: EventBus;
    let mockLogger: MockLogger;

    beforeEach(() => {
        eventBus = new EventBus();
        mockLogger = new MockLogger();
        observer = new AuthStateObserver(eventBus, mockLogger);
    });

    /**
     * Test 1: BASIC - Subscribe and receive notifications
     */
    it('should notify subscribers when auth state changes', async () => {
        // Arrange
        const callback = vi.fn();
        observer.subscribe(callback);

        const newState: AuthState = {
            isAuthenticated: true,
            user: { id: '123', email: 'test@example.com', displayName: 'Test User' },
            provider: 'google',
            lastAuthTime: new Date(),
        };

        // Act: Emit auth state change
        eventBus.emit('AUTH_STATE_CHANGED', newState);

        // Wait for async notification
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Assert
        expect(callback).toHaveBeenCalledWith(newState);
        expect(callback).toHaveBeenCalledTimes(1);
    });

    /**
     * Test 2: TRICKY - Multiple subscribers all notified
     */
    it('should notify all subscribers independently', async () => {
        // Arrange: 3 subscribers
        const callback1 = vi.fn();
        const callback2 = vi.fn();
        const callback3 = vi.fn();

        observer.subscribe(callback1);
        observer.subscribe(callback2);
        observer.subscribe(callback3);

        const newState: AuthState = {
            isAuthenticated: false,
            user: null,
            provider: null,
            lastAuthTime: null,
        };

        // Act
        eventBus.emit('AUTH_STATE_CHANGED', newState);
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Assert: All 3 called
        expect(callback1).toHaveBeenCalledWith(newState);
        expect(callback2).toHaveBeenCalledWith(newState);
        expect(callback3).toHaveBeenCalledWith(newState);
    });

    /**
     * Test 3: REALISTIC - Unsubscribe function works correctly
     */
    it('should stop notifying after unsubscribe', async () => {
        // Arrange
        const callback = vi.fn();
        const unsubscribe = observer.subscribe(callback);

        const state1: AuthState = {
            isAuthenticated: true,
            user: { id: '1', email: 'test@example.com', displayName: 'User' },
            provider: 'google',
            lastAuthTime: new Date(),
        };

        // Act: First notification
        eventBus.emit('AUTH_STATE_CHANGED', state1);
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(callback).toHaveBeenCalledTimes(1);

        // Act: Unsubscribe
        unsubscribe();

        // Act: Second notification (should not reach callback)
        const state2: AuthState = { ...state1, isAuthenticated: false };
        eventBus.emit('AUTH_STATE_CHANGED', state2);
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Assert: Still only called once
        expect(callback).toHaveBeenCalledTimes(1);
    });

    /**
     * Test 4: TRICKY - Subscriber error doesn't break other subscribers
     */
    it('should continue notifying other subscribers if one throws error', async () => {
        // Arrange: 3 subscribers, middle one throws
        const callback1 = vi.fn();
        const callback2 = vi.fn(() => {
            throw new Error('Subscriber error');
        });
        const callback3 = vi.fn();

        observer.subscribe(callback1);
        observer.subscribe(callback2);
        observer.subscribe(callback3);

        const newState: AuthState = {
            isAuthenticated: true,
            user: { id: '1', email: 'test@example.com', displayName: 'User' },
            provider: 'google',
            lastAuthTime: new Date(),
        };

        // Act
        eventBus.emit('AUTH_STATE_CHANGED', newState);
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Assert: All 3 called despite error in callback2
        expect(callback1).toHaveBeenCalled();
        expect(callback2).toHaveBeenCalled();
        expect(callback3).toHaveBeenCalled();

        // Assert: Error was logged
        expect(mockLogger.error).toHaveBeenCalledWith(
            'Subscriber callback error',
            expect.any(Error)
        );
    });

    /**
     * Test 5: REALISTIC - getSubscriberCount returns accurate count
     */
    it('should track subscriber count correctly', () => {
        // Arrange & Assert: Initially 0
        expect(observer.getSubscriberCount()).toBe(0);

        // Act: Add 3 subscribers
        const unsub1 = observer.subscribe(vi.fn());
        const unsub2 = observer.subscribe(vi.fn());
        const unsub3 = observer.subscribe(vi.fn());

        // Assert: Count is 3
        expect(observer.getSubscriberCount()).toBe(3);

        // Act: Remove 1
        unsub2();

        // Assert: Count is 2
        expect(observer.getSubscriberCount()).toBe(2);

        // Act: Clear all
        observer.clearSubscribers();

        // Assert: Count is 0
        expect(observer.getSubscriberCount()).toBe(0);
    });
});
