/**
 * @file command-factory.test.ts
 * @description Unit tests for CommandFactory
 *
 * TDD approach for Task 1.2.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { CommandFactory } from '@/content/commands/command-factory';
import { CreateHighlightCommand, RemoveHighlightCommand } from '@/content/commands/simple-highlight-commands';
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
            factory.createCreateHighlightCommand(selection, colorRole);

            // Assert
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
            factory.createRemoveHighlightCommand(highlightId);

            // Assert
            expect(container.resolve).toHaveBeenCalledWith('modeManager');
            expect(container.resolve).toHaveBeenCalledWith('logger');
            expect(RemoveHighlightCommand).toHaveBeenCalledWith(
                highlightId,
                mockModeManager,
                mockLogger
            );
        });
    });
});
