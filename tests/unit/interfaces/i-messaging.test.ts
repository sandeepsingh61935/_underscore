/**
 * IMessaging Interface Tests (5 tests)
 *
 * Verifies MockMessaging implements IMessaging correctly
 * These tests prove the mock works for unit testing
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import type { Message } from '@/shared/interfaces/i-messaging';
import { MockMessaging } from '@/shared/services/mock-messaging';

describe('IMessaging Interface (5 tests)', () => {
  let messaging: MockMessaging;

  beforeEach(() => {
    messaging = new MockMessaging();
  });

  it('1. MockMessaging implements IMessaging', () => {
    // Assert: Has all required methods
    expect(typeof messaging.sendToTab).toBe('function');
    expect(typeof messaging.sendToRuntime).toBe('function');
    expect(typeof messaging.onMessage).toBe('function');
    expect(typeof messaging.removeListener).toBe('function');
  });

  it('2. can sendToTab() and get canned response', async () => {
    // Arrange
    const testResponse = { success: true, data: 'test' };
    messaging.setTabResponse('TEST_MESSAGE', testResponse);

    const message: Message = {
      type: 'TEST_MESSAGE',
      payload: { foo: 'bar' },
    };

    // Act
    const response = await messaging.sendToTab(123, message);

    // Assert
    expect(response).toEqual(testResponse);
    expect(messaging.sentToTab).toHaveLength(1);
    expect(messaging.sentToTab[0]?.tabId).toBe(123);
    expect(messaging.sentToTab[0]?.message.type).toBe('TEST_MESSAGE');
  });

  it('3. onMessage() registers handler', () => {
    // Arrange
    const handler = vi.fn();

    // Act
    messaging.onMessage(handler);
    messaging.simulateMessage({ type: 'TEST', payload: {} });

    // Assert
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ type: 'TEST', payload: {} });
  });

  it('4. removeListener() unregisters', () => {
    // Arrange
    const handler = vi.fn();
    messaging.onMessage(handler);

    // Act: Remove listener
    messaging.removeListener(handler);
    messaging.simulateMessage({ type: 'TEST', payload: {} });

    // Assert: Handler not called after removal
    expect(handler).not.toHaveBeenCalled();
  });

  it('5. throws when no response configured', async () => {
    // Arrange: No response configured
    const message: Message = { type: 'UNCONFIGURED', payload: {} };

    // Act & Assert
    await expect(messaging.sendToTab(123, message)).rejects.toThrow(
      /no mock response configured/i
    );
  });
});
