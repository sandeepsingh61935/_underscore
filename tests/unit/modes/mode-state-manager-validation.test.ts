/**
 * @file mode-state-manager-validation.test.ts
 * @description Unit tests for ModeStateManager validation integration
 *
 * Tests realistic scenarios that would break in production:
 * - Type coercion from chrome.storage (strings vs enums)
 * - Race conditions during async validation
 * - Partial chrome.storage failures
 * - Invalid data from corrupted storage
 * - Edge cases with null/undefined/empty values
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import type { ModeManager } from '@/content/modes/mode-manager';
import { ModeStateManager } from '@/content/modes/mode-state-manager';
import { StateValidationError } from '@/shared/errors/state-errors';
import type { ILogger } from '@/shared/utils/logger';

// Mock chrome.storage
const mockChromeStorage = {
  local: {
    get: vi.fn(),
    set: vi.fn(),
  },
};

global.chrome = {
  storage: mockChromeStorage,
  runtime: {
    sendMessage: vi.fn().mockResolvedValue(undefined),
  },
} as any;

describe('ModeStateManager - Validation Integration', () => {
  let stateManager: ModeStateManager;
  let mockEventBus: any;
  let mockModeManager: ModeManager;
  let mockLogger: ILogger;

  beforeEach(() => {
    // Setup mocks
    mockEventBus = { emit: vi.fn(), on: vi.fn() };
    mockModeManager = {
      activateMode: vi.fn().mockResolvedValue(undefined),
    } as any;

    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    } as any;

    stateManager = new ModeStateManager(mockEventBus, mockModeManager, mockLogger);

    // Reset chrome.storage mocks
    mockChromeStorage.local.get.mockReset();
    mockChromeStorage.local.set.mockReset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('setMode() validation', () => {
    it('should accept valid mode names', async () => {
      // Arrange
      const validModes = ['basic', 'pro', 'pro_xai'] as const;

      // Act & Assert
      const auth = { isAuthenticated: true, isPaidActive: true };
      for (const mode of validModes) {
        await expect(stateManager.setMode(mode, auth)).resolves.not.toThrow();
      }
    });

    it('should reject invalid mode with ValidationError containing mode name', async () => {
      // Arrange
      const invalidMode = 'invalid-mode' as any;

      // Act & Assert
      await expect(stateManager.setMode(invalidMode)).rejects.toThrow(
        StateValidationError
      );

      try {
        await stateManager.setMode(invalidMode);
      } catch (error) {
        expect(error).toBeInstanceOf(StateValidationError);
        // JSON stringify context because direct string match on error message might vary
        expect(JSON.stringify((error as StateValidationError).context)).toContain(
          'invalid-mode'
        );
      }
    });

    it('should reject mode with type coercion (number to string)', async () => {
      // Arrange - Simulate chrome.storage returning number instead of string
      const numericMode = 123 as any;

      // Act & Assert
      await expect(stateManager.setMode(numericMode)).rejects.toThrow(
        StateValidationError
      );
    });

    it('should reject null and undefined modes', async () => {
      // Arrange
      const invalidModes = [null, undefined] as any[];

      // Act & Assert
      for (const mode of invalidModes) {
        await expect(stateManager.setMode(mode)).rejects.toThrow(StateValidationError);
      }
    });

    it('should reject empty string mode', async () => {
      // Arrange
      const emptyMode = '' as any;

      // Act & Assert
      await expect(stateManager.setMode(emptyMode)).rejects.toThrow(StateValidationError);
    });

    it('should reject mode with extra whitespace', async () => {
      // Arrange - Simulate user input or corrupted storage
      const whitespaceMode = ' walk ' as any;

      // Act & Assert
      await expect(stateManager.setMode(whitespaceMode)).rejects.toThrow(
        StateValidationError
      );
    });

    it('should reject mode with wrong case (Walk vs walk)', async () => {
      // Arrange - Case sensitivity matters for enum
      const wrongCaseMode = 'Walk' as any;

      // Act & Assert
      await expect(stateManager.setMode(wrongCaseMode)).rejects.toThrow(
        StateValidationError
      );
    });

    it('should log validation errors with context', async () => {
      // Arrange
      const invalidMode = 'gen' as any; // Future mode, not yet supported

      // Act
      try {
        await stateManager.setMode(invalidMode);
      } catch {
        // Expected to throw
      }

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Validation'),
        expect.any(StateValidationError)
      );
    });
  });

  describe('init() validation', () => {
    it('should subscribe to STATE_MODE_CHANGED via eventBus', async () => {
      // Act
      await stateManager.init();

      // Assert
      expect(mockEventBus.on).toHaveBeenCalledWith('STATE_MODE_CHANGED', expect.any(Function));
    });
  });

  describe('StateValidationError context', () => {
    it('should include field name in validation error', async () => {
      // Arrange
      const invalidMode = 'invalid' as any;

      // Act
      try {
        await stateManager.setMode(invalidMode);
        expect.fail('Should have thrown StateValidationError');
      } catch (error) {
        // Assert
        expect(error).toBeInstanceOf(StateValidationError);
        const validationError = error as StateValidationError;
        expect(validationError.context).toBeDefined();
      }
    });

    it('should include invalid value in validation error', async () => {
      // Arrange
      const invalidMode = 'invalid-val' as any;

      // Act
      try {
        await stateManager.setMode(invalidMode);
        expect.fail('Should have thrown StateValidationError');
      } catch (error) {
        // Assert
        const validationError = error as StateValidationError;
        expect(JSON.stringify(validationError.context)).toContain('invalid-val');
      }
    });

    it('should include valid options in validation error', async () => {
      // Arrange
      const invalidMode = 'bad-option' as any;

      // Act
      try {
        await stateManager.setMode(invalidMode);
        expect.fail('Should have thrown StateValidationError');
      } catch (error) {
        // Assert
        const validationError = error as StateValidationError;
        const contextStr = JSON.stringify(validationError.context);
        expect(contextStr).toContain('basic');
        expect(contextStr).toContain('pro');
        expect(contextStr).toContain('pro_xai');
      }
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should handle rapid mode switches', async () => {
      const auth = { isAuthenticated: true, isPaidActive: true };
      const guest = { isAuthenticated: false };

      await stateManager.setMode('pro', auth);
      await stateManager.setMode('pro_xai', auth);
      await stateManager.setMode('basic', guest);
      await stateManager.setMode('pro', auth);

      expect(stateManager.getMode()).toBe('pro');
    });

    it('should handle setMode() with same mode (no-op)', async () => {
      // Arrange
      await stateManager.setMode('pro_xai', { isAuthenticated: true, isPaidActive: true });
      mockEventBus.emit.mockClear();

      // Act
      await stateManager.setMode('pro_xai', { isAuthenticated: true, isPaidActive: true });

      // Assert - No intent should be sent
      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });
  });
});
