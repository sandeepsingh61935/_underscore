/**
 * @file logger.test.ts
 * @description Unit tests for logger implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { ConsoleLogger, LogLevel, LoggerFactory } from '@/shared/utils/logger';

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
    it('should log error with stack trace', () => {
      const consoleSpy = vi.spyOn(console, 'error');
      const error = new Error('Test error');

      logger.error('An error occurred', error);

      expect(consoleSpy).toHaveBeenCalledTimes(2); // Once for message, once for stack
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
