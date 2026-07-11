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
import type { IStorage } from '@/shared/interfaces/i-storage';
import type { IHighlightRepository } from '@/shared/repositories/i-highlight-repository';
import { InMemoryHighlightRepository } from '@/shared/repositories/in-memory-highlight-repository';
import { RepositoryFacade } from '@/shared/repositories/repository-facade';
import { ChromeMessageBus } from '@/shared/services/chrome-message-bus';
import { CircuitBreakerMessageBus } from '@/shared/services/circuit-breaker-message-bus';
import { RetryDecorator, DEFAULT_RETRY_POLICY } from '@/shared/services/retry-decorator';
import { StorageService } from '@/shared/services/storage-service';
import { CircuitBreaker } from '@/shared/utils/circuit-breaker';
import { EventBus } from '@/shared/utils/event-bus';
import { LoggerFactory } from '@/shared/utils/logger';
import type { ILogger } from '@/shared/utils/logger';
import { LLMRegistry } from '@/background/services/llm/llm-registry';
import { AiOrchestrator } from '@/background/services/llm/ai-orchestrator';
import { LlmKeyStoreHolder } from '@/background/services/llm/llm-key-store-holder';
import { BackgroundPageContentCache } from '@/background/services/llm/page-content-cache';

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
     * Pro storage — permanent (null TTL, synced)
     */
    container.registerSingleton<IStorage>('storage', () => {
        return new StorageService({ mode: 'pro', ttlDuration: null });
    });

    /**
     * Basic storage — TTL resolved dynamically from the Basic TTL
     * preference (see @/shared/constants/basic-ttl). Defaults to 24h until
     * BasicMode.onActivate() reads the actual preference and calls
     * setTtlDuration().
     */
    container.registerSingleton<IStorage>('basicStorage', () => {
        return new StorageService({ mode: 'basic', ttlDuration: 24 * 60 * 60 * 1000 });
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

    // ============================================
    // LLM LAYER (ADR-021)
    // ============================================

    /**
     * LLM Registry - Singleton
     * Holds provider implementations (Anthropic, Ollama).
     * Providers register themselves at boot.
     */
    container.registerSingleton<LLMRegistry>('llmRegistry', () => {
        return new LLMRegistry();
    });

    container.registerSingleton<LlmKeyStoreHolder>('llmKeyStoreHolder', () => {
        return new LlmKeyStoreHolder();
    });

    container.registerSingleton<BackgroundPageContentCache>('pageContentCache', () => {
        return new BackgroundPageContentCache({ ttlMs: 30 * 60 * 1000 });
    });

    container.registerSingleton<AiOrchestrator>('aiOrchestrator', () => {
        const messageBus = container.resolve<IMessageBus>('messageBus');
        const registry = container.resolve<LLMRegistry>('llmRegistry');
        const keyStoreHolder = container.resolve<LlmKeyStoreHolder>('llmKeyStoreHolder');
        const pageContentCache = container.resolve<BackgroundPageContentCache>('pageContentCache');
        const logger = container.resolve<ILogger>('logger');
        return new AiOrchestrator(messageBus, registry, keyStoreHolder, pageContentCache, logger);
    });
}
