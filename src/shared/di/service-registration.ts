/**
 * @file service-registration.ts
 * @description Central service registration for dependency injection
 *
 * Registers all application services with the IoC container.
 * Defines the dependency graph and lifecycle for all services.
 */

import type { Container } from './container';

import { CommandFactory } from '@/content/commands/command-factory';
import type { IHighlightMode } from '@/content/modes/highlight-mode.interface';
import { ModeManager } from '@/content/modes/mode-manager';
import { SprintMode } from '@/content/modes/sprint-mode';
import { VaultMode } from '@/content/modes/vault-mode';
import { WalkMode } from '@/content/modes/walk-mode';
import type { IMessaging, ITabQuery } from '@/shared/interfaces/i-messaging';
import type { IModeManager } from '@/shared/interfaces/i-mode-manager';
import type { IStorage } from '@/shared/interfaces/i-storage';
import type { IHighlightRepository } from '@/shared/repositories/i-highlight-repository';
import { InMemoryHighlightRepository } from '@/shared/repositories/in-memory-highlight-repository';
import { RepositoryFacade } from '@/shared/repositories/repository-facade';
import { ChromeMessaging, ChromeTabQuery } from '@/shared/services/chrome-messaging';
import { StorageService } from '@/shared/services/storage-service';
import { EventBus } from '@/shared/utils/event-bus';
import { LoggerFactory } from '@/shared/utils/logger';
import type { ILogger } from '@/shared/utils/logger';
import { CircuitBreaker } from '@/shared/utils/circuit-breaker';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import { ChromeMessageBus } from '@/shared/services/chrome-message-bus';
import { RetryDecorator, DEFAULT_RETRY_POLICY } from '@/shared/services/retry-decorator';
import { CircuitBreakerMessageBus } from '@/shared/services/circuit-breaker-message-bus';


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
    /**
     * Highlight Repository - Singleton
     * In-memory highlight storage with content hash indexing
     */
    container.registerSingleton<IHighlightRepository>('repository', () => {
        return new InMemoryHighlightRepository();
    });

    /**
     * Repository Facade - Singleton
     * Synchronous wrapper over async repository
     * Required by legacy synchronous code (HighlightClickDetector, etc.)
     */
    container.registerSingleton<RepositoryFacade>('repositoryFacade', () => {
        const repository = container.resolve<IHighlightRepository>('repository');
        // We initialize facade asynchronously in content script
        return new RepositoryFacade(repository);
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
    // IPC LAYER (Phase 3: Inter-Process Communication)
    // ============================================

    /**
     * Circuit Breaker for Messaging - Singleton
     * Protects messaging operations from cascading failures
     * Config: 5 failures, 30s reset (consistent with Phase 2 storage circuit breaker)
     */
    container.registerSingleton<CircuitBreaker>('messagingCircuitBreaker', () => {
        const logger = container.resolve<ILogger>('logger');
        return new CircuitBreaker(
            {
                failureThreshold: 5,
                resetTimeout: 30000, // 30 seconds
                successThreshold: 2,
                name: 'messaging',
            },
            logger
        );
    });

    /**
     * Message Bus - Singleton
     * Cross-context IPC with retry logic and circuit breaker protection
     *
     * Composition chain:
     * CircuitBreakerMessageBus → RetryDecorator → ChromeMessageBus
     *
     * This provides:
     * 1. Circuit Breaker (outermost) - prevents cascading failures
     * 2. Retry with exponential backoff - handles transient failures
     * 3. ChromeMessageBus (core) - chrome.runtime API wrapper
     */
    container.registerSingleton<IMessageBus>('messageBus', () => {
        const logger = container.resolve<ILogger>('logger');
        const circuitBreaker = container.resolve<CircuitBreaker>('messagingCircuitBreaker');

        // Build composition chain
        const chromeMessageBus = new ChromeMessageBus(logger, { timeoutMs: 5000 });
        const retryDecorator = new RetryDecorator(chromeMessageBus, logger, DEFAULT_RETRY_POLICY);
        const messageBus = new CircuitBreakerMessageBus(retryDecorator, circuitBreaker);

        return messageBus;
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

    /**
     * Command Factory - Singleton
     * Centralizes command creation and dependency injection
     */
    container.registerSingleton<CommandFactory>('commandFactory', () => {
        return new CommandFactory(container);
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
        ['messagingCircuitBreaker', ['logger']],
        ['messageBus', ['logger', 'messagingCircuitBreaker']],
        ['modeManager', ['eventBus', 'logger']],
        ['walkMode', ['repository', 'eventBus']],
        ['sprintMode', ['repository', 'storage', 'eventBus']],
        ['vaultMode', ['repository', 'eventBus']],
        ['commandFactory', ['container']],
    ]);
}
