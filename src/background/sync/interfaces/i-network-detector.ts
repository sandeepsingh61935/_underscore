/**
 * @file i-network-detector.ts
 * @description Network detection interface for offline-first sync
 * @author System Architect
 */

/**
 * Connection type enumeration
 */
export enum ConnectionType {
    WIFI = 'wifi',
    CELLULAR = 'cellular',
    ETHERNET = 'ethernet',
    UNKNOWN = 'unknown',
    OFFLINE = 'offline',
}

/**
 * Network detector interface for monitoring connectivity
 * 
 * Supports offline-first architecture by:
 * - Detecting online/offline transitions
 * - Identifying connection type
 * - Notifying subscribers of network changes
 * 
 * @example
 * ```typescript
 * const detector = container.resolve<INetworkDetector>('networkDetector');
 * 
 * // Check current status
 * const isOnline = await detector.isOnline();
 * 
 * // Subscribe to changes
 * const unsubscribe = detector.subscribe((online) => {
 *   if (online) {
 *     console.log('Back online - triggering sync');
 *     syncQueue.flush();
 *   } else {
 *     console.log('Offline - queueing events locally');
 *   }
 * });
 * 
 * // Later: cleanup
 * unsubscribe();
 * ```
 */
export interface INetworkDetector {
    /**
     * Check if device is currently online
     * 
     * Uses navigator.onLine and optionally verifies with ping
     * 
     * @returns True if online, false if offline
     */
    isOnline(): Promise<boolean>;

    /**
     * Subscribe to network status changes
     * 
     * Callback is invoked when network transitions between online/offline
     * 
     * @param callback - Function to call on network change
     * @returns Unsubscribe function
     */
    subscribe(callback: (online: boolean) => void): () => void;

    /**
     * Get current connection type
     * 
     * Uses Network Information API if available
     * 
     * @returns Connection type enum
     */
    getConnectionType(): Promise<ConnectionType>;
}
