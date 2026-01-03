/**
 * @file command-factory.test.ts
 * @description Unit tests for CommandFactory
 *
 * TDD approach for Task 1.2.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { CommandFactory } from '@/content/commands/command-factory';
import {
  CreateHighlightCommand,
  RemoveHighlightCommand,
} from '@/content/commands/simple-highlight-commands';
import type { Container } from '@/shared/di/container';
import type { IModeManager } from '@/shared/interfaces/i-mode-manager';
import type { ILogger } from '@/shared/utils/logger';

// Mock command classes to verify instantiation
vi.mock('@/content/commands/simple-highlight-commands');

describe('CommandFactory', () => {
  let container: Container;
  let factory: CommandFactory;
  let mockModeManager: IModeManager;
  let mockLogger: ILogger;

  beforeEach(() => {
    // Setup mock dependencies
    mockModeManager = {
      createHighlight: vi.fn(),
      removeHighlight: vi.fn(),
    } as unknown as IModeManager;

    mockLogger = {
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      setLevel: vi.fn(),
      getLevel: vi.fn(),
    } as unknown as ILogger;

    // Setup mock Container
    container = {
      resolve: vi.fn((key: string) => {
        if (key === 'modeManager') return mockModeManager;
        if (key === 'logger') return mockLogger;
        throw new Error(`Service not found: ${key}`);
      }),
    } as unknown as Container;

    factory = new CommandFactory(container);

    // Reset mocks
    vi.clearAllMocks();
  });

  describe('createCreateHighlightCommand', () => {
    it('should resolve dependencies and create command', () => {
      // Arrange
      const selection = {} as Selection;
      const colorRole = 'yellow';

      // Act
      const command = factory.createCreateHighlightCommand(selection, colorRole);

      // Assert
      expect(command).toBeInstanceOf(CreateHighlightCommand);
      expect(container.resolve).toHaveBeenCalledWith('modeManager');
      expect(container.resolve).toHaveBeenCalledWith('logger');
      expect(CreateHighlightCommand).toHaveBeenCalledWith(
        selection,
        colorRole,
        mockModeManager,
        mockLogger
      );
    });
  });

  describe('createRemoveHighlightCommand', () => {
    it('should resolve dependencies and create command', () => {
      // Arrange
      const highlightId = 'test-id';

      // Act
      const command = factory.createRemoveHighlightCommand(highlightId);

      // Assert
      expect(command).toBeInstanceOf(RemoveHighlightCommand);
      expect(container.resolve).toHaveBeenCalledWith('modeManager');
      expect(container.resolve).toHaveBeenCalledWith('logger');
      expect(RemoveHighlightCommand).toHaveBeenCalledWith(
        highlightId,
        mockModeManager,
        mockLogger
      );
    });
  });

  describe('dependency flexibility', () => {
    it('should use whatever instance the container creates (override support)', () => {
      // Arrange: Setup container to return a different mock
      const customModeManager = { name: 'custom' } as unknown as IModeManager;

      // Re-setup mock for this specific test
      (container.resolve as any).mockImplementation((key: string) => {
        if (key === 'modeManager') return customModeManager;
        if (key === 'logger') return mockLogger;
        return null;
      });

      // Act
      factory.createCreateHighlightCommand({} as Selection, 'green');

      // Assert: Command should have been called with our CUSTOM mode manager
      expect(CreateHighlightCommand).toHaveBeenCalledWith(
        expect.anything(),
        'green',
        customModeManager, // The override
        mockLogger
      );
    });
  });
});
