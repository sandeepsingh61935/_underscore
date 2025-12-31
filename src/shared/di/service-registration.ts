/**
 * @file service-registration.ts
 * @description Central service registration for dependency injection
 *
 * Registers all application services with the IoC container.
 * Defines the dependency graph and lifecycle for all services.
 */

import type { Container } from './container';

import type { IHighlightMode } from '@/content/modes/highlight-mode.interface';
import { ModeManager } from '@/content/modes/mode-manager';
import { SprintMode } from '@/content/modes/sprint-mode';
import { VaultMode } from '@/content/modes/vault-mode';
import { WalkMode } from '@/content/modes/walk-mode';
import type { IMessaging, ITabQuery } from '@/shared/interfaces/i-messaging';
import type { IModeManager } from '@/shared/interfaces/i-mode-manager';
import type { IStorage } from '@/shared/interfaces/i-storage';
import { InMemoryHighlightRepository } from '@/shared/repositories/in-memory-highlight-repository';
import { StorageService } from '@/shared/services/storage-service';
import { EventBus } from '@/shared/utils/event-bus';
import { LoggerFactory } from '@/shared/utils/logger';
import type { ILogger } from '@/shared/utils/logger';
import type { IHighlightRepository } from '@/shared/repositories/i-highlight-repository';
import { ChromeMessaging, ChromeTabQuery } from '@/shared/services/chrome-messaging';

/**
 * Register all application services
 *
 * Dependency Graph:
 * ```
 * logger, eventBus (no dependencies)
 *   ↓
 * storage, repository, messaging, tabQuery
 *   ↓
 * modeManager
 *   ↓
 * walkMode, sprintMode, vaultMode
 * ```
 *
 * @param container - IoC container to register services with
 *
 * @example
 * ```typescript
 * const container = new Container();
 * registerServices(container);
 *
 * const modeManager = container.resolve<IModeManager>('modeManager');
 * ```
 */
export function registerServices(container: Container): void {
    // ============================================
    // INFRASTRUCTURE LAYER (No Dependencies)
    // ============================================

    /**
     * Logger - Singleton
     * Shared across entire application for consistent logging
     */
    container.registerSingleton<ILogger>('logger', () => {
        return LoggerFactory.getLogger('App');
    });

    /**
     * Event Bus - Singleton
     * Single event bus for pub/sub across application
     */
    container.registerSingleton<EventBus>('eventBus', () => {
        return new EventBus();
    });

    // ============================================
    // CORE SERVICES LAYER (Depend on Infrastructure)
    // ============================================

    /**
     * Storage Service - Singleton
     * Manages event sourcing and domain-scoped highlight persistence
     */
    container.registerSingleton<IStorage>('storage', () => {
        return new StorageService();
    });

    /**
     * Highlight Repository - Singleton
     * In-memory highlight storage with content hash indexing
     */
    container.registerSingleton<IHighlightRepository>('repository', () => {
        return new InMemoryHighlightRepository();
    });

    /**
     * Chrome Messaging - Singleton
     * Wraps chrome.runtime and chrome.tabs APIs
     */
    container.registerSingleton<IMessaging>('messaging', () => {
        return new ChromeMessaging();
    });

    /**
     * Chrome Tab Query - Singleton
     * Wraps chrome.tabs.query API
     */
    container.registerSingleton<ITabQuery>('tabQuery', () => {
        return new ChromeTabQuery();
    });

    // ============================================
    // MODE MANAGEMENT LAYER (Depends on Core Services)
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
    // MODE LAYER (Depends on Mode Manager + Services)
    // ============================================

    /**
     * Walk Mode - Transient
     * Ephemeral highlighting (no persistence)
     * Created fresh when activated
     */
    container.registerTransient<IHighlightMode>('walkMode', () => {
        const repository = container.resolve<IHighlightRepository>('repository');
        const eventBus = container.resolve<EventBus>('eventBus');
        const logger = container.resolve<ILogger>('logger');
        return new WalkMode(repository, eventBus, logger);
    });

    /**
     * Sprint Mode - Transient
     * Session-based highlighting (TTL persistence)
     * Created fresh when activated
     */
    container.registerTransient<IHighlightMode>('sprintMode', () => {
        const repository = container.resolve<IHighlightRepository>('repository');
        const storage = container.resolve<IStorage>('storage');
        const eventBus = container.resolve<EventBus>('eventBus');
        const logger = container.resolve<ILogger>('logger');
        return new SprintMode(repository, storage, eventBus, logger);
    });

    /**
     * Vault Mode - Transient
     * Persistent highlighting (IndexedDB)
     * Created fresh when activated
     */
    container.registerTransient<IHighlightMode>('vaultMode', () => {
        const repository = container.resolve<IHighlightRepository>('repository');
        const eventBus = container.resolve<EventBus>('eventBus');
        const logger = container.resolve<ILogger>('logger');
        return new VaultMode(repository, eventBus, logger);
    });
}

/**
 * Get dependency graph for debugging
 *
 * @returns Map of service to its dependencies
 */
export function getDependencyGraph(): Map<string, string[]> {
    return new Map([
        ['logger', []],
        ['eventBus', []],
        ['storage', []],
        ['repository', []],
        ['messaging', []],
        ['tabQuery', []],
        ['modeManager', ['eventBus', 'logger']],
        ['walkMode', ['repository', 'eventBus']],
        ['sprintMode', ['repository', 'storage', 'eventBus']],
        ['vaultMode', ['repository', 'eventBus']],
    ]);
}
