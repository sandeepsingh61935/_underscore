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
import { LocalMode } from '@/content/modes/local-mode';
import { CloudMode } from '@/content/modes/cloud-mode';
import { EphemeralMode } from '@/content/modes/ephemeral-mode';
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
     * 24h TTL local persistence
     */
    container.registerTransient<IHighlightMode>('ephemeralMode', () => {
        const repositoryFacade = container.resolve<RepositoryFacade>('repositoryFacade');
        const ephemeralStorage = container.resolve<IStorage>('ephemeralStorage');
        const eventBus = container.resolve<EventBus>('eventBus');
        const logger = container.resolve<ILogger>('logger');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new EphemeralMode(repositoryFacade as any, ephemeralStorage, eventBus, logger);
    });

    /**
     * Sprint Mode - Transient
     * Permanent local persistence (manual delete only)
     */
    container.registerTransient<IHighlightMode>('localMode', () => {
        const repositoryFacade = container.resolve<RepositoryFacade>('repositoryFacade');
        const storage = container.resolve<IStorage>('storage');
        const eventBus = container.resolve<EventBus>('eventBus');
        const logger = container.resolve<ILogger>('logger');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new LocalMode(repositoryFacade as any, storage, eventBus, logger);
    });

    /**
     * Vault Mode - Transient
     * Persistent highlighting (IndexedDB)
     * Created fresh when activated
     */
    container.registerTransient<IHighlightMode>('cloudMode', () => {
        const repositoryFacade = container.resolve<RepositoryFacade>('repositoryFacade');
        const eventBus = container.resolve<EventBus>('eventBus');
        const logger = container.resolve<ILogger>('logger');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new CloudMode(repositoryFacade as any, eventBus, logger);
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
