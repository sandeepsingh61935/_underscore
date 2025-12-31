/**
 * @file command-factory.ts
 * @description Factory for creating commands with resolved dependencies
 *
 * Implements Factory Pattern to:
 * 1. Centralize command instantiation
 * 2. Enforce Dependency Injection (DI)
 * 3. Decouple content.ts from concrete command classes
 */

import { CreateHighlightCommand, RemoveHighlightCommand } from './simple-highlight-commands';

import type { Container } from '@/shared/di/container';
import type { IModeManager } from '@/shared/interfaces/i-mode-manager';
import type { ILogger } from '@/shared/utils/logger';

/**
 * Factory for creating command instances
 * 
 * Handles dependency resolution via the DI container, so consumers
 * (like content.ts) don't need to manually resolve dependencies.
 */
export class CommandFactory {
    /**
     * @param container - DI Container for resolving command dependencies
     */
    constructor(private readonly container: Container) { }

    /**
     * Create a CreateHighlightCommand
     * 
     * @param selection - The user's selection
     * @param colorRole - The semantic color role
     */
    createCreateHighlightCommand(selection: Selection, colorRole: string): CreateHighlightCommand {
        const modeManager = this.container.resolve<IModeManager>('modeManager');
        const logger = this.container.resolve<ILogger>('logger');

        return new CreateHighlightCommand(
            selection,
            colorRole,
            modeManager,
            logger
        );
    }

    /**
     * Create a RemoveHighlightCommand
     * 
     * @param highlightId - ID of the highlight to remove
     */
    createRemoveHighlightCommand(highlightId: string): RemoveHighlightCommand {
        const modeManager = this.container.resolve<IModeManager>('modeManager');
        const logger = this.container.resolve<ILogger>('logger');

        return new RemoveHighlightCommand(
            highlightId,
            modeManager,
            logger
        );
    }
}
