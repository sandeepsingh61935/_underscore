/**
 * @file notification-service.ts
 * @description Unified notification service for user feedback
 */

import type { ILogger } from '@/shared/utils/logger';

/**
 * Notification types matching standard UI patterns
 */
export type NotificationType = 'success' | 'warning' | 'error' | 'info';

/**
 * Interface for displaying notifications to the user
 */
export interface INotificationService {
    /**
     * Show a notification
     * @param message - The message to display
     * @param type - The type of notification (defaults to info)
     * @param title - Optional title (defaults to extension name)
     */
    notify(message: string, type?: NotificationType, title?: string): Promise<string>;

    /**
     * Clear a specific notification
     */
    clear(notificationId: string): Promise<void>;
}

/**
 * Implementation using Chrome Notifications API
 */
export class ChromeNotificationService implements INotificationService {
    constructor(private readonly logger: ILogger) { }

    async notify(
        message: string,
        type: NotificationType = 'info',
        title: string = 'Underscore'
    ): Promise<string> {
        try {
            const options: chrome.notifications.NotificationOptions = {
                type: 'basic',
                iconUrl: 'assets/icon-128.png',
                title,
                message,
                priority: this.mapPriority(type),
                // Platform specific logic could go here
            };

            // Wrap callback-based API in Promise
            return new Promise((resolve) => {
                 
                chrome.notifications.create(options as any, (notificationId) => {
                    if (chrome.runtime.lastError) {
                        this.logger.error('Failed to create notification', new Error(chrome.runtime.lastError.message));
                        resolve('');
                        return;
                    }
                    this.logger.debug('Notification created', { notificationId, type });
                    resolve(notificationId);
                });
            });
        } catch (error) {
            this.logger.error('Error in notify', error as Error);
            return '';
        }
    }

    async clear(notificationId: string): Promise<void> {
        return new Promise((resolve) => {
            chrome.notifications.clear(notificationId, (wasCleared) => {
                this.logger.debug('Notification cleared', { notificationId, wasCleared });
                resolve();
            });
        });
    }

    private mapPriority(type: NotificationType): 0 | 1 | 2 {
        switch (type) {
            case 'error': return 2;
            case 'warning': return 1;
            case 'success':
            case 'info':
            default: return 0;
        }
    }
}
