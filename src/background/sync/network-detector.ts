/**
 * @file network-detector.ts
 * @description Network detection for offline-first architecture
 * @author System Architect
 */

import type { INetworkDetector } from './interfaces/i-network-detector';
import { ConnectionType } from './interfaces/i-network-detector';
import type { ILogger } from '@/shared/interfaces/i-logger';

/**
 * NetworkDetector implementation
 * 
 * Features:
 * - Online/offline detection using navigator.onLine
 * - Connection type detection (Network Information API)
 * - Event-based notifications
 * - Optional ping verification
 */
export class NetworkDetector implements INetworkDetector {
    private subscribers: Set<(online: boolean) => void> = new Set();

    constructor(private readonly logger: ILogger) {
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for network changes
     */
    private setupEventListeners(): void {
        window.addEventListener('online', this.handleOnline);
        window.addEventListener('offline', this.handleOffline);
    }

    /**
     * Handle online event
     */
    private handleOnline = (): void => {
        this.logger.info('Network online');
        this.notifySubscribers(true);
    };

    /**
     * Handle offline event
     */
    private handleOffline = (): void => {
        this.logger.warn('Network offline');
        this.notifySubscribers(false);
    };

    /**
     * Notify all subscribers
     */
    private notifySubscribers(online: boolean): void {
        this.subscribers.forEach((callback) => {
            try {
                callback(online);
            } catch (error) {
                this.logger.error('Error in network subscriber', error as Error);
            }
        });
    }

    /**
     * Check if device is currently online
     */
    async isOnline(): Promise<boolean> {
        return navigator.onLine;
    }

    /**
     * Subscribe to network status changes
     */
    subscribe(callback: (online: boolean) => void): () => void {
        this.subscribers.add(callback);

        // Return unsubscribe function
        return () => {
            this.subscribers.delete(callback);
        };
    }

    /**
   * Get current connection type
   */
    async getConnectionType(): Promise<ConnectionType> {
        if (!navigator.onLine) {
            return ConnectionType.OFFLINE;
        }

        // Try to use Network Information API
        const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

        if (connection) {
            const type = connection.effectiveType || connection.type;

            if (type === 'wifi') return ConnectionType.WIFI;
            if (type === 'cellular' || type.includes('cellular')) return ConnectionType.CELLULAR;
            if (type === 'ethernet') return ConnectionType.ETHERNET;
        }

        return ConnectionType.UNKNOWN;
    }

    /**
     * Cleanup - remove event listeners
     */
    destroy(): void {
        window.removeEventListener('online', this.handleOnline);
        window.removeEventListener('offline', this.handleOffline);
        this.subscribers.clear();
    }
}
