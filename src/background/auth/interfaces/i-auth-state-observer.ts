/**
 * @file i-auth-state-observer.ts
 * @description Authentication state observer interface
 * @architecture Observer Pattern
 */

import type { AuthStateCallback, UnsubscribeFn } from './i-auth-manager';

/**
 * Authentication state observer interface
 *
 * @responsibility Notify subscribers of authentication state changes
 * @pattern Observer Pattern
 * @eventDriven Listens to AUTH_STATE_CHANGED events via EventBus
 */
export interface IAuthStateObserver {
    /**
     * Subscribe to authentication state changes
     *
     * @param callback - Function to call when auth state changes
     * @returns Unsubscribe function to remove subscription
     *
     * @example
     * ```typescript
     * const unsubscribe = observer.subscribe((state) => {
     *   console.log('Auth state:', state.isAuthenticated);
     * });
     *
     * // Later, unsubscribe
     * unsubscribe();
     * ```
     */
    subscribe(callback: AuthStateCallback): UnsubscribeFn;

    /**
     * Get current number of subscribers
     *
     * @returns Number of active subscribers
     */
    getSubscriberCount(): number;

    /**
     * Clear all subscribers
     *
     * @returns Promise that resolves when all subscribers cleared
     */
    clearSubscribers(): Promise<void>;
}
