/**
 * @file repository-container-registration.ts
 * @description DI container registration for repository layer
 * @architecture Dependency Injection - registers highlight repositories for storage
 */

import type { Container } from '@/background/di/container';
import type { ILogger } from '@/shared/utils/logger';
import type { IAuthManager } from '@/background/auth/interfaces/i-auth-manager';
import type { IKeyManager } from '@/background/auth/interfaces/i-key-manager';
import type { IHighlightRepository } from '@/shared/repositories/i-highlight-repository';
import { SupabaseHighlightRepository } from '@/background/repositories/supabase-highlight-repository';
import { DualWriteRepository } from '@/background/repositories/dual-write-repository';
import { IndexedDBHighlightRepository } from '@/background/repositories/indexed-db-highlight-repository';
import { OfflineQueueService } from '@/background/services/offline-queue-service';
import { SupabaseClient } from '@/background/api/supabase-client';
import { RepositoryFacade } from '@/shared/repositories/repository-facade';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import { BackgroundHighlightOrchestrator } from '@/background/services/background-highlight-orchestrator';
import { HighlightEncryptor } from '@/background/services/highlight-encryptor';

/**
 * Register repository components in DI container
 * 
 * Registered services:
 * - 'localRepository' → InMemoryHighlightRepository (fast, in-memory storage)
 * - 'supabaseHighlightRepository' → SupabaseHighlightRepository (cloud storage)
 * - 'highlightRepository' → DualWriteRepository (local + cloud dual-write)
 * 
 * Dependencies required:
 * - 'logger' → ILogger
 * - '_supabaseClient' → SupabaseClient (from API layer)
 * - 'authManager' → IAuthManager
 * 
 * @example
 * ```typescript
 * const container = new Container();
 * 
 * // Register dependencies first
 * registerBaseServices(container);
 * registerAPIComponents(container);
 * registerAuthComponents(container);
 * 
 * // Register repositories
 * registerRepositoryComponents(container);
 * 
 * // Resolve
 * const repo = container.resolve<IHighlightRepository>('highlightRepository');
 * ```
 */
export function registerRepositoryComponents(container: Container): void {
    // ==================== Local Repository ====================

    /**
     * InMemoryHighlightRepository - Singleton
     * Fast, in-memory storage for local-first architecture
     */
    container.registerSingleton<IHighlightRepository>('localRepository', () => {
        const logger = container.resolve<ILogger>('logger');
        return new IndexedDBHighlightRepository(logger);
    });

    // ==================== Cloud Repository ====================

    /**
     * SupabaseHighlightRepository - Singleton
     * Cloud storage via Supabase PostgreSQL
     */
    container.registerSingleton<IHighlightRepository>('supabaseHighlightRepository', () => {
        const supabaseClient = container.resolve<SupabaseClient>('_supabaseClient');
        const logger = container.resolve<ILogger>('logger');

        return new SupabaseHighlightRepository(supabaseClient, logger);
    });

    // ==================== Offline Queue ====================

    /**
     * OfflineQueueService - Singleton
     * Manages retries for failed cloud operations
     */
    container.registerSingleton('offlineQueueService', () => {
        const cloudRepo = container.resolve<SupabaseHighlightRepository>('supabaseHighlightRepository' as any);
        const authManager = container.resolve<IAuthManager>('authManager');
        const logger = container.resolve<ILogger>('logger');

        return new OfflineQueueService(cloudRepo, authManager, logger);
    });

    // ==================== Dual-Write Repository (Primary) ====================

    /**
     * DualWriteRepository - Singleton
     * Writes to local (fast) + cloud (async) for best of both worlds
     * 
     * Strategy:
     * - Write to local immediately (synchronous, reliable)
     * - Write to cloud async (fire-and-forget, auth-aware)
     * - Read from local (fastest, most up-to-date)
     * 
     * This is the primary repository used by CloudModeService
     */
    container.registerSingleton<IHighlightRepository>('highlightRepository', () => {
        const localRepo = container.resolve<IHighlightRepository>('localRepository' as any);
        const cloudRepo = container.resolve<SupabaseHighlightRepository>('supabaseHighlightRepository' as any);
        const authManager = container.resolve<IAuthManager>('authManager');
        const offlineQueue = container.resolve<any>('offlineQueueService');
        const logger = container.resolve<ILogger>('logger');

        return new DualWriteRepository(localRepo, cloudRepo, authManager, offlineQueue, logger);
    });

    // ============================================
    // OVERRIDE BASE REPOSITORY FACADE (Background Only)
    // ============================================
    container.registerSingleton<RepositoryFacade>('repositoryFacade', () => {
        const repository = container.resolve<IHighlightRepository>('highlightRepository');
        return new RepositoryFacade(repository);
    });

    // ============================================
    // HIGHLIGHT ENCRYPTOR (ADR-013)
    // ============================================
    //
    // The encryptor is constructed once and shared by the orchestrator.
    // It depends on the keyManager so that the master key never leaves
    // the KeyManager's memory; the encryptor accesses it through
    // `withMasterKey` (see IKeyManager).
    container.registerSingleton<HighlightEncryptor>('highlightEncryptor', () => {
        const keyManager = container.resolve<IKeyManager>('keyManager');
        return new HighlightEncryptor(keyManager);
    });

    // ============================================
    // BACKGROUND HIGHLIGHT ORCHESTRATOR
    // ============================================
    container.registerSingleton<BackgroundHighlightOrchestrator>('backgroundHighlightOrchestrator', () => {
        const repositoryFacade = container.resolve<RepositoryFacade>('repositoryFacade');
        const encryptor = container.resolve<HighlightEncryptor>('highlightEncryptor');
        const messageBus = container.resolve<IMessageBus>('messageBus');
        const logger = container.resolve<ILogger>('logger');
        return new BackgroundHighlightOrchestrator(repositoryFacade, encryptor, messageBus, logger);
    });
}

