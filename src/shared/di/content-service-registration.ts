/**
 * @file content-service-registration.ts
 * @description Service registration for content scripts (browser context)
 *
 * Registers services that are ONLY available in content script context:
 * - Mode Manager
 * - Highlight Modes (Walk, Sprint, Vault)
 * - Command Factory
 *
 * These services use DOM APIs (document, CSS.highlights) which are NOT available
 * in Service Worker context. DO NOT import this file in background scripts.
 */

import type { Container } from './container';
import { registerBaseServices } from './base-service-registration';
import { CommandFactory } from '@/content/commands/command-factory';
import type { IHighlightMode } from '@/content/modes/highlight-mode.interface';
import { ModeManager } from '@/content/modes/mode-manager';
import { SprintMode } from '@/content/modes/sprint-mode';
import { VaultMode } from '@/content/modes/vault-mode';
import { WalkMode } from '@/content/modes/walk-mode';
import type { IModeManager } from '@/shared/interfaces/i-mode-manager';
import type { IStorage } from '@/shared/interfaces/i-storage';
import type { RepositoryFacade } from '@/shared/repositories/repository-facade';
import type { EventBus } from '@/shared/utils/event-bus';
import type { ILogger } from '@/shared/utils/logger';

/**
 * Register all content script services
 * 
 * @param container - IoC container
 */
export function registerContentServices(container: Container): void {
    // Register base services first
    registerBaseServices(container);

    // ============================================
    // MODE MANAGEMENT LAYER (Content Script Only)
    // ============================================

    /**
     * Mode Manager - Singleton
     * Coordinates mode switching and delegates operations
     */
    container.registerSingleton<IModeManager>('modeManager', () => {
        const eventBus = container.resolve<EventBus>('eventBus');
        const logger = container.resolve<ILogger>('logger');
        return new ModeManager(eventBus, logger);
    });

    // ============================================
    // MODE LAYER (Content Script Only - requires DOM APIs)
    // ============================================

    /**
     * Walk Mode - Transient
     * Ephemeral highlighting (no persistence)
     * Created fresh when activated
     */
    container.registerTransient<IHighlightMode>('walkMode', () => {
        const repositoryFacade = container.resolve<RepositoryFacade>('repositoryFacade');
        const eventBus = container.resolve<EventBus>('eventBus');
        const logger = container.resolve<ILogger>('logger');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new WalkMode(repositoryFacade as any, eventBus, logger);
    });

    /**
     * Sprint Mode - Transient
     * Session-based highlighting (TTL persistence)
     * Created fresh when activated
     */
    container.registerTransient<IHighlightMode>('sprintMode', () => {
        const repositoryFacade = container.resolve<RepositoryFacade>('repositoryFacade');
        const storage = container.resolve<IStorage>('storage');
        const eventBus = container.resolve<EventBus>('eventBus');
        const logger = container.resolve<ILogger>('logger');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new SprintMode(repositoryFacade as any, storage, eventBus, logger);
    });

    /**
     * Vault Mode - Transient
     * Persistent highlighting (IndexedDB)
     * Created fresh when activated
     */
    container.registerTransient<IHighlightMode>('vaultMode', () => {
        const repositoryFacade = container.resolve<RepositoryFacade>('repositoryFacade');
        const eventBus = container.resolve<EventBus>('eventBus');
        const logger = container.resolve<ILogger>('logger');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new VaultMode(repositoryFacade as any, eventBus, logger);
    });

    // ============================================
    // COMMAND LAYER (Content Script Only)
    // ============================================

    /**
     * Command Factory - Singleton
     * Centralizes command creation and dependency injection
     */
    container.registerSingleton<CommandFactory>('commandFactory', () => {
        return new CommandFactory(container);
    });
}
