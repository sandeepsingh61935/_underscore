import { IEventBus } from '@/shared/interfaces/i-event-bus';
import { ILogger } from '@/shared/interfaces/i-logger';
import { EventName } from '@/shared/types/events';
import { browser } from 'wxt/browser';

/**
 * Bridges background events to content scripts via Runtime Messaging
 * 
 * Subscribes to internal EventBus (Background) and forwards relevant
 * real-time events to active tabs for Content Scripts to consume.
 */
export class EventBridge {
    constructor(
        private readonly eventBus: IEventBus,
        private readonly logger: ILogger
    ) { }

    /**
     * Start bridging events
     */
    initialize(): void {
        this.logger.info('[EventBridge] Initializing bridge...');

        // Subscribe to Remote Events
        this.eventBus.on(EventName.REMOTE_HIGHLIGHT_CREATED, (payload) => this.forwardToContentScript(EventName.REMOTE_HIGHLIGHT_CREATED, payload));
        this.eventBus.on(EventName.REMOTE_HIGHLIGHT_UPDATED, (payload) => this.forwardToContentScript(EventName.REMOTE_HIGHLIGHT_UPDATED, payload));
        this.eventBus.on(EventName.REMOTE_HIGHLIGHT_DELETED, (payload) => this.forwardToContentScript(EventName.REMOTE_HIGHLIGHT_DELETED, payload));
    }

    /**
     * Forward event to all active tabs
     */
    private async forwardToContentScript(eventName: string, payload: any): Promise<void> {
        this.logger.info(`[EventBridge] 📤 Forwarding ${eventName} to content scripts`, { id: payload?.id });

        try {
            // Send to current active tab(s)
            // Using WXT browser polyfill
            const tabs = await browser.tabs.query({});

            this.logger.info(`[EventBridge] Found ${tabs.length} tabs to notify`);

            for (const tab of tabs) {
                if (tab.id) {
                    this.logger.info(`[EventBridge] Sending to tab ${tab.id}`, { url: tab.url?.substring(0, 50) });

                    // Fire and forget
                    browser.tabs.sendMessage(tab.id, {
                        type: eventName,
                        payload: payload,
                        timestamp: Date.now()
                    }).catch(err => {
                        // Ignore connection errors (tab might not have content script)
                        this.logger.debug('[EventBridge] Tab not ready for messages', { tabId: tab.id });
                    });
                }
            }
        } catch (error) {
            this.logger.error('[EventBridge] Failed to query tabs', error as Error);
        }
    }
}
