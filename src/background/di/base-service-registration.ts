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
import { StorageService } from '@/background/services/storage-service';
import { AiOrchestrator } from '@/background/services/llm/ai-orchestrator';
import { LLMRegistry } from '@/background/services/llm/llm-registry';
import { LLMKeyStore } from '@/background/services/llm/llm-key-store';
import { CircuitBreaker } from '@/shared/utils/circuit-breaker';
import { EventBus } from '@/shared/utils/event-bus';
import { LoggerFactory } from '@/shared/utils/logger';
import type { ILogger } from '@/shared/utils/logger';

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
     * LLMRegistry - Singleton
     * Holds provider implementations (Anthropic, Gemini, OpenAI, OpenRouter,
     * MiniMax, Ollama). Providers register themselves at boot.
     */
    container.registerSingleton<LLMRegistry>('llmRegistry', () => {
        return new LLMRegistry();
    });

    /**
     * LLMKeyStore - Singleton
     * Three-tier (ephemeral/local-AES/cloud-vault) key persistence.
     * Default to ephemeral mode; mode-aware wiring happens in AiOrchestrator.
     */
    container.registerSingleton<LLMKeyStore>('llmKeyStore', () => {
        return new LLMKeyStore('ephemeral');
    });

    /**
     * AiOrchestrator - Singleton
     * Wires the LLM IPC handlers (SET_API_KEY, HEALTH_CHECK, CHAT,
     * LIST_PROVIDERS, GET_API_KEY_STATUS) onto the messageBus at boot.
     * The background entrypoint resolves this and calls initialize()
     * after the messageBus is ready; otherwise the popup's IPC_AI_*
     * messages arrive at a bus with no handlers and the port closes.
     */
    container.registerSingleton<AiOrchestrator>('aiOrchestrator', () => {
        const messageBus = container.resolve<IMessageBus>('messageBus');
        const registry = container.resolve<LLMRegistry>('llmRegistry');
        const keyStore = container.resolve<LLMKeyStore>('llmKeyStore');
        const logger = container.resolve<ILogger>('logger');
        return new AiOrchestrator(messageBus, registry, keyStore, logger);
    });
}
