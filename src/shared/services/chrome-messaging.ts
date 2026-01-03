/**
 * @file chrome-messaging.ts
 * @description Chrome extension messaging implementation
 *
 * Wraps chrome.runtime and chrome.tabs APIs
 * Production implementation of IMessaging interface
 */

import type { IMessaging, ITabQuery, Message } from '../interfaces/i-messaging';
import { LoggerFactory } from '../utils/logger';
import type { ILogger } from '../utils/logger';

/**
 * Chrome messaging implementation
 *
 * @remarks
 * Requires chrome.runtime and chrome.tabs APIs
 * Use MockMessaging for unit tests
 */
export class ChromeMessaging implements IMessaging {
  private logger: ILogger;

  constructor() {
    this.logger = LoggerFactory.getLogger('ChromeMessaging');
  }

  async sendToTab<T>(tabId: number, message: Message): Promise<T> {
    try {
      this.logger.debug('Sending message to tab', { tabId, type: message.type });

      const response = await chrome.tabs.sendMessage(tabId, message);

      this.logger.debug('Received response from tab', { tabId });
      return response as T;
    } catch (error) {
      this.logger.error('Failed to send message to tab', error as Error);
      throw new Error(`Messaging failed: ${(error as Error).message}`);
    }
  }

  async sendToRuntime<T>(message: Message): Promise<T> {
    try {
      this.logger.debug('Sending message to runtime', { type: message.type });

      const response = await chrome.runtime.sendMessage(message);

      this.logger.debug('Received response from runtime');
      return response as T;
    } catch (error) {
      this.logger.error('Failed to send message to runtime', error as Error);
      throw new Error(`Messaging failed: ${(error as Error).message}`);
    }
  }

  onMessage(handler: (msg: Message) => void): void {
    chrome.runtime.onMessage.addListener((message: unknown) => {
      this.logger.debug('Received message', { message });
      handler(message as Message);
    });
  }

  removeListener(handler: (msg: Message) => void): void {
    chrome.runtime.onMessage.removeListener(
      handler as Parameters<typeof chrome.runtime.onMessage.removeListener>[0]
    );
  }
}

/**
 * Chrome tab query implementation
 */
export class ChromeTabQuery implements ITabQuery {
  private logger: ILogger;

  constructor() {
    this.logger = LoggerFactory.getLogger('ChromeTabQuery');
  }

  async getActiveTab(): Promise<chrome.tabs.Tab | null> {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

      if (tabs.length === 0) {
        this.logger.warn('No active tab found');
        return null;
      }

      return tabs[0] ?? null;
    } catch (error) {
      this.logger.error('Failed to get active tab', error as Error);
      return null;
    }
  }

  async queryTabs(query: object): Promise<chrome.tabs.Tab[]> {
    try {
      const tabs = await chrome.tabs.query(query as chrome.tabs.QueryInfo);
      return tabs;
    } catch (error) {
      this.logger.error('Failed to query tabs', error as Error);
      return [];
    }
  }
}
