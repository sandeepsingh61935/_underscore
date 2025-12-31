/**
 * @file mock-messaging.ts
 * @description Mock implementation of IMessaging for testing
 */

import { vi } from 'vitest';
import type { IMessaging } from '@/shared/interfaces/i-messaging';

export class MockMessaging implements IMessaging {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private listeners: Set<(message: any, sender: any, sendResponse: any) => void> = new Set();

    // Spies
    sendToTabSpy = vi.fn();
    onMessageSpy = vi.fn();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async sendToTab(tabId: number, message: any): Promise<any> {
        this.sendToTabSpy(tabId, message);
        return Promise.resolve({ success: true, mocked: true });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async sendToRuntime(message: any): Promise<any> {
        return Promise.resolve({ success: true, mocked: true });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onMessage(callback: (message: any, sender: any, sendResponse: any) => void): void {
        this.onMessageSpy(callback);
        this.listeners.add(callback);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    removeListener(callback: (message: any, sender: any, sendResponse: any) => void): void {
        this.listeners.delete(callback);
    }

    // Testing helpers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    simulateMessage(message: any, sender: any = {}, sendResponse: any = () => { }): void {
        for (const listener of this.listeners) {
            listener(message, sender, sendResponse);
        }
    }

    reset(): void {
        this.listeners.clear();
        this.sendToTabSpy.mockClear();
        this.onMessageSpy.mockClear();
    }
}
