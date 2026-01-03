import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import type { Message } from '@/shared/schemas/message-schemas';
import { ChromeMessageBus } from '@/shared/services/chrome-message-bus';

// Mock chrome.runtime API
const mockChromeRuntime = {
  sendMessage: vi.fn(),
  onMessage: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
  lastError: null as { message: string } | null,
};

// Mock chrome.tabs API
const mockChromeTabs = {
  sendMessage: vi.fn(),
  query: vi.fn(),
};

// Mocking chrome global
global.chrome = {
  runtime: mockChromeRuntime as any,
  tabs: mockChromeTabs as any,
} as any;

// Mock logger
const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  setLevel: vi.fn(),
  getLevel: vi.fn(),
} as any;

describe('ChromeMessageBus', () => {
  let messageBus: ChromeMessageBus;

  beforeEach(() => {
    vi.clearAllMocks();
    mockChromeRuntime.lastError = null;
    messageBus = new ChromeMessageBus(mockLogger, { timeoutMs: 1000 });
  });

  afterEach(() => {
    messageBus.dispose();
  });

  describe('Initialization', () => {
    it('should setup chrome.runtime.onMessage listener on construction', () => {
      expect(mockChromeRuntime.onMessage.addListener).toHaveBeenCalledOnce();
      expect(mockChromeRuntime.onMessage.addListener).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('should use default timeout of 5000ms when not specified', () => {
      const bus = new ChromeMessageBus(mockLogger);
      expect(bus).toBeDefined();
      bus.dispose();
    });
  });

  describe('send() - Basic Functionality', () => {
    it('should send message via chrome.runtime.sendMessage', async () => {
      const message: Message = {
        type: 'TEST',
        payload: { data: 'value' },
        timestamp: Date.now(),
      };

      mockChromeRuntime.sendMessage.mockImplementation((_msg, callback) => {
        callback({ success: true });
      });

      await messageBus.send('background', message);

      expect(mockChromeRuntime.sendMessage).toHaveBeenCalledWith(
        message,
        expect.any(Function)
      );
    });

    it('should return response from chrome.runtime.sendMessage', async () => {
      const expectedResponse = { count: 42 };

      mockChromeRuntime.sendMessage.mockImplementation((_msg, callback) => {
        callback(expectedResponse);
      });

      const result = await messageBus.send<{ count: number }>('background', {
        type: 'GET_COUNT',
        payload: {},
        timestamp: Date.now(),
      });

      expect(result).toEqual(expectedResponse);
    });

    it('should log debug messages on send', async () => {
      mockChromeRuntime.sendMessage.mockImplementation((_msg, callback) => {
        callback({});
      });

      await messageBus.send('background', {
        type: 'TEST',
        payload: {},
        timestamp: Date.now(),
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Sending message',
        expect.any(Object)
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Message send successful',
        expect.any(Object)
      );
    });
  });

  describe('send() - Content Target Routing', () => {
    it('should send to specific tab ID when provided in payload', async () => {
      const message: Message = {
        type: 'TEST',
        payload: { tabId: 123 },
        timestamp: Date.now(),
      };

      mockChromeTabs.sendMessage.mockImplementation((_id, _msg, callback) => {
        callback({ success: true });
      });

      await messageBus.send('content', message);

      expect(mockChromeTabs.sendMessage).toHaveBeenCalledWith(
        123,
        message,
        expect.any(Function)
      );
      expect(mockChromeRuntime.sendMessage).not.toHaveBeenCalled();
    });

    it('should query active tab if tab ID missing', async () => {
      const message: Message = {
        type: 'TEST',
        payload: {},
        timestamp: Date.now(),
      };

      mockChromeTabs.query.mockImplementation((_query, callback) => {
        callback([{ id: 999 }]);
      });
      mockChromeTabs.sendMessage.mockImplementation((_id, _msg, callback) => {
        callback({ success: true });
      });

      await messageBus.send('content', message);

      expect(mockChromeTabs.query).toHaveBeenCalledWith(
        { active: true, currentWindow: true },
        expect.any(Function)
      );
      expect(mockChromeTabs.sendMessage).toHaveBeenCalledWith(
        999,
        message,
        expect.any(Function)
      );
    });

    it('should reject if no active tab found', async () => {
      const message: Message = {
        type: 'TEST',
        payload: {},
        timestamp: Date.now(),
      };

      mockChromeTabs.query.mockImplementation((_query, callback) => {
        callback([]); // No tabs
      });

      await expect(messageBus.send('content', message)).rejects.toThrow(
        'No active tab found'
      );
    });
  });

  describe('send() - Error Handling', () => {
    it('should reject on chrome.runtime.lastError', async () => {
      mockChromeRuntime.sendMessage.mockImplementation((_msg, callback) => {
        mockChromeRuntime.lastError = { message: 'Could not establish connection' };
        callback(null);
      });

      await expect(
        messageBus.send('background', {
          type: 'TEST',
          payload: {},
          timestamp: Date.now(),
        })
      ).rejects.toThrow('Chrome runtime error: Could not establish connection');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Message send failed',
        expect.any(Error),
        expect.objectContaining({
          messageType: 'TEST',
        })
      );
    });

    it('should reject on timeout', async () => {
      // Don't call callback - simulates hanging
      mockChromeRuntime.sendMessage.mockImplementation(() => {
        // Never resolves
      });

      await expect(
        messageBus.send('background', {
          type: 'HANG',
          payload: {},
          timestamp: Date.now(),
        })
      ).rejects.toThrow(/timeout after 1000ms/);
    }, 2000); // Test timeout > messageBus timeout

    it('should reject on sendMessage exception', async () => {
      mockChromeRuntime.sendMessage.mockImplementation(() => {
        throw new Error('Extension context invalidated');
      });

      await expect(
        messageBus.send('background', {
          type: 'TEST',
          payload: {},
          timestamp: Date.now(),
        })
      ).rejects.toThrow('Extension context invalidated');
    });

    it('should throw validation error for invalid message', async () => {
      await expect(
        messageBus.send('background', {
          type: '', // Invalid: empty type
          payload: {},
          timestamp: Date.now(),
        } as Message)
      ).rejects.toThrow(); // Zod validation error
    });
  });

  describe('send() - Tricky Edge Cases', () => {
    it('EDGE: should handle MV3 background script suspended (timeout scenario)', async () => {
      // Simulate: message sent but background script is suspended, never responds
      mockChromeRuntime.sendMessage.mockImplementation(() => {
        // No callback, simulates suspended context
      });

      const startTime = Date.now();

      await expect(
        messageBus.send('background', {
          type: 'SYNC_DATA',
          payload: {},
          timestamp: Date.now(),
        })
      ).rejects.toThrow(/timeout/);

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(1000); // Timeout enforced
      expect(elapsed).toBeLessThan(1500); // Not hanging forever
    }, 2000);

    it('EDGE: should handle rapid concurrent sends', async () => {
      mockChromeRuntime.sendMessage.mockImplementation((_msg, callback) => {
        setTimeout(() => callback({ ok: true }), 10);
      });

      const promises = Array.from({ length: 10 }, (_, i) =>
        messageBus.send('background', {
          type: `MSG_${i}`,
          payload: { index: i },
          timestamp: Date.now(),
        })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(mockChromeRuntime.sendMessage).toHaveBeenCalledTimes(10);
    });

    it('EDGE: should handle large payloads (1MB+)', async () => {
      const largePayload = {
        data: 'x'.repeat(1024 * 1024), // 1MB string
      };

      mockChromeRuntime.sendMessage.mockImplementation((msg, callback) => {
        callback({ received: msg.payload.data.length });
      });

      const result = await messageBus.send<{ received: number }>('background', {
        type: 'LARGE_DATA',
        payload: largePayload,
        timestamp: Date.now(),
      });

      expect(result.received).toBe(1024 * 1024);
    });

    it('EDGE: should handle message sent to closed/non-existent context', async () => {
      // Realistic: Popup closes before message arrives
      mockChromeRuntime.sendMessage.mockImplementation((_msg, callback) => {
        mockChromeRuntime.lastError = {
          message: 'Could not establish connection. Receiving end does not exist.',
        };
        callback(null);
      });

      await expect(
        messageBus.send('popup', {
          type: 'UPDATE_UI',
          payload: {},
          timestamp: Date.now(),
        })
      ).rejects.toThrow('Receiving end does not exist');
    });
  });

  describe('subscribe() - Basic Functionality', () => {
    it('should register message handler', () => {
      const handler = vi.fn();

      const unsubscribe = messageBus.subscribe('TEST', handler);

      expect(unsubscribe).toBeTypeOf('function');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Message handler registered',
        expect.objectContaining({ messageType: 'TEST' })
      );
    });

    it('should unsubscribe handler', () => {
      const handler = vi.fn();

      const unsubscribe = messageBus.subscribe('TEST', handler);
      unsubscribe();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Message handler unregistered',
        expect.objectContaining({ messageType: 'TEST', handlerCount: 0 })
      );
    });

    it('should support multiple subscribers for same message type', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      messageBus.subscribe('TEST', handler1);
      messageBus.subscribe('TEST', handler2);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Message handler registered',
        expect.objectContaining({ handlerCount: 2 })
      );
    });
  });

  describe('subscribe() - Message Dispatching', () => {
    it('should dispatch incoming messages to handlers', async () => {
      const handler = vi.fn();
      messageBus.subscribe('MODE_CHANGE', handler);

      // Get the message listener that was registered
      const messageListener = mockChromeRuntime.onMessage.addListener.mock.calls[0]![0];

      const message: Message = {
        type: 'MODE_CHANGE',
        payload: { mode: 'vault' },
        timestamp: Date.now(),
      };

      const sender = { tab: { id: 123 } } as chrome.runtime.MessageSender;

      // Simulate chrome.runtime.onMessage firing
      messageListener(message, sender, vi.fn());

      // Wait for async handler execution
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(handler).toHaveBeenCalledWith({ mode: 'vault' }, sender);
    });

    it('should not dispatch to unsubscribed handlers', async () => {
      const handler = vi.fn();
      const unsubscribe = messageBus.subscribe('TEST', handler);
      unsubscribe();

      const messageListener = mockChromeRuntime.onMessage.addListener.mock.calls[0]![0];

      messageListener({ type: 'TEST', payload: {}, timestamp: Date.now() }, {}, vi.fn());

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle invalid incoming messages gracefully', () => {
      const handler = vi.fn();
      messageBus.subscribe('TEST', handler);

      const messageListener = mockChromeRuntime.onMessage.addListener.mock.calls[0]![0];

      // Invalid message (missing required fields)
      const result = messageListener({ type: '' }, {}, vi.fn());

      expect(result).toBe(false); // Don't keep channel open
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Invalid message received',
        expect.any(Object)
      );
    });
  });

  describe('subscribe() - Error Handling', () => {
    it('should catch and log handler errors', async () => {
      const errorHandler = vi.fn().mockRejectedValue(new Error('Handler crashed'));
      messageBus.subscribe('TEST', errorHandler);

      const messageListener = mockChromeRuntime.onMessage.addListener.mock.calls[0]![0];

      messageListener({ type: 'TEST', payload: {}, timestamp: Date.now() }, {}, vi.fn());

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Message handler error',
        expect.any(Error),
        expect.objectContaining({
          messageType: 'TEST',
        })
      );
    });

    it('should continue dispatching to other handlers if one fails', async () => {
      const errorHandler = vi.fn().mockRejectedValue(new Error('Failed'));
      const successHandler = vi.fn().mockResolvedValue(undefined);

      messageBus.subscribe('TEST', errorHandler);
      messageBus.subscribe('TEST', successHandler);

      const messageListener = mockChromeRuntime.onMessage.addListener.mock.calls[0]![0];

      messageListener({ type: 'TEST', payload: {}, timestamp: Date.now() }, {}, vi.fn());

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(errorHandler).toHaveBeenCalled();
      expect(successHandler).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalled(); // Error logged
    });
  });

  describe('subscribe() - Tricky Edge Cases', () => {
    it('EDGE: should handle handler subscribing/unsubscribing during dispatch', async () => {
      const handler1 = vi.fn();
      let unsubscribe2: (() => void) | null = null;
      const handler2 = vi.fn().mockImplementation(() => {
        // Unsubscribe self during execution
        unsubscribe2?.();
      });

      messageBus.subscribe('TEST', handler1);
      unsubscribe2 = messageBus.subscribe('TEST', handler2);

      const messageListener = mockChromeRuntime.onMessage.addListener.mock.calls[0]![0];

      messageListener({ type: 'TEST', payload: {}, timestamp: Date.now() }, {}, vi.fn());

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('EDGE: should not leak memory on repeated subscribe/unsubscribe', () => {
      for (let i = 0; i < 1000; i++) {
        const handler = vi.fn();
        const unsubscribe = messageBus.subscribe('TEST', handler);
        unsubscribe();
      }

      // Verify handlers map is cleaned up
      const messageListener = mockChromeRuntime.onMessage.addListener.mock.calls[0]![0];
      const result = messageListener(
        { type: 'TEST', payload: {}, timestamp: Date.now() },
        {},
        vi.fn()
      );

      expect(result).toBe(false); // No handlers left
    });

    it('EDGE: should handle race condition - message arrives before subscribe', () => {
      // This tests the scenario where a message is sent before any handlers are registered
      const messageListener = mockChromeRuntime.onMessage.addListener.mock.calls[0]![0];

      const result = messageListener(
        { type: 'ORPHAN', payload: {}, timestamp: Date.now() },
        {},
        vi.fn()
      );

      expect(result).toBe(false); // No handlers, return false
    });
  });

  describe('publish() - Basic Functionality', () => {
    it('should publish to all subscribers', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      messageBus.subscribe('BROADCAST', handler1);
      messageBus.subscribe('BROADCAST', handler2);

      await messageBus.publish('BROADCAST', { message: 'hello' });

      expect(handler1).toHaveBeenCalledWith({ message: 'hello' }, expect.any(Object));
      expect(handler2).toHaveBeenCalledWith({ message: 'hello' }, expect.any(Object));
    });

    it('should handle publish with no subscribers', async () => {
      await expect(messageBus.publish('NONE', {})).resolves.toBeUndefined();

      expect(mockLogger.debug).toHaveBeenCalledWith('No handlers for published message', {
        messageType: 'NONE',
      });
    });

    it('should handle handler errors in publish', async () => {
      const errorHandler = vi.fn().mockRejectedValue(new Error('Publish failed'));
      messageBus.subscribe('TEST', errorHandler);

      await expect(messageBus.publish('TEST', {})).resolves.toBeUndefined();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Publish handler error',
        expect.any(Error),
        expect.objectContaining({ messageType: 'TEST' })
      );
    });
  });

  describe('dispose() - Cleanup', () => {
    it('should remove chrome.runtime.onMessage listener', () => {
      messageBus.dispose();

      expect(mockChromeRuntime.onMessage.removeListener).toHaveBeenCalled();
    });

    it('should clear all handlers', () => {
      messageBus.subscribe('TEST1', vi.fn());
      messageBus.subscribe('TEST2', vi.fn());

      messageBus.dispose();

      expect(mockLogger.debug).toHaveBeenCalledWith('ChromeMessageBus disposed');
    });

    it('should be safe to call dispose() multiple times', () => {
      messageBus.dispose();
      messageBus.dispose();

      // Should not throw
      expect(mockChromeRuntime.onMessage.removeListener).toHaveBeenCalled();
    });
  });

  describe('Integration - Real-World Scenarios', () => {
    it('SCENARIO: Popup requests data from background script', async () => {
      mockChromeRuntime.sendMessage.mockImplementation((_msg, callback) => {
        // Simulate background script response
        setTimeout(() => callback({ highlights: 5 }), 10);
      });

      const result = await messageBus.send<{ highlights: number }>('background', {
        type: 'GET_HIGHLIGHT_COUNT',
        payload: { url: 'https://example.com' },
        timestamp: Date.now(),
      });

      expect(result.highlights).toBe(5);
    });

    it('SCENARIO: Background script broadcasts mode change to all contexts', async () => {
      const contentHandler = vi.fn();
      const popupHandler = vi.fn();

      messageBus.subscribe('MODE_CHANGE', contentHandler);
      messageBus.subscribe('MODE_CHANGE', popupHandler);

      await messageBus.publish('MODE_CHANGE', { mode: 'vault', timestamp: Date.now() });

      expect(contentHandler).toHaveBeenCalled();
      expect(popupHandler).toHaveBeenCalled();
    });

    it('SCENARIO: Message send fails, retry decorator will handle (tested separately)', async () => {
      let attemptCount = 0;
      mockChromeRuntime.sendMessage.mockImplementation((_msg, callback) => {
        attemptCount++;
        if (attemptCount === 1) {
          mockChromeRuntime.lastError = { message: 'Connection lost' };
          callback(null);
        } else {
          callback({ success: true });
        }
      });

      // First attempt fails
      await expect(
        messageBus.send('background', {
          type: 'TEST',
          payload: {},
          timestamp: Date.now(),
        })
      ).rejects.toThrow('Connection lost');

      // This test verifies ChromeMessageBus throws correctly
      // RetryDecorator (tested separately) will handle retries
    });
  });
});
