import { browser } from 'wxt/browser';

import type { IEventBus } from '@/shared/interfaces/i-event-bus';
import type { ILogger } from '@/shared/interfaces/i-logger';
import { EventName } from '@/shared/types/events';

/**
 * Bridges background events to content scripts and popup via Runtime Messaging
 *
 * Subscribes to internal EventBus (Background) and forwards relevant
 * real-time events to active tabs for Content Scripts to consume.
 */
export class EventBridge {
  constructor(
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger
  ) {}

  /**
   * Start bridging events
   */
  initialize(): void {
    this.logger.info('[EventBridge] Initializing bridge...');

    this.eventBus.on(EventName.REMOTE_HIGHLIGHT_CREATED, (payload) =>
      this.forwardToContentScript(EventName.REMOTE_HIGHLIGHT_CREATED, payload)
    );
    this.eventBus.on(EventName.REMOTE_HIGHLIGHT_UPDATED, (payload) =>
      this.forwardToContentScript(EventName.REMOTE_HIGHLIGHT_UPDATED, payload)
    );
    this.eventBus.on(EventName.REMOTE_HIGHLIGHT_DELETED, (payload) =>
      this.forwardToContentScript(EventName.REMOTE_HIGHLIGHT_DELETED, payload)
    );
  }

  /**
   * Forward event to all active tabs and extension pages (popup).
   */
  private async forwardToContentScript(
    eventName: string,
    payload: unknown
  ): Promise<void> {
    this.logger.info(`[EventBridge] [OUT] Forwarding ${eventName}`, {
      id: (payload as { id?: string })?.id,
    });

    const message = {
      type: eventName,
      payload,
      timestamp: Date.now(),
    };

    void browser.runtime.sendMessage(message).catch(() => {
      // Popup may be closed.
    });

    try {
      const tabs = await browser.tabs.query({});

      this.logger.info(`[EventBridge] Found ${tabs.length} tabs to notify`);

      for (const tab of tabs) {
        if (tab.id) {
          browser.tabs.sendMessage(tab.id, message).catch(() => {
            this.logger.debug('[EventBridge] Tab not ready for messages', {
              tabId: tab.id,
            });
          });
        }
      }
    } catch (error) {
      this.logger.error('[EventBridge] Failed to query tabs', error as Error);
    }
  }
}
