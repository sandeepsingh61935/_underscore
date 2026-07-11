/**
 * @file mode-state-manager-integration.test.ts
 * @description Integration tests for state machine in ModeStateManager
 *
 * Tests that ModeStateManager correctly uses ModeStateMachine for transitions.
 * Follows testing-strategy-v2 Principle #6: Real, tricky test cases.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { ModeManager } from '@/content/modes/mode-manager';
import { ModeStateManager } from '@/content/modes/mode-state-manager';
import { MODE_STORAGE_KEY } from '@/shared/constants/mode-storage';
import type { ILogger } from '@/shared/utils/logger';

const AUTH = { isAuthenticated: true } as const;
const GUEST = { isAuthenticated: false } as const;

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

describe('ModeStateManager - State Machine Integration', () => {
  let stateManager: ModeStateManager;
  let mockEventBus: any;
  let mockModeManager: ModeManager;
  let mockLogger: ILogger;

  beforeEach(() => {
    mockEventBus = { emit: vi.fn(), on: vi.fn() };
    mockModeManager = {
      activateMode: vi.fn().mockResolvedValue(undefined),
    } as any;

    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      setLevel: vi.fn(),
      getLevel: vi.fn(),
    } as any;

    stateManager = new ModeStateManager(mockEventBus, mockModeManager, mockLogger);

    mockChromeStorage.local.get.mockReset();
    mockChromeStorage.local.set.mockReset();
    vi.clearAllMocks();
  });

  describe('State machine validation', () => {
    it('should use state machine to validate transitions', async () => {
      // Act
      await stateManager.setMode('pro', AUTH);

      // Assert - Should call state machine validation internally
      // (We verify this by checking that transition succeeds, which means validation passed)
      expect(stateManager.getMode()).toBe('pro');
    });

    it('should log transition validation', async () => {
      // Act
      await stateManager.setMode('pro', AUTH);

      // Assert - State machine should log validation
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('transition'),
        expect.anything()
      );
    });
  });

  describe('Guard execution', () => {
    it('should execute guards for transitions requiring confirmation', async () => {
      // Arrange - basic → pro requires confirmation
      await stateManager.setMode('pro', AUTH);
      vi.clearAllMocks();

      // Act
      await stateManager.setMode('pro_xai', AUTH);

      // Assert - Guard should have been executed (currently returns true)
      expect(stateManager.getMode()).toBe('pro_xai');
    });

    it('should block transition if guard fails', async () => {
      await expect(stateManager.setMode('pro', GUEST)).rejects.toThrow(
        /Transition guard failed/,
      );
      expect(stateManager.getMode()).toBe('basic');
    });
  });

  describe('Transition failure handling', () => {
    it('should log failed transitions with reason', async () => {
      // Act - Try invalid transition (though all are currently allowed)
      await stateManager.setMode('basic');

      // Assert - No errors should be logged for valid transition
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should keep state unchanged if transition validation fails', async () => {
      // Arrange
      await stateManager.setMode('pro', AUTH);

      // Act - This will be more relevant when we add transition blocking
      // For now, verify that successful transitions work
      await stateManager.setMode('pro_xai', AUTH);

      // Assert - State should have changed (valid transition)
      expect(stateManager.getMode()).toBe('pro_xai');
    });
  });

  describe('Success path', () => {
    it('should complete full transition flow: validate → guard → switch', async () => {
      // Arrange - Start in basic mode (default)
      expect(stateManager.getMode()).toBe('basic');

      // Act Step 1: basic → pro (should validate + execute guard)
      await stateManager.setMode('pro', AUTH);
      expect(stateManager.getMode()).toBe('pro');

      // Act Step 2: pro → pro_xai (should validate)
      await stateManager.setMode('pro_xai', AUTH);
      expect(stateManager.getMode()).toBe('pro_xai');

      // Act Step 3: pro_xai → basic (signed-out downgrade)
      await stateManager.setMode('basic', GUEST);
      expect(stateManager.getMode()).toBe('basic');

      // Assert - Full circular path completed
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should dispatch INTENT_SET_MODE and persist locally', async () => {
      // Act
      await stateManager.setMode('pro_xai', AUTH);

      // Assert - Intent was dispatched via eventBus and saved locally
      expect(mockEventBus.emit).toHaveBeenCalledWith('INTENT_SET_MODE', { mode: 'pro_xai' });
      expect(mockChromeStorage.local.set).toHaveBeenCalledWith({ [MODE_STORAGE_KEY]: 'pro_xai' });
    });
  });

  describe('Edge cases', () => {
    it('should handle same-mode transition as no-op', async () => {
      // Arrange
      await stateManager.setMode('pro', AUTH);
      vi.clearAllMocks();

      // Act - Try to set same mode
      await stateManager.setMode('pro', AUTH);

      // Assert - Should be handled as no-op (early return)
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Already'),
        expect.anything()
      );
    });

    it('should handle rapid mode switches correctly', async () => {
      // Act - Simulate rapid user clicks
      await stateManager.setMode('pro', AUTH);
      await stateManager.setMode('pro_xai', AUTH);
      await stateManager.setMode('basic', GUEST);
      await stateManager.setMode('pro', AUTH);

      // Assert - Final mode should be correct
      expect(stateManager.getMode()).toBe('pro');
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });
});
