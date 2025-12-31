/**
 * @file chrome-helpers.ts
 * @description Chrome API testing utilities
 * 
 * Provides helpers for simulating Chrome extension APIs in tests
 */

import { vi } from 'vitest';

/**
 * Create a mock chrome.runtime.sendMessage response
 */
export function mockRuntimeMessage<T>(response: T): void {
    // @ts-ignore
    chrome.runtime.sendMessage.mockResolvedValue(response);
}

/**
 * Create a mock chrome.tabs.sendMessage response
 */
export function mockTabMessage<T>(response: T): void {
    // @ts-ignore
    chrome.tabs.sendMessage.mockResolvedValue(response);
}

/**
 * Create a mock chrome.tabs.query result
 */
export function mockTabQuery(tabs: chrome.tabs.Tab[]): void {
    // @ts-ignore
    chrome.tabs.query.mockResolvedValue(tabs);
}

/**
 * Create a mock active tab
 */
export function createMockTab(overrides?: Partial<chrome.tabs.Tab>): chrome.tabs.Tab {
    return {
        id: 1,
        index: 0,
        pinned: false,
        highlighted: false,
        windowId: 1,
        active: true,
        incognito: false,
        selected: true,
        discarded: false,
        autoDiscardable: true,
        groupId: -1,
        url: 'https://example.com',
        title: 'Example Page',
        ...overrides,
    } as unknown as chrome.tabs.Tab;
}

/**
 * Simulate a message being sent from background to content script
 */
export function simulateMessageFromBackground(message: any): void {
    const listeners = (chrome.runtime.onMessage as any).addListener.mock.calls;
    listeners.forEach(([callback]: any) => {
        callback(message, { tab: createMockTab() }, vi.fn());
    });
}

/**
 * Reset all Chrome API mocks
 */
export function resetChromeMocks(): void {
    vi.clearAllMocks();
}

/**
 * Mock chrome.storage.local with in-memory implementation
 */
export class MockChromeStorage {
    private data = new Map<string, any>();

    async get(keys?: string | string[]): Promise<Record<string, any>> {
        if (!keys) {
            return Object.fromEntries(this.data);
        }
        if (typeof keys === 'string') {
            return { [keys]: this.data.get(keys) };
        }
        const result: Record<string, any> = {};
        for (const key of keys) {
            result[key] = this.data.get(key);
        }
        return result;
    }

    async set(items: Record<string, any>): Promise<void> {
        for (const [key, value] of Object.entries(items)) {
            this.data.set(key, value);
        }
    }

    async remove(keys: string | string[]): Promise<void> {
        const keysArray = typeof keys === 'string' ? [keys] : keys;
        for (const key of keysArray) {
            this.data.delete(key);
        }
    }

    async clear(): Promise<void> {
        this.data.clear();
    }

    reset(): void {
        this.data.clear();
    }
}
