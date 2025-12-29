/**
 * @file event-bus.test.ts
 * @description Unit tests for EventBus
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { EventBus } from '@/shared/utils/event-bus';
import { LoggerFactory } from '@/shared/utils/logger';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus(LoggerFactory.getLogger('TestEventBus'));
  });

  describe('on / emit', () => {
    it('should register and emit events', () => {
      const handler = vi.fn();

      eventBus.on('test:event', handler);
      eventBus.emit('test:event', { data: 'value' });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ data: 'value' });
    });

    it('should handle multiple listeners for same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const data = { value: 42 };

      eventBus.on('test', handler1);
      eventBus.on('test', handler2);
      eventBus.emit('test', data);

      expect(handler1).toHaveBeenCalledWith(data);
      expect(handler2).toHaveBeenCalledWith(data);
    });

    it('should not call handlers for different events', () => {
      const handler = vi.fn();

      eventBus.on('event:a', handler);
      eventBus.emit('event:b', { data: 'test' });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('off', () => {
    it('should remove specific listener', () => {
      const handler = vi.fn();

      eventBus.on('test', handler);
      eventBus.off('test', handler);
      eventBus.emit('test', 'data');

      expect(handler).not.toHaveBeenCalled();
    });

    it('should only remove specified handler, not all handlers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('test', handler1);
      eventBus.on('test', handler2);
      eventBus.off('test', handler1);
      eventBus.emit('test', 'data');

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('once', () => {
    it('should only fire handler once', () => {
      const handler = vi.fn();

      eventBus.once('test', handler);
      eventBus.emit('test', 'first');
      eventBus.emit('test', 'second');

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('first');
    });
  });

  describe('clear', () => {
    it('should clear specific event listeners', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('event:a', handler1);
      eventBus.on('event:b', handler2);

      eventBus.clear('event:a');

      eventBus.emit('event:a', 'data');
      eventBus.emit('event:b', 'data');

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should clear all event listeners when no event specified', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('event:a', handler1);
      eventBus.on('event:b', handler2);

      eventBus.clear();

      eventBus.emit('event:a', 'data');
      eventBus.emit('event:b', 'data');

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in handlers gracefully', () => {
      const errorHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      const validHandler = vi.fn();

      eventBus.on('test', errorHandler);
      eventBus.on('test', validHandler);

      // Should not throw
      expect(() => eventBus.emit('test', 'data')).not.toThrow();

      // Valid handler should still be called
      expect(validHandler).toHaveBeenCalled();
    });

    it('should handle async handler errors', async () => {
      const asyncErrorHandler = vi.fn(async () => {
        throw new Error('Async error');
      });

      eventBus.on('test', asyncErrorHandler);

      // Should not throw synchronously
      expect(() => eventBus.emit('test', 'data')).not.toThrow();

      // Wait for async handler
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(asyncErrorHandler).toHaveBeenCalled();
    });
  });

  describe('Utility Methods', () => {
    it('should return listener count', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      expect(eventBus.listenerCount('test')).toBe(0);

      eventBus.on('test', handler1);
      expect(eventBus.listenerCount('test')).toBe(1);

      eventBus.on('test', handler2);
      expect(eventBus.listenerCount('test')).toBe(2);

      eventBus.off('test', handler1);
      expect(eventBus.listenerCount('test')).toBe(1);
    });

    it('should return all event names', () => {
      eventBus.on('event:a', vi.fn());
      eventBus.on('event:b', vi.fn());
      eventBus.on('event:c', vi.fn());

      const names = eventBus.eventNames();

      expect(names).toContain('event:a');
      expect(names).toContain('event:b');
      expect(names).toContain('event:c');
      expect(names).toHaveLength(3);
    });
  });
});
