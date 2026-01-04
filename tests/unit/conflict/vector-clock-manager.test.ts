/**
 * @file vector-clock-manager.test.ts
 * @description Unit tests for VectorClockManager
 * @see docs/vault-phase-dev-2/component5_task.md (Task 5.2)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { VectorClockManager } from '../../../src/background/conflict/vector-clock-manager';
import { InvalidVectorClockError } from '../../../src/background/conflict/conflict-errors';
import type { VectorClock } from '../../../src/background/conflict/interfaces/i-vector-clock-manager';
import { MockLogger } from '../../helpers/mocks/mock-logger';

describe('VectorClockManager', () => {
    let manager: VectorClockManager;
    let logger: MockLogger;

    beforeEach(() => {
        logger = new MockLogger();
        manager = new VectorClockManager(logger);
    });

    describe('Comparison Logic (CRITICAL)', () => {
        it('should detect "before" relationship correctly', () => {
            // Clock A happened before Clock B
            const clockA: VectorClock = { 'device-1': 1 };
            const clockB: VectorClock = { 'device-1': 2 };

            const result = manager.compare(clockA, clockB);

            expect(result).toBe('before');
        });

        it('should detect "after" relationship correctly', () => {
            // Clock A happened after Clock B
            const clockA: VectorClock = { 'device-1': 2 };
            const clockB: VectorClock = { 'device-1': 1 };

            const result = manager.compare(clockA, clockB);

            expect(result).toBe('after');
        });

        it('should detect "concurrent" relationship correctly', () => {
            // Clocks are concurrent (neither before nor after)
            const clockA: VectorClock = { 'device-1': 2, 'device-2': 1 };
            const clockB: VectorClock = { 'device-1': 1, 'device-2': 2 };

            const result = manager.compare(clockA, clockB);

            expect(result).toBe('concurrent');
        });

        it('should detect "equal" relationship correctly', () => {
            // Clocks are identical
            const clockA: VectorClock = { 'device-1': 1, 'device-2': 1 };
            const clockB: VectorClock = { 'device-1': 1, 'device-2': 1 };

            const result = manager.compare(clockA, clockB);

            expect(result).toBe('equal');
        });
    });

    describe('Increment Logic', () => {
        it('should increment device counter correctly', () => {
            const clock: VectorClock = { 'device-1': 1 };

            const updated = manager.increment(clock, 'device-1');

            expect(updated['device-1']).toBe(2);
            // Verify immutability
            expect(clock['device-1']).toBe(1);
        });

        it('should add new device if not present', () => {
            const clock: VectorClock = { 'device-1': 1 };

            const updated = manager.increment(clock, 'device-2');

            expect(updated['device-1']).toBe(1);
            expect(updated['device-2']).toBe(1);
            // Verify immutability
            expect(clock['device-2']).toBeUndefined();
        });
    });

    describe('Merge Logic', () => {
        it('should take max of each device counter', () => {
            const clockA: VectorClock = { 'device-1': 2, 'device-2': 1 };
            const clockB: VectorClock = { 'device-1': 1, 'device-2': 3 };

            const merged = manager.merge(clockA, clockB);

            expect(merged['device-1']).toBe(2);
            expect(merged['device-2']).toBe(3);
        });

        it('should be associative: merge(A, merge(B, C)) = merge(merge(A, B), C)', () => {
            const clockA: VectorClock = { 'device-1': 1, 'device-2': 2 };
            const clockB: VectorClock = { 'device-1': 3, 'device-3': 1 };
            const clockC: VectorClock = { 'device-2': 4, 'device-3': 2 };

            const result1 = manager.merge(clockA, manager.merge(clockB, clockC));
            const result2 = manager.merge(manager.merge(clockA, clockB), clockC);

            expect(result1).toEqual(result2);
        });

        it('should be commutative: merge(A, B) = merge(B, A)', () => {
            const clockA: VectorClock = { 'device-1': 2, 'device-2': 1 };
            const clockB: VectorClock = { 'device-1': 1, 'device-2': 3 };

            const result1 = manager.merge(clockA, clockB);
            const result2 = manager.merge(clockB, clockA);

            expect(result1).toEqual(result2);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty clocks correctly', () => {
            const emptyA: VectorClock = {};
            const emptyB: VectorClock = {};

            const result = manager.compare(emptyA, emptyB);

            expect(result).toBe('equal');
            expect(manager.isEmpty(emptyA)).toBe(true);
        });

        it('should handle new device in clock B correctly', () => {
            const clockA: VectorClock = { 'device-1': 1 };
            const clockB: VectorClock = { 'device-1': 1, 'device-2': 1 };

            const result = manager.compare(clockA, clockB);

            // Clock A is before Clock B (B has additional events)
            expect(result).toBe('before');
        });

        it('should handle large device counts (100 devices) efficiently', () => {
            // Create clock with 100 devices
            const clock: VectorClock = {};
            for (let i = 1; i <= 100; i++) {
                clock[`device-${i}`] = i;
            }

            const startTime = performance.now();
            const result = manager.compare(clock, clock);
            const duration = performance.now() - startTime;

            expect(result).toBe('equal');
            expect(duration).toBeLessThan(10); // Should complete in < 10ms
        });
    });

    describe('Validation', () => {
        it('should reject negative counters', () => {
            const invalidClock: VectorClock = { 'device-1': -1 };

            expect(manager.isValid(invalidClock)).toBe(false);
        });

        it('should reject non-integer counters', () => {
            const invalidClock: VectorClock = { 'device-1': 1.5 };

            expect(manager.isValid(invalidClock)).toBe(false);
        });

        it('should reject NaN values', () => {
            const invalidClock: VectorClock = { 'device-1': NaN };

            expect(manager.isValid(invalidClock)).toBe(false);
        });

        it('should reject Infinity values', () => {
            const invalidClock: VectorClock = { 'device-1': Infinity };

            expect(manager.isValid(invalidClock)).toBe(false);
        });

        it('should reject empty device IDs', () => {
            const invalidClock: VectorClock = { '': 1 };

            expect(manager.isValid(invalidClock)).toBe(false);
        });

        it('should reject clocks with >100 devices (DoS prevention)', () => {
            const largeClock: VectorClock = {};
            for (let i = 1; i <= 101; i++) {
                largeClock[`device-${i}`] = 1;
            }

            expect(manager.isValid(largeClock)).toBe(false);
        });

        it('should throw InvalidVectorClockError for invalid clock in increment', () => {
            const invalidClock: VectorClock = { 'device-1': -1 };

            expect(() => {
                manager.increment(invalidClock, 'device-2');
            }).toThrow(InvalidVectorClockError);
        });

        it('should throw InvalidVectorClockError for invalid clock in compare', () => {
            const validClock: VectorClock = { 'device-1': 1 };
            const invalidClock: VectorClock = { 'device-1': -1 };

            expect(() => {
                manager.compare(validClock, invalidClock);
            }).toThrow(InvalidVectorClockError);
        });

        it('should throw InvalidVectorClockError for invalid clock in merge', () => {
            const validClock: VectorClock = { 'device-1': 1 };
            const invalidClock: VectorClock = { 'device-1': NaN };

            expect(() => {
                manager.merge(validClock, invalidClock);
            }).toThrow(InvalidVectorClockError);
        });
    });

    describe('Helper Methods', () => {
        it('should create new clock with device counter = 1', () => {
            const clock = manager.create('device-1');

            expect(clock['device-1']).toBe(1);
            expect(Object.keys(clock).length).toBe(1);
        });

        it('should get sorted list of device IDs', () => {
            const clock: VectorClock = {
                'device-3': 1,
                'device-1': 2,
                'device-2': 3,
            };

            const devices = manager.getDevices(clock);

            expect(devices).toEqual(['device-1', 'device-2', 'device-3']);
        });

        it('should get counter for specific device', () => {
            const clock: VectorClock = { 'device-1': 5 };

            expect(manager.getCounter(clock, 'device-1')).toBe(5);
            expect(manager.getCounter(clock, 'device-2')).toBe(0); // Not present
        });

        it('should serialize clock to string', () => {
            const clock: VectorClock = { 'device-1': 2, 'device-2': 1 };

            const str = manager.toString(clock);

            expect(str).toBe('device-1:2,device-2:1');
        });
    });
});
