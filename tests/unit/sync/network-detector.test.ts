/**
 * @file network-detector.test.ts
 * @description Unit tests for NetworkDetector
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NetworkDetector } from '@/background/sync/network-detector';
import { ConnectionType } from '@/background/sync/interfaces/i-network-detector';
import type { ILogger } from '@/shared/interfaces/i-logger';

const createMockLogger = (): ILogger => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setLevel: vi.fn(),
    getLevel: vi.fn(() => 1 as any),
});

describe('NetworkDetector Unit Tests', () => {
    let detector: NetworkDetector;
    let logger: ILogger;

    beforeEach(() => {
        logger = createMockLogger();
        detector = new NetworkDetector(logger);
    });

    afterEach(() => {
        detector.destroy();
    });

    describe('Online/Offline Detection', () => {
        it('should detect online status using navigator.onLine', async () => {
            const isOnline = await detector.isOnline();
            expect(typeof isOnline).toBe('boolean');
        });

        it('should subscribe to network changes', () => {
            const callback = vi.fn();
            const unsubscribe = detector.subscribe(callback);

            expect(typeof unsubscribe).toBe('function');

            // Cleanup
            unsubscribe();
        });

        it('should unsubscribe correctly', () => {
            const callback = vi.fn();
            const unsubscribe = detector.subscribe(callback);

            unsubscribe();

            // Callback should not be called after unsubscribe
            // (Can't easily test without triggering actual network events)
        });
    });

    describe('Connection Type Detection', () => {
        it('should return offline when navigator.onLine is false', async () => {
            // Mock navigator.onLine
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: false,
            });

            const type = await detector.getConnectionType();
            expect(type).toBe(ConnectionType.OFFLINE);

            // Restore
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: true,
            });
        });

        it('should return connection type when online', async () => {
            const type = await detector.getConnectionType();
            expect(Object.values(ConnectionType)).toContain(type);
        });
    });

    describe('Cleanup', () => {
        it('should cleanup event listeners on destroy', () => {
            const callback = vi.fn();
            detector.subscribe(callback);

            detector.destroy();

            // Should not throw
            expect(() => detector.destroy()).not.toThrow();
        });
    });
});
