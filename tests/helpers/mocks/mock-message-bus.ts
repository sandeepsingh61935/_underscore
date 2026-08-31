/**
 * @file mock-message-bus.ts
 * @description Mock implementation of IMessageBus for testing
 *
 * Per ADR-004, all IPC goes through IMessageBus/ChromeMessageBus. This
 * mock replaces the old MockMessaging (IMessaging is removed).
 */

import { vi } from 'vitest';

import type { IMessageBus } from '@/shared/interfaces/i-message-bus';

export class MockMessageBus implements IMessageBus {
  // Spies
  sendSpy = vi.fn();
  publishSpy = vi.fn();
  subscribeSpy = vi.fn();

  private subscribers = new Map<
    string,
    Set<(payload: unknown, sender: unknown) => unknown | Promise<unknown>>
  >();

  async send<T = unknown>(
    _target: 'background' | 'content' | 'popup',
    message: { type: string; payload?: unknown }
  ): Promise<T> {
    this.sendSpy(message);
    return Promise.resolve({ success: true, mocked: true } as unknown as T);
  }

  subscribe<T = unknown>(
    messageType: string,
    handler: (
      payload: T,
      sender: chrome.runtime.MessageSender
    ) => unknown | Promise<unknown>
  ): () => void {
    this.subscribeSpy(messageType, handler);
    if (!this.subscribers.has(messageType)) {
      this.subscribers.set(messageType, new Set());
    }
    this.subscribers
      .get(messageType)!
      .add(handler as (payload: unknown, sender: unknown) => unknown | Promise<unknown>);
    return () => {
      this.subscribers
        .get(messageType)
        ?.delete(
          handler as (payload: unknown, sender: unknown) => unknown | Promise<unknown>
        );
    };
  }

  async publish(messageType: string, payload: unknown): Promise<void> {
    this.publishSpy(messageType, payload);
  }

  // Testing helpers

  simulateIncoming<T>(messageType: string, payload: T): void {
    const handlers = this.subscribers.get(messageType);
    if (!handlers) return;
    for (const handler of handlers) {
      void handler(payload, {} as chrome.runtime.MessageSender);
    }
  }

  reset(): void {
    this.subscribers.clear();
    this.sendSpy.mockClear();
    this.publishSpy.mockClear();
    this.subscribeSpy.mockClear();
  }
}
