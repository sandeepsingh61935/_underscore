/**
 * @file sync-status.ts
 * @description Sync status tracker for monitoring sync state
 * @author System Architect
 */

import type { ILogger } from '@/shared/interfaces/i-logger';
import type { EventBus } from '@/shared/utils/event-bus';

/**
 * Sync state enumeration
 */
export enum SyncState {
    IDLE = 'idle',
    SYNCING = 'syncing',
    ERROR = 'error',
    OFFLINE = 'offline',
    RATE_LIMITED = 'rate_limited',
}

/**
 * SyncStatus tracker
 * 
 * Features:
 * - Track current sync state
 * - Track last sync timestamp
 * - Track sync progress
 * - Persist status to chrome.storage
 * - Emit status change events
 */
export class SyncStatus {
    private state: SyncState = SyncState.IDLE;
    private lastSyncTime: Date | null = null;
    private syncProgress: number = 0;
    private errorMessage: string | null = null;

    constructor(
        private readonly logger: ILogger,
        private readonly eventBus: EventBus
    ) {
        this.loadStatus();
    }

    /**
     * Set sync state
     */
    setState(state: SyncState, errorMessage?: string): void {
        this.state = state;
        this.errorMessage = errorMessage || null;

        if (state === SyncState.IDLE) {
            this.lastSyncTime = new Date();
            this.syncProgress = 100;
        } else if (state === SyncState.SYNCING) {
            this.syncProgress = 0;
        }

        this.logger.debug('Sync state changed', { state, errorMessage });
        this.eventBus.emit('SYNC_STATUS_CHANGED', {
            state,
            lastSyncTime: this.lastSyncTime,
            progress: this.syncProgress,
            errorMessage: this.errorMessage,
        });

        this.saveStatus();
    }

    /**
     * Get current state
     */
    getState(): SyncState {
        return this.state;
    }

    /**
     * Get last sync time
     */
    getLastSyncTime(): Date | null {
        return this.lastSyncTime;
    }

    /**
     * Get sync progress (0-100)
     */
    getSyncProgress(): number {
        return this.syncProgress;
    }

    /**
     * Set sync progress
     */
    setSyncProgress(progress: number): void {
        this.syncProgress = Math.min(100, Math.max(0, progress));
        this.eventBus.emit('SYNC_PROGRESS_UPDATED', { progress: this.syncProgress });
    }

    /**
     * Get error message
     */
    getErrorMessage(): string | null {
        return this.errorMessage;
    }

    /**
   * Load status from chrome.storage
   */
    private async loadStatus(): Promise<void> {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                const result = await chrome.storage.local.get('syncStatus');
                const syncStatus = result['syncStatus'] as any;
                if (syncStatus) {
                    this.state = syncStatus['state'] || SyncState.IDLE;
                    this.lastSyncTime = syncStatus['lastSyncTime']
                        ? new Date(syncStatus['lastSyncTime'])
                        : null;
                    this.syncProgress = syncStatus['syncProgress'] || 0;
                    this.errorMessage = syncStatus['errorMessage'] || null;
                }
            }
        } catch (error) {
            this.logger.error('Failed to load sync status', error as Error);
        }
    }

    /**
     * Save status to chrome.storage
     */
    private async saveStatus(): Promise<void> {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                await chrome.storage.local.set({
                    syncStatus: {
                        state: this.state,
                        lastSyncTime: this.lastSyncTime?.toISOString(),
                        syncProgress: this.syncProgress,
                        errorMessage: this.errorMessage,
                    },
                });
            }
        } catch (error) {
            this.logger.error('Failed to save sync status', error as Error);
        }
    }
}
