
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConnectionManager } from '@/background/realtime/connection-manager';
import { IWebSocketClient } from '@/background/realtime/interfaces/i-websocket-client';
import { IEventBus } from '@/shared/interfaces/i-event-bus';
import { ILogger } from '@/shared/interfaces/i-logger';
import { EventName } from '@/shared/types/events';

describe('ConnectionManager', () => {
    let manager: ConnectionManager;
    let mockWsClient: any;
    let mockEventBus: any;
    let mockLogger: any;

    beforeEach(() => {
        vi.useFakeTimers();

        mockWsClient = {
            subscribe: vi.fn().mockResolvedValue(undefined),
            unsubscribe: vi.fn(),
            isConnected: vi.fn().mockReturnValue(false)
        };

        mockEventBus = {
            on: vi.fn(),
            emit: vi.fn()
        };

        mockLogger = {
            info: vi.fn(),
            error: vi.fn(),
            debug: vi.fn()
        };

        manager = new ConnectionManager(
            mockWsClient as unknown as IWebSocketClient,
            mockEventBus as unknown as IEventBus,
            mockLogger as unknown as ILogger
        );
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('connect', () => {
        it('should subscribe to websocket client', async () => {
            await manager.connect('user-1');
            expect(mockWsClient.subscribe).toHaveBeenCalledWith('user-1');
            expect(mockLogger.info).toHaveBeenCalledWith('Connected to realtime service');
        });

        it('should trigger reconnect on failure', async () => {
            mockWsClient.subscribe.mockRejectedValueOnce(new Error('Fail'));

            // We need to await the promise chain, but handleReconnect is awaited inside connect catch block
            // However, connect logic is: try { subscribe } catch { await handleReconnect }
            // If handleReconnect waits, connect waits.

            const connectPromise = manager.connect('user-1');

            // Should schedule reconnect after failure
            await Promise.resolve(); // Allow catch block to execute

            expect(mockLogger.error).toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Scheduling reconnect attempt 1/5'));

            // Fast forward timer
            await vi.advanceTimersByTimeAsync(1000);

            // Should allow second attempt
            // connect calls subscribe again
            expect(mockWsClient.subscribe).toHaveBeenCalledTimes(2);
        });
    });

    describe('disconnect', () => {
        it('should unsubscribe and set manually disconnected flag', async () => {
            await manager.connect('user-1');
            manager.disconnect();

            expect(mockWsClient.unsubscribe).toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith('Disconnected from realtime service');

            // Verify no reconnects happen even if we were failing
            // (Mock failure scenario would be complex here, checking explicit flag is internal)
            // But checking behavior: if we emit network online, verify it DOES NOT connect.

            // Simulate coming online
            const networkHandler = mockEventBus.on.mock.calls.find((call: any[]) => call[0] === EventName.NETWORK_STATUS_CHANGED)[1];
            networkHandler({ isOnline: true });

            expect(mockWsClient.subscribe).toHaveBeenCalledTimes(1); // Only initial connect, no reconnect
        });
    });

    describe('Network Changes', () => {
        it('should reconnect when coming online if was connected before', async () => {
            await manager.connect('user-1');

            // Simulate disconnect/offline state from WS point of view (mock isConnected false)
            mockWsClient.isConnected.mockReturnValue(false);

            // Find the handler
            const networkHandler = mockEventBus.on.mock.calls.find((call: any[]) => call[0] === EventName.NETWORK_STATUS_CHANGED)[1];

            // Trigger online
            await networkHandler({ isOnline: true });

            expect(mockWsClient.subscribe).toHaveBeenCalledTimes(2); // Initial + reconnect
        });

        it('should NOT reconnect when coming online if manually disconnected', async () => {
            await manager.connect('user-1');
            manager.disconnect();
            mockWsClient.subscribe.mockClear();

            // Simulate came online
            const networkHandler = mockEventBus.on.mock.calls.find((call: any[]) => call[0] === EventName.NETWORK_STATUS_CHANGED)[1];
            await networkHandler({ isOnline: true });

            expect(mockWsClient.subscribe).not.toHaveBeenCalled();
        });
    });

    describe('Exponential Backoff', () => {
        it('should increase delay with attempts', async () => {
            mockWsClient.subscribe.mockRejectedValue(new Error('Fail'));

            // First attempt (fails)
            manager.connect('user-1');
            await Promise.resolve(); // catch block
            expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('in 1000ms'));

            await vi.advanceTimersByTimeAsync(1000); // Trigger attempt 2
            await Promise.resolve(); // catch block
            expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('in 2000ms'));

            await vi.advanceTimersByTimeAsync(2000); // Trigger attempt 3
            await Promise.resolve(); // catch block
            expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('in 4000ms'));
        });

        it('should stop after max attempts', async () => {
            mockWsClient.subscribe.mockRejectedValue(new Error('Fail'));

            manager.connect('user-1');
            await Promise.resolve();

            // Run through 5 attempts
            for (let i = 0; i < 5; i++) {
                // Wait for the scheduled delay
                // The delay increases: 1000, 2000, 4000, 8000, 16000
                const delay = 1000 * Math.pow(2, i);
                await vi.advanceTimersByTimeAsync(delay);
                await Promise.resolve();
            }

            expect(mockLogger.error).toHaveBeenCalledWith('Max reconnect attempts reached for realtime service');
            expect(mockWsClient.subscribe).toHaveBeenCalledTimes(6); // Initial + 5 retries
        });
    });
});
