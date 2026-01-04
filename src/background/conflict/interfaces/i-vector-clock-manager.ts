/**
 * @file i-vector-clock-manager.ts
 * @description Interface for vector clock operations used in conflict resolution
 * @see docs/04-adrs/001-event-sourcing-for-sync.md
 */

/**
 * Vector clock type - maps device IDs to their logical clock counters
 * Each device maintains its own counter, incremented on local events
 * 
 * @example
 * { "device-1": 5, "device-2": 3 } // Device 1 has 5 events, Device 2 has 3
 */
export type VectorClock = Record<string, number>;

/**
 * Result of comparing two vector clocks
 * - 'before': Clock A happened before Clock B (A → B)
 * - 'after': Clock A happened after Clock B (B → A)
 * - 'concurrent': Clocks are concurrent (A || B) - conflict possible
 * - 'equal': Clocks are identical (A = B)
 */
export type ClockComparison = 'before' | 'after' | 'concurrent' | 'equal';

/**
 * Vector Clock Manager Interface
 * 
 * Manages vector clocks for distributed conflict detection.
 * Vector clocks track causality between events across multiple devices.
 * 
 * **Algorithm**: Lamport's Vector Clocks
 * - Each device maintains a counter for itself and all other devices
 * - On local event: increment own counter
 * - On message send: include current vector clock
 * - On message receive: merge clocks (take max of each counter)
 * 
 * **Causality Detection**:
 * - A before B: all(A[i] <= B[i]) && exists(A[i] < B[i])
 * - A after B: all(A[i] >= B[i]) && exists(A[i] > B[i])
 * - A concurrent B: neither before nor after (conflict!)
 * 
 * @see https://en.wikipedia.org/wiki/Vector_clock
 */
export interface IVectorClockManager {
    /**
     * Increment the counter for a specific device
     * 
     * @param clock - Current vector clock
     * @param deviceId - ID of the device to increment
     * @returns New vector clock with incremented counter (immutable)
     * @throws {InvalidVectorClockError} If clock is invalid
     * @throws {Error} If deviceId is invalid
     * 
     * @example
     * const clock = { "device-1": 1 };
     * const updated = increment(clock, "device-1");
     * // Result: { "device-1": 2 }
     */
    increment(clock: VectorClock, deviceId: string): VectorClock;

    /**
     * Compare two vector clocks to determine causality
     * 
     * @param a - First vector clock
     * @param b - Second vector clock
     * @returns Relationship between clocks
     * @throws {InvalidVectorClockError} If either clock is invalid
     * 
     * @example
     * compare({ "d1": 2, "d2": 1 }, { "d1": 1, "d2": 2 }) // 'concurrent'
     * compare({ "d1": 1 }, { "d1": 2 }) // 'before'
     */
    compare(a: VectorClock, b: VectorClock): ClockComparison;

    /**
     * Merge two vector clocks (take maximum of each device counter)
     * Used when receiving events from other devices
     * 
     * @param a - First vector clock
     * @param b - Second vector clock
     * @returns Merged vector clock (immutable)
     * @throws {InvalidVectorClockError} If either clock is invalid
     * 
     * @example
     * merge({ "d1": 2, "d2": 1 }, { "d1": 1, "d2": 3 })
     * // Result: { "d1": 2, "d2": 3 }
     */
    merge(a: VectorClock, b: VectorClock): VectorClock;

    /**
     * Validate a vector clock structure
     * 
     * @param clock - Vector clock to validate
     * @returns true if valid, false otherwise
     * 
     * **Validation Rules**:
     * - All values must be non-negative integers
     * - No NaN or Infinity values
     * - Device IDs must be non-empty strings
     * - Maximum 100 devices (DoS prevention)
     */
    isValid(clock: VectorClock): boolean;

    /**
     * Create a new vector clock for a device
     * 
     * @param deviceId - ID of the device
     * @returns New vector clock with device counter = 1
     */
    create(deviceId: string): VectorClock;

    /**
     * Check if vector clock is empty (no devices)
     * 
     * @param clock - Vector clock to check
     * @returns true if empty, false otherwise
     */
    isEmpty(clock: VectorClock): boolean;

    /**
     * Get sorted list of device IDs in clock
     * 
     * @param clock - Vector clock
     * @returns Sorted array of device IDs
     */
    getDevices(clock: VectorClock): string[];

    /**
     * Get counter value for specific device
     * 
     * @param clock - Vector clock
     * @param deviceId - Device ID to look up
     * @returns Counter value (0 if device not in clock)
     */
    getCounter(clock: VectorClock, deviceId: string): number;

    /**
     * Serialize vector clock to string for logging
     * 
     * @param clock - Vector clock
     * @returns String representation
     * @example "d1:2,d2:1"
     */
    toString(clock: VectorClock): string;
}
