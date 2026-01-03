/**
 * @file state-error-recovery.test.ts
 * @description Integration tests for ModeStateManager error recovery and resilience
 * Verifies that the system recovers gracefully from:
 * 1. Storage failures (Circuit Breaker)
 * 2. Validation errors (Zod)
 * 3. Migration failures
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { ModeManager } from '@/content/modes/mode-manager';
import { ModeStateManager } from '@/content/modes/mode-state-manager';
import { EventBus } from '@/shared/utils/event-bus';
import { ConsoleLogger } from '@/shared/utils/logger';

describe('ModeStateManager Error Recovery & Resilience', () => {
  let modeStateManager: ModeStateManager;
  let modeManager: ModeManager;
  let eventBus: EventBus;
  let logger: ConsoleLogger;

  // Mock chrome.storage.sync
  const storageMock = {
    get: vi.fn(),
    set: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.chrome = {
      storage: {
        sync: storageMock,
      },
      runtime: {
        id: 'test-extension-id',
        sendMessage: vi.fn().mockResolvedValue(undefined),
      },
    } as any;

    eventBus = new EventBus();
    logger = new ConsoleLogger('TestLogger');

    // Mock logger to suppress error noise in tests
    vi.spyOn(logger, 'error').mockImplementation(() => {});
    vi.spyOn(logger, 'warn').mockImplementation(() => {});

    modeManager = new ModeManager(eventBus, logger);

    // Register mock modes
    ['walk', 'sprint', 'vault'].forEach((mode) => {
      modeManager.registerMode({
        name: mode as any,
        capabilities: {} as any,
        onActivate: vi.fn().mockResolvedValue(undefined),
        onDeactivate: vi.fn().mockResolvedValue(undefined),
        // Cast to any to satisfy strict interface without implementing everything
      } as any);
    });

    modeStateManager = new ModeStateManager(modeManager, logger);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Storage Failure Recovery (Circuit Breaker Integration)', () => {
    it('should open circuit breaker after repeated storage failures and fall back to in-memory state', async () => {
      // Arrange
      const quotaError = new Error('QuotaExceededError');
      storageMock.get.mockResolvedValue({}); // Init success
      storageMock.set.mockRejectedValue(quotaError); // Set fails

      await modeStateManager.init();

      // Act - Trigger 3 failures
      await modeStateManager.setMode('sprint'); // Failure 1
      expect(modeStateManager.getMode()).toBe('sprint'); // In-memory update should still work!

      await modeStateManager.setMode('vault'); // Failure 2 (Changed from bike)
      expect(modeStateManager.getMode()).toBe('vault');

      await modeStateManager.setMode('walk'); // Failure 3
      expect(modeStateManager.getMode()).toBe('walk');

      // Assert - Circuit should be OPEN now
      // Next call should NOT attempt storage write
      storageMock.set.mockClear();

      await modeStateManager.setMode('sprint');

      // Should still update memory
      expect(modeStateManager.getMode()).toBe('sprint');

      // Should NOT call storage
      expect(storageMock.set).not.toHaveBeenCalled();

      // Should verify log warning
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Circuit breaker open'),
        expect.any(Object)
      );
    });

    it('should handle offline network errors gracefully during init', async () => {
      // Arrange
      storageMock.get.mockRejectedValue(new Error('ERR_NETWORK_CHANGED'));

      // Act
      await modeStateManager.init();

      // Assert
      // Should fall back to default 'walk' mode
      expect(modeStateManager.getMode()).toBe('walk');

      // Should log error
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize mode state'),
        expect.any(Object)
      );
    });
  });

  describe('2. Validation Error Recovery', () => {
    it('should fallback to default mode when storage contains invalid mode', async () => {
      // Arrange
      storageMock.get.mockResolvedValue({
        defaultMode: 'invalid_mode_value',
        metadata: { version: 2, lastModified: Date.now() },
      });

      // Act
      await modeStateManager.init();

      // Assert
      expect(modeStateManager.getMode()).toBe('walk'); // Fallback
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid mode in storage'),
        expect.any(Object)
      );
    });

    it('should repair metadata if invalid but keep valid mode', async () => {
      // Arrange
      storageMock.get.mockResolvedValue({
        defaultMode: 'sprint',
        metadata: {
          version: 2, // Valid version to bypass migration
          lastModified: 'not_a_number', // Invalid type to trigger Zod error
        },
      });

      // Act
      await modeStateManager.init();

      // Assert
      expect(modeStateManager.getMode()).toBe('sprint'); // Mode preserved
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid metadata in storage'),
        expect.any(Object)
      );
    });
  });

  describe('3. Migration Error Recovery', () => {
    it('should fallback to default if migration fails', async () => {
      // Arrange
      // v1 state triggers migration
      storageMock.get.mockResolvedValue({ defaultMode: 'sprint' });

      // Mock migration engine to fail
      // We need to access private property or mock the dependency.
      // Since we can't easily mock private property in integration test without cast,
      // we'll rely on simulating a broken migration state if possible, or cast to any.

      const engine = (modeStateManager as any).migrationEngine;
      vi.spyOn(engine, 'migrate').mockResolvedValue({
        success: false,
        error: new Error('Migration Logic Failed'),
      });

      // Act
      await modeStateManager.init();

      // Assert
      expect(modeStateManager.getMode()).toBe('walk'); // Fallback
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Migration failed'),
        expect.any(Object)
      );
    });
  });
});
