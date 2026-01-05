/**
 * @file base-service-registration.ts
 * @description Base service registration for both background and content scripts
 *
 * Registers core infrastructure services that are environment-agnostic:
 * - Logging
 * - Event bus  
 * - Storage
 * - Repository
 * - Messaging
 *
 * These services work in both Service Worker and browser contexts.
 */

import type { Container } from './container';

import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import type { IMessaging, ITabQuery } from '@/shared/interfaces/i-messaging';
import type { IStorage } from '@/shared/interfaces/i-storage';
import type { IHighlightRepository } from '@/background/repositories/i-highlight-repository';
import { InMemoryHighlightRepository } from '@/background/repositories/in-memory-highlight-repository';
import { RepositoryFacade } from '@/background/repositories/repository-facade';
import { ChromeMessageBus } from '@/background/services/chrome-message-bus';
import { ChromeMessaging, ChromeTabQuery } from '@/background/services/chrome-messaging';
import { CircuitBreakerMessageBus } from '@/background/services/circuit-breaker-message-bus';
import { RetryDecorator, DEFAULT_RETRY_POLICY } from '@/background/services/retry-decorator';
import { StorageService } from '@/background/services/storage-service';
import { CircuitBreaker } from '@/background/utils/circuit-breaker';
import { EventBus } from '@/background/utils/event-bus';
import { LoggerFactory } from '@/background/utils/logger';
import type { ILogger } from '@/background/utils/logger';

/**
 * Register base services available in all contexts
 */
export function registerBaseServices(container: Container): void {
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
     * Repository Facade - Singleton
     * Unified interface for highlight storage operations
     */
    container.registerSingleton<RepositoryFacade>('repositoryFacade', () => {
        const repository = container.resolve<IHighlightRepository>('repository');
        return new RepositoryFacade(repository);
    });

    // ============================================
    // MESSAGING LAYER (Chrome Extension IPC)
    // ============================================

    /**
     * Chrome Messaging - Singleton
     * Low-level wrapper for chrome.runtime messaging
     */
    container.registerSingleton<IMessaging>('messaging', () => {
        return new ChromeMessaging();
    });

    /**
     * Chrome Tab Query - Singleton
     * Utility for querying active tabs
     */
    container.registerSingleton<ITabQuery>('tabQuery', () => {
        return new ChromeTabQuery();
    });

    /**
     * Messaging Circuit Breaker - Singleton
     * Prevents message flood during failures
     */
    container.registerSingleton('messagingCircuitBreaker', () => {
        const logger = container.resolve<ILogger>('logger');
        return new CircuitBreaker(
            {
                failureThreshold: 5,
                resetTimeout: 30000,
                successThreshold: 2,
                name: 'Messaging',
            },
            logger
        );
    });

    /**
     * Message Bus - Singleton
     * High-level pub/sub messaging with retry and circuit breaker
     *
     * Architecture: CircuitBreaker → Retry → ChromeMessageBus
     */
    container.registerSingleton<IMessageBus>('messageBus', () => {
        const logger = container.resolve<ILogger>('logger');
        const circuitBreaker = container.resolve<CircuitBreaker>('messagingCircuitBreaker');

        // Base message bus
        const baseMessageBus = new ChromeMessageBus(logger);

        // Add retry capability
        const retryMessageBus = new RetryDecorator(
            baseMessageBus,
            logger,
            DEFAULT_RETRY_POLICY
        );

        // Add circuit breaker protection
        const resilientMessageBus = new CircuitBreakerMessageBus(
            retryMessageBus,
            circuitBreaker
        );

        return resilientMessageBus;
    });
}
