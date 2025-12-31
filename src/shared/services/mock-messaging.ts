/**
 * @file mock-messaging.ts
 * @description Mock messaging implementation for testing
 *
 * Provides in-memory message passing for unit tests
 * No Chrome API dependencies
 */

import type { IMessaging, ITabQuery, Message } from '../interfaces/i-messaging';

/**
 * Mock messaging implementation for unit tests
 *
 * @remarks
 * - No Chrome API dependencies
 * - Synchronous message passing via in-memory queues
 * - Can track all sent messages for verification
 * - Can inject canned responses
 */
export class MockMessaging implements IMessaging {
    private handlers: Array<(msg: Message) => void> = [];
    public sentToTab: Array<{ tabId: number; message: Message }> = [];
    public sentToRuntime: Message[] = [];
    private tabResponses = new Map<string, unknown>();
    private runtimeResponses = new Map<string, unknown>();

    /**
     * Set canned response for tab message
     */
    setTabResponse<T>(messageType: string, response: T): void {
        this.tabResponses.set(messageType, response);
    }

    /**
     * Set canned response for runtime message
     */
    setRuntimeResponse<T>(messageType: string, response: T): void {
        this.runtimeResponses.set(messageType, response);
    }

    /**
     * Reset all state (call between tests)
     */
    reset(): void {
        this.handlers = [];
        this.sentToTab = [];
        this.sentToRuntime = [];
        this.tabResponses.clear();
        this.runtimeResponses.clear();
    }

    async sendToTab<T>(tabId: number, message: Message): Promise<T> {
        this.sentToTab.push({ tabId, message });

        const response = this.tabResponses.get(message.type);
        if (response === undefined) {
            throw new Error(`No mock response configured for message type: ${message.type}`);
        }

        return response as T;
    }

    async sendToRuntime<T>(message: Message): Promise<T> {
        this.sentToRuntime.push(message);

        const response = this.runtimeResponses.get(message.type);
        if (response === undefined) {
            throw new Error(`No mock response configured for message type: ${message.type}`);
        }

        return response as T;
    }

    onMessage(handler: (msg: Message) => void): void {
        this.handlers.push(handler);
    }

    removeListener(handler: (msg: Message) => void): void {
        const index = this.handlers.indexOf(handler);
        if (index !== -1) {
            this.handlers.splice(index, 1);
        }
    }

    /**
     * Simulate receiving a message (for testing)
     */
    simulateMessage(message: Message): void {
        for (const handler of this.handlers) {
            handler(message);
        }
    }
}

/**
 * Mock tab query implementation for unit tests
 */
export class MockTabQuery implements ITabQuery {
    private activeTab: chrome.tabs.Tab | null = null;
    private tabs: chrome.tabs.Tab[] = [];

    /**
     * Set the active tab for testing
     */
    setActiveTab(tab: chrome.tabs.Tab | null): void {
        this.activeTab = tab;
    }

    /**
     * Set available tabs for testing
     */
    setTabs(tabs: chrome.tabs.Tab[]): void {
        this.tabs = tabs;
    }

    /**
     * Reset all state
     */
    reset(): void {
        this.activeTab = null;
        this.tabs = [];
    }

    async getActiveTab(): Promise<chrome.tabs.Tab | null> {
        return this.activeTab;
    }

    async queryTabs(_query: object): Promise<chrome.tabs.Tab[]> {
        // For simplicity, return all tabs (can be enhanced to filter)
        return this.tabs;
    }
}
