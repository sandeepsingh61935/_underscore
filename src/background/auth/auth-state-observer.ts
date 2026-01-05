/**
 * @file auth-state-observer.ts
 * @description Observer for authentication state changes
 * @architecture Observer Pattern
 */

import type { IAuthStateObserver } from './interfaces/i-auth-state-observer';
import type { AuthStateCallback, UnsubscribeFn } from './interfaces/i-auth-manager';
import type { ILogger } from '@/background/utils/logger';
import { EventBus } from '@/background/utils/event-bus';

/**
 * Authentication state observer implementation
 *
 * Listens to AUTH_STATE_CHANGED events from EventBus and notifies subscribers
 */
export class AuthStateObserver implements IAuthStateObserver {
    private subscribers = new Set<AuthStateCallback>();

    constructor(
        private readonly eventBus: EventBus,
        private readonly logger: ILogger
    ) {
        // Listen to AUTH_STATE_CHANGED events
        this.eventBus.on('AUTH_STATE_CHANGED', this.notifySubscribers.bind(this));

        this.logger.debug('AuthStateObserver initialized');
    }

    /**
     * Subscribe to authentication state changes
     */
    subscribe(callback: AuthStateCallback): UnsubscribeFn {
        this.subscribers.add(callback);

        this.logger.debug('Subscriber added', {
            totalSubscribers: this.subscribers.size,
        });

        // Return unsubscribe function
        return () => {
            this.subscribers.delete(callback);
            this.logger.debug('Subscriber removed', {
                totalSubscribers: this.subscribers.size,
            });
        };
    }

    /**
     * Get current number of subscribers
     */
    getSubscriberCount(): number {
        return this.subscribers.size;
    }

    /**
     * Clear all subscribers
     */
    async clearSubscribers(): Promise<void> {
        this.subscribers.clear();
        this.logger.debug('All subscribers cleared');
    }

    /**
     * Notify all subscribers of state change
     * Handles errors gracefully - one subscriber error doesn't break others
     */
    private async notifySubscribers(state: unknown): Promise<void> {
        if (this.subscribers.size === 0) {
            return;
        }

        this.logger.debug('Notifying subscribers', {
            subscriberCount: this.subscribers.size,
        });

        // Notify all subscribers, handling errors individually
        for (const callback of this.subscribers) {
            try {
                await callback(state as Parameters<AuthStateCallback>[0]);
            } catch (error) {
                this.logger.error('Subscriber callback error', error as Error);
                // Continue notifying other subscribers even if one fails
            }
        }
    }
}
