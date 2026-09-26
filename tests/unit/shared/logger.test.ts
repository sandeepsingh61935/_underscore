/**
 * @file logger.test.ts
 * @description Unit tests for logger implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  ConsoleLogger,
  LogLevel,
  LoggerFactory,
  sanitizeForConsole,
} from '@/shared/utils/logger';

describe('ConsoleLogger', () => {
  let logger: ConsoleLogger;

  beforeEach(() => {
    logger = new ConsoleLogger('TestLogger', LogLevel.DEBUG);
    vi.clearAllMocks();
  });

  describe('debug', () => {
    it('should log debug messages when level is DEBUG', () => {
      const consoleSpy = vi.spyOn(console, 'debug');

      logger.debug('Test debug message');

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should not log debug messages when level is INFO', () => {
      logger.setLevel(LogLevel.INFO);
      const consoleSpy = vi.spyOn(console, 'debug');

      logger.debug('Test debug message');

      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('info', () => {
    it('should log info messages', () => {
      const consoleSpy = vi.spyOn(console, 'info');

      logger.info('Test info message');

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should include metadata in log', () => {
      const consoleSpy = vi.spyOn(console, 'info');
      const metadata = { userId: '123' };

      logger.info('User action', metadata);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('User action'),
        metadata
      );
    });
  });

  describe('error', () => {
    it('should log error without full Error object (sanitized to name/message/code)', () => {
      const consoleSpy = vi.spyOn(console, 'error');
      const error = new Error('Test error');

      logger.error('An error occurred', error);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('An error occurred'),
        expect.objectContaining({ name: 'Error', message: 'Test error' })
      );
      // Full Error instance (with stack) must never reach the console args.
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.anything(), error);
    });
  });

  describe('sanitizeForConsole', () => {
    it('redacts secrets, tokens, emails and user content', () => {
      const [out] = sanitizeForConsole([
        {
          userId: 'user-1',
          email: 'a@b.com',
          password: 'hunter2',
          access_token: 'tok',
          refresh_token: 'rtok',
          'x-llm-api-key': 'sk-x',
          text: 'highlight text',
          url: 'https://example.com/page?q=1',
        },
      ]) as Array<Record<string, unknown>>;
      if (!out) throw new Error('expected sanitized output');

      expect(out['userId']).toBe('user-1');
      expect(out['email']).toBe('[redacted]');
      expect(out['password']).toBe('[redacted]');
      expect(out['access_token']).toBe('[redacted]');
      expect(out['refresh_token']).toBe('[redacted]');
      expect(out['x-llm-api-key']).toBe('[redacted]');
      expect(out['text']).toBe('[redacted]');
      expect(out['url']).toBe('https://example.com');
    });

    it('shrinks Error instances to name/message/code', () => {
      const err = Object.assign(new Error('boom'), { code: 'AUTH_ERROR' });
      const [out] = sanitizeForConsole([err]) as Array<Record<string, unknown>>;
      expect(out).toEqual({ name: 'Error', message: 'boom', code: 'AUTH_ERROR' });
    });
  });

  describe('setLevel', () => {
    it('should update log level', () => {
      logger.setLevel(LogLevel.ERROR);

      expect(logger.getLevel()).toBe(LogLevel.ERROR);
    });
  });
});

describe('LoggerFactory', () => {
  beforeEach(() => {
    LoggerFactory.clearLoggers();
  });

  it('should create logger for namespace', () => {
    const logger = LoggerFactory.getLogger('TestNamespace');

    expect(logger).toBeDefined();
  });

  it('should return same logger for same namespace', () => {
    const logger1 = LoggerFactory.getLogger('TestNamespace');
    const logger2 = LoggerFactory.getLogger('TestNamespace');

    expect(logger1).toBe(logger2);
  });

  it('should set global log level', () => {
    const logger = LoggerFactory.getLogger('TestNamespace');

    LoggerFactory.setGlobalLevel(LogLevel.ERROR);

    expect(logger.getLevel()).toBe(LogLevel.ERROR);
  });
});
