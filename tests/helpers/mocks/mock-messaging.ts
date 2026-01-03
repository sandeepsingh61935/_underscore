/**
 * @file mock-messaging.ts
 * @description Mock implementation of IMessaging for testing
 */

import { vi } from 'vitest';

import type { IMessaging } from '@/shared/interfaces/i-messaging';

export class MockMessaging implements IMessaging {
  private listeners: Set<(message: any, sender: any, sendResponse: any) => void> =
    new Set();

  // Spies
  sendToTabSpy = vi.fn();
  onMessageSpy = vi.fn();

  async sendToTab(tabId: number, message: any): Promise<any> {
    this.sendToTabSpy(tabId, message);
    return Promise.resolve({ success: true, mocked: true });
  }

  async sendToRuntime(_message: any): Promise<any> {
    return Promise.resolve({ success: true, mocked: true });
  }

  onMessage(callback: (message: any, sender: any, sendResponse: any) => void): void {
    this.onMessageSpy(callback);
    this.listeners.add(callback);
  }

  removeListener(callback: (message: any, sender: any, sendResponse: any) => void): void {
    this.listeners.delete(callback);
  }

  // Testing helpers

  simulateMessage(message: any, sender: any = {}, sendResponse: any = () => {}): void {
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
