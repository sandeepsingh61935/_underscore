/**
 * @file i-messaging.ts
 * @description Messaging interface abstractions for Chrome extension IPC
 *
 * Abstracts chrome.runtime and chrome.tabs APIs
 * Enables testing without Chrome globals
 * Implements Adapter Pattern from quality framework
 */

/// <reference types="chrome"/>

/**
 * Generic message structure
 *
 * @remarks
 * All messages should follow this structure
 * Type discriminated unions for type safety
 */
export interface Message {
  type: string;
  payload?: unknown;
}

/**
 * Messaging interface for Chrome extension communication
 *
 * @remarks
 * Abstracts chrome.runtime.sendMessage and chrome.tabs.sendMessage
 * Enables unit testing with mock implementations
 * Type-safe message passing with generics
 */
export interface IMessaging {
  /**
   * Send message to a specific tab
   *
   * @template T - Expected response type
   * @param tabId - Target tab ID
   * @param message - Message to send
   * @returns Promise resolving to response of type T
   *
   * @throws {MessagingError} If tab doesn't exist or message fails
   *
   * @remarks
   * Wraps chrome.tabs.sendMessage
   * Timeout after 30 seconds
   */
  sendToTab<T>(tabId: number, message: Message): Promise<T>;

  /**
   * Send message to background/service worker
   *
   * @template T - Expected response type
   * @param message - Message to send
   * @returns Promise resolving to response of type T
   *
   * @throws {MessagingError} If runtime unavailable or message fails
   *
   * @remarks
   * Wraps chrome.runtime.sendMessage
   * Timeout after 30 seconds
   */
  sendToRuntime<T>(message: Message): Promise<T>;

  /**
   * Register message listener
   *
   * @param handler - Function to handle incoming messages
   *
   * @remarks
   * Wraps chrome.runtime.onMessage.addListener
   * Handler called for ALL message types
   * Filter by message.type in handler
   */
  onMessage(handler: (msg: Message) => void): void;

  /**
   * Remove message listener
   *
   * @param handler - Previously registered handler to remove
   *
   * @remarks
   * Wraps chrome.runtime.onMessage.removeListener
   * Must pass same function reference used in onMessage()
   */
  removeListener(handler: (msg: Message) => void): void;
}

/**
 * Tab query interface for Chrome tabs API
 *
 * @remarks
 * Abstracts chrome.tabs.query and chrome.tabs.get
 * Enables unit testing without Chrome
 */
export interface ITabQuery {
  /**
   * Get the currently active tab
   *
   * @returns Promise resolving to active tab or null if none
   *
   * @remarks
   * Queries for active tab in current window
   * Returns null if no active tab found
   */
  getActiveTab(): Promise<chrome.tabs.Tab | null>;

  /**
   * Query tabs matching criteria
   *
   * @param query - Query object (matches chrome.tabs.query format)
   * @returns Promise resolving to array of matching tabs
   *
   * @remarks
   * Wraps chrome.tabs.query
   * Returns empty array if no matches
   */
  queryTabs(query: object): Promise<chrome.tabs.Tab[]>;
}
