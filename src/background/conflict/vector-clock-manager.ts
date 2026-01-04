/**
 * @file vector-clock-manager.ts
 * @description Implementation of vector clock operations for distributed conflict detection
 * @see docs/04-adrs/001-event-sourcing-for-sync.md
 */

import type {
    IVectorClockManager,
    VectorClock,
    ClockComparison,
} from './interfaces/i-vector-clock-manager';
import { InvalidVectorClockError } from './conflict-errors';
import type { ILogger } from '../../shared/utils/logger';

/**
 * Vector Clock Manager Implementation
 * 
 * Implements Lamport's Vector Clock algorithm for distributed causality tracking.
 * All operations are immutable (no mutations of input clocks).
 * 
 * **Algorithm Complexity**:
 * - increment: O(1)
 * - compare: O(n) where n = number of devices
 * - merge: O(n) where n = number of devices
 * - isValid: O(n) where n = number of devices
 * 
 * **Memory**: O(n) where n = number of devices in clock
 * 
 * @see https://en.wikipedia.org/wiki/Vector_clock
 */
export class VectorClockManager implements IVectorClockManager {
    private static readonly MAX_DEVICES = 100; // DoS prevention

    constructor(private readonly logger: ILogger) { }

    /**
     * Increment the counter for a specific device
     * 
     * @throws {InvalidVectorClockError} If clock is invalid
     * @throws {Error} If deviceId is invalid
     */
    increment(clock: VectorClock, deviceId: string): VectorClock {
        // 1. Validate inputs
        if (!this.isValid(clock)) {
            this.logger.error('Invalid vector clock in increment', undefined, {
                clock,
                deviceId,
            });
            throw new InvalidVectorClockError('Invalid vector clock', { clock });
        }

        if (!deviceId || typeof deviceId !== 'string' || deviceId.trim() === '') {
            throw new Error(`Invalid device ID: ${deviceId}`);
        }

        // 2. Create new clock (immutable operation)
        const newClock: VectorClock = {
            ...clock,
            [deviceId]: (clock[deviceId] || 0) + 1,
        };

        this.logger.debug('Vector clock incremented', {
            deviceId,
            oldCounter: clock[deviceId] || 0,
            newCounter: newClock[deviceId],
        });

        return newClock;
    }

    /**
     * Compare two vector clocks to determine causality
     * 
     * @throws {InvalidVectorClockError} If either clock is invalid
     */
    compare(a: VectorClock, b: VectorClock): ClockComparison {
        // 1. Validate inputs
        if (!this.isValid(a) || !this.isValid(b)) {
            this.logger.error('Invalid vector clock in compare', undefined, { a, b });
            throw new InvalidVectorClockError('Invalid vector clock', { a, b });
        }

        // 2. Get all device IDs from both clocks
        const allDevices = new Set([...Object.keys(a), ...Object.keys(b)]);

        // 3. Compare each device counter
        let aBefore = false; // true if any a[i] < b[i]
        let aAfter = false; // true if any a[i] > b[i]

        for (const device of allDevices) {
            const aVal = a[device] || 0;
            const bVal = b[device] || 0;

            if (aVal < bVal) {
                aBefore = true;
            }
            if (aVal > bVal) {
                aAfter = true;
            }
        }

        // 4. Determine relationship
        let result: ClockComparison;
        if (!aBefore && !aAfter) {
            result = 'equal';
        } else if (aBefore && !aAfter) {
            result = 'before';
        } else if (aAfter && !aBefore) {
            result = 'after';
        } else {
            result = 'concurrent';
        }

        this.logger.debug('Vector clocks compared', {
            result,
            clockA: this.toString(a),
            clockB: this.toString(b),
        });

        return result;
    }

    /**
     * Merge two vector clocks (take maximum of each device counter)
     * 
     * @throws {InvalidVectorClockError} If either clock is invalid
     */
    merge(a: VectorClock, b: VectorClock): VectorClock {
        // 1. Validate inputs
        if (!this.isValid(a) || !this.isValid(b)) {
            this.logger.error('Invalid vector clock in merge', undefined, { a, b });
            throw new InvalidVectorClockError('Invalid vector clock', { a, b });
        }

        // 2. Get all device IDs
        const allDevices = new Set([...Object.keys(a), ...Object.keys(b)]);

        // 3. Take max of each device counter
        const merged: VectorClock = {};
        for (const device of allDevices) {
            merged[device] = Math.max(a[device] || 0, b[device] || 0);
        }

        this.logger.debug('Vector clocks merged', {
            clockA: this.toString(a),
            clockB: this.toString(b),
            merged: this.toString(merged),
        });

        return merged;
    }

    /**
     * Validate a vector clock structure
     * 
     * **Validation Rules**:
     * - All values must be non-negative integers
     * - No NaN or Infinity values
     * - Device IDs must be non-empty strings
     * - Maximum 100 devices (DoS prevention)
     */
    isValid(clock: VectorClock): boolean {
        // Check if clock is an object
        if (!clock || typeof clock !== 'object' || Array.isArray(clock)) {
            return false;
        }

        const devices = Object.keys(clock);

        // Check device count (DoS prevention)
        if (devices.length > VectorClockManager.MAX_DEVICES) {
            this.logger.warn('Vector clock exceeds max devices', {
                deviceCount: devices.length,
                maxDevices: VectorClockManager.MAX_DEVICES,
            });
            return false;
        }

        // Validate each device and counter
        for (const deviceId of devices) {
            // Check device ID is non-empty string
            if (!deviceId || typeof deviceId !== 'string' || deviceId.trim() === '') {
                return false;
            }

            const counter = clock[deviceId];

            // Check counter is a number
            if (typeof counter !== 'number') {
                return false;
            }

            // Check counter is not NaN or Infinity
            if (Number.isNaN(counter) || !Number.isFinite(counter)) {
                return false;
            }

            // Check counter is non-negative integer
            if (counter < 0 || !Number.isInteger(counter)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Create a new vector clock for a device
     */
    create(deviceId: string): VectorClock {
        if (!deviceId || typeof deviceId !== 'string' || deviceId.trim() === '') {
            throw new Error(`Invalid device ID: ${deviceId}`);
        }

        const clock: VectorClock = {
            [deviceId]: 1,
        };

        this.logger.debug('Vector clock created', { deviceId, clock });

        return clock;
    }

    /**
     * Check if vector clock is empty (no devices)
     */
    isEmpty(clock: VectorClock): boolean {
        return Object.keys(clock).length === 0;
    }

    /**
     * Get sorted list of device IDs in clock
     */
    getDevices(clock: VectorClock): string[] {
        return Object.keys(clock).sort();
    }

    /**
     * Get counter value for specific device
     */
    getCounter(clock: VectorClock, deviceId: string): number {
        return clock[deviceId] || 0;
    }

    /**
     * Serialize vector clock to string for logging
     * 
     * @example "d1:2,d2:1,d3:5"
     */
    toString(clock: VectorClock): string {
        const devices = this.getDevices(clock);
        return devices.map((device) => `${device}:${clock[device]}`).join(',');
    }
}
