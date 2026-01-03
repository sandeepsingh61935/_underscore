/**
 * @file remove-highlight-command.test.ts
 * @description Unit tests for refactored RemoveHighlightCommand
 *
 * Testing Strategy: Follows testing-strategy-v2.md
 * - Pragmatic mocking: Mock IModeManager (external dependency)
 * - Behavior verification: Spy on delegation calls
 * - Test isolation: Reset mocks between tests
 *
 * @see Phase 1.1.3: RemoveHighlightCommand Refactor
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { RemoveHighlightCommand } from '@/content/commands/simple-highlight-commands';
import type {
  IHighlightMode,
  HighlightData,
} from '@/content/modes/highlight-mode.interface';
import type { IModeManager } from '@/shared/interfaces/i-mode-manager';
import type { ILogger } from '@/shared/utils/logger';

/**
 * Test Fixture: Create mock IModeManager
 */
function createMockModeManager() {
  const mockHighlightData: HighlightData = {
    id: 'test-id',
    text: 'test content',
    contentHash: 'hash-123',
    colorRole: 'yellow',
    type: 'underscore',
    ranges: [],
    liveRanges: [],
    createdAt: new Date(),
  };

  const mockMode: IHighlightMode = {
    name: 'sprint',
    capabilities: {
      persistence: 'local',
      undo: false,
      sync: false,
      collections: false,
      tags: false,
      ai: false,
      search: false,
      export: false,
      multiSelector: false,
    },
    createHighlight: vi.fn(),
    removeHighlight: vi.fn().mockResolvedValue(undefined),
    updateHighlight: vi.fn().mockResolvedValue(undefined),
    getHighlight: vi.fn().mockReturnValue(mockHighlightData),
    getAllHighlights: vi.fn().mockReturnValue([]),
    clearAll: vi.fn().mockResolvedValue(undefined),
    createFromData: vi.fn().mockResolvedValue(undefined), // For Undo
    onActivate: vi.fn().mockResolvedValue(undefined),
    onDeactivate: vi.fn().mockResolvedValue(undefined),
    onHighlightCreated: vi.fn().mockResolvedValue(undefined),
    onHighlightRemoved: vi.fn().mockResolvedValue(undefined),
    shouldRestore: vi.fn().mockReturnValue(false),
    getDeletionConfig: () => null,
  };

  const modeManager: IModeManager = {
    registerMode: vi.fn(),
    activateMode: vi.fn(),
    getCurrentMode: vi.fn().mockReturnValue(mockMode),
    createHighlight: vi.fn(),
    removeHighlight: vi.fn().mockResolvedValue(undefined),
    getHighlight: vi.fn().mockReturnValue(mockHighlightData),
  };

  return { modeManager, mockMode, mockHighlightData };
}

/**
 * Test Fixture: Create mock ILogger
 */
function createMockLogger(): ILogger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setLevel: vi.fn(),
    getLevel: vi.fn(),
  };
}

describe('RemoveHighlightCommand', () => {
  let mockModeManager: IModeManager;
  let mockMode: IHighlightMode;
  let mockLogger: ILogger;
  let mockHighlightData: HighlightData;

  beforeEach(() => {
    const mocks = createMockModeManager();
    mockModeManager = mocks.modeManager;
    mockMode = mocks.mockMode;
    mockHighlightData = mocks.mockHighlightData;
    mockLogger = createMockLogger();
  });

  describe('Test 1: Calls modeManager.removeHighlight()', () => {
    it('should delegate highlight removal to modeManager', async () => {
      // Arrange
      const command = new RemoveHighlightCommand('test-id', mockModeManager, mockLogger);

      // Act
      await command.execute();

      // Assert
      expect(mockModeManager.removeHighlight).toHaveBeenCalledTimes(1);
      expect(mockModeManager.removeHighlight).toHaveBeenCalledWith('test-id');
    });
  });

  describe('Test 2: Snapshots data before removal', () => {
    it('should fetch and store highlight data before removing it', async () => {
      // Arrange
      const command = new RemoveHighlightCommand('test-id', mockModeManager, mockLogger);

      // Act
      await command.execute();

      // Assert
      expect(mockModeManager.getHighlight).toHaveBeenCalledWith('test-id');
      // Can't inspect private state directly, but implied by undo test
    });
  });

  describe('Test 3: Helper logging on success', () => {
    it('should log debug message on successful removal', async () => {
      // Arrange
      const command = new RemoveHighlightCommand('test-id', mockModeManager, mockLogger);

      // Act
      await command.execute();

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith('Highlight removed', {
        id: 'test-id',
      });
    });
  });

  describe('Test 4: Skips if highlight not found', () => {
    it('should warn and exit if highlight ID invalid', async () => {
      // Arrange: Mock not found
      (mockModeManager.getHighlight as ReturnType<typeof vi.fn>).mockReturnValue(null);

      const command = new RemoveHighlightCommand(
        'missing-id',
        mockModeManager,
        mockLogger
      );

      // Act
      await command.execute();

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Cannot remove: Highlight not found',
        expect.any(Object)
      );
      expect(mockModeManager.removeHighlight).not.toHaveBeenCalled();
    });
  });

  describe('Test 5: Error handling during execution', () => {
    it('should catch error, log it, and rethrow', async () => {
      // Arrange
      const error = new Error('Deletion failed');
      (mockModeManager.removeHighlight as ReturnType<typeof vi.fn>).mockRejectedValue(
        error
      );

      const command = new RemoveHighlightCommand('test-id', mockModeManager, mockLogger);

      // Act & Assert
      await expect(command.execute()).rejects.toThrow('Deletion failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Remove command failed',
        error,
        expect.any(Object)
      );
    });
  });

  describe('Test 6: Undo calls mode.createFromData()', () => {
    it('should restore highlight using mode.createFromData on undo', async () => {
      // Arrange
      const command = new RemoveHighlightCommand('test-id', mockModeManager, mockLogger);
      await command.execute(); // Captures snapshot

      // Act
      await command.undo();

      // Assert - Should use current mode to restore
      expect(mockMode.createFromData).toHaveBeenCalledTimes(1);
      expect(mockMode.createFromData).toHaveBeenCalledWith(mockHighlightData);
    });
  });

  describe('Test 7: Fail undo if no snapshot', () => {
    it('should log warning if undo called before execute', async () => {
      // Arrange
      const command = new RemoveHighlightCommand('test-id', mockModeManager, mockLogger);

      // Act: Undo straight away
      await command.undo();

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith('Cannot undo: No snapshot stored');
      expect(mockMode.createFromData).not.toHaveBeenCalled();
    });
  });

  describe('Test 8: Error handling during undo', () => {
    it('should catch error during restoration and log it', async () => {
      // Arrange
      const command = new RemoveHighlightCommand('test-id', mockModeManager, mockLogger);
      await command.execute();

      const error = new Error('Restore failed');
      (mockMode.createFromData as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      // Act & Assert
      await expect(command.undo()).rejects.toThrow('Restore failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Undo remove failed',
        error,
        expect.any(Object)
      );
    });
  });

  describe('Test 9: Multiple Redo Cycles', () => {
    it('should support execute -> undo -> execute sequence', async () => {
      // Arrange
      const command = new RemoveHighlightCommand('test-id', mockModeManager, mockLogger);

      // Act
      await command.execute(); // Remove
      await command.undo(); // Restore
      await command.execute(); // Redo Remove

      // Assert
      expect(mockModeManager.removeHighlight).toHaveBeenCalledTimes(2);
    });
  });

  describe('Test 10: Performance', () => {
    it('should likely be under 50ms', async () => {
      const command = new RemoveHighlightCommand('test-id', mockModeManager, mockLogger);
      const start = performance.now();
      await command.execute();
      const end = performance.now();
      expect(end - start).toBeLessThan(50);
    });
  });
});
