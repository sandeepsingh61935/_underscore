/**
 * @file service-registration.ts
 * @description Central service registration for dependency injection
 * @deprecated Use background-service-registration.ts or content-service-registration.ts instead.
 * 
 * Kept for test compatibility only. Do not use in production code.
 */

import type { Container } from './container';

import { CommandFactory } from '@/content/commands/command-factory';
import type { IHighlightMode } from '@/content/modes/highlight-mode.interface';
import { ModeManager } from '@/content/modes/mode-manager';
import { BasicMode } from '@/content/modes/basic-mode';
import { ProMode } from '@/content/modes/pro-mode';
import { ProXaiMode } from '@/content/modes/pro-xai-mode';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import type { IModeManager } from '@/shared/interfaces/i-mode-manager';
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
import { AuthManager } from '@/background/auth/auth-manager';

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
 * basicMode, proMode, proXaiMode
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
   * Pro storage — permanent, synced
   */
  container.registerSingleton<IStorage>('storage', () => {
    return new StorageService({ mode: 'pro' });
  });

  /**
   * Guest (Basic) storage — permanent local persistence.
   */
  container.registerSingleton<IStorage>('basicStorage', () => {
    return new StorageService({ mode: 'basic' });
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
    const retryDecorator = new RetryDecorator(
      chromeMessageBus,
      logger,
      DEFAULT_RETRY_POLICY
    );
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

  // ============================================
  // MODE LAYER (Content Script Only - requires DOM APIs)
  // ============================================

  /**
   * Mode registrations are conditional because modes use DOM APIs (CSS.highlights, document)
   * which don't exist in Service Worker context (background script).
   * 
   * Detection: Check for 'document' global (exists in browser, not in Service Worker)
   */
  if (typeof document !== 'undefined') {
    /**
     * Basic Mode - Transient
     * Permanent local persistence on this device.
     */
    container.registerTransient<IHighlightMode>('basicMode', () => {
      const repositoryFacade = container.resolve<RepositoryFacade>('repositoryFacade');
      const basicStorage = container.resolve<IStorage>('basicStorage');
      const eventBus = container.resolve<EventBus>('eventBus');
      const logger = container.resolve<ILogger>('logger');
      return new BasicMode(repositoryFacade, basicStorage, eventBus, logger);
    });

    /**
     * Pro Mode - Transient
     * Persistent highlighting (IndexedDB) + server sync
     */
    container.registerTransient<IHighlightMode>('proMode', () => {
      const repositoryFacade = container.resolve<RepositoryFacade>('repositoryFacade');
      const eventBus = container.resolve<EventBus>('eventBus');
      const logger = container.resolve<ILogger>('logger');
      return new ProMode(repositoryFacade, eventBus, logger);
    });

    /**
     * 10x-Pro Mode - Transient
     * Pro persistence + AI capability flags
     */
    container.registerTransient<IHighlightMode>('proXaiMode', () => {
      const repositoryFacade = container.resolve<RepositoryFacade>('repositoryFacade');
      const eventBus = container.resolve<EventBus>('eventBus');
      const logger = container.resolve<ILogger>('logger');
      return new ProXaiMode(repositoryFacade, eventBus, logger);
    });
  }

  // ============================================
  // AUTHENTICATION LAYER (Phase 2: Vault Mode)
  // ============================================

  container.registerSingleton('authManager', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = container.resolve<any>('_supabaseSDK');
    const eventBus = container.resolve<EventBus>('eventBus');
    const logger = container.resolve<ILogger>('logger');

    return new AuthManager(supabase, eventBus, logger);
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
    ['basicStorage', []],
    ['repository', []],
    ['messagingCircuitBreaker', ['logger']],
    ['messageBus', ['logger', 'messagingCircuitBreaker']],
    ['modeManager', ['eventBus', 'logger']],
    ['basicMode', ['repository', 'basicStorage', 'eventBus']],
    ['proMode', ['repository', 'eventBus']],
    ['proXaiMode', ['repository', 'eventBus']],
    ['commandFactory', ['container']],
  ]);
}
