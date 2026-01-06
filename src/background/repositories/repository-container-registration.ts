/**
 * @file repository-container-registration.ts
 * @description DI container registration for repository layer
 * @architecture Dependency Injection - registers highlight repositories for storage
 */

import type { Container } from '@/background/di/container';
import type { ILogger } from '@/background/utils/logger';
import type { IAuthManager } from '@/background/auth/interfaces/i-auth-manager';
import type { IHighlightRepository } from '@/background/repositories/i-highlight-repository';
import { InMemoryHighlightRepository } from '@/background/repositories/in-memory-highlight-repository';
import { SupabaseHighlightRepository } from '@/background/repositories/supabase-highlight-repository';
import { DualWriteRepository } from '@/background/repositories/dual-write-repository';
import { SupabaseClient } from '@/background/api/supabase-client';

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
        return new InMemoryHighlightRepository();
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
     * This is the primary repository used by VaultModeService
     */
    container.registerSingleton<IHighlightRepository>('highlightRepository', () => {
        const localRepo = container.resolve<InMemoryHighlightRepository>('localRepository' as any);
        const cloudRepo = container.resolve<SupabaseHighlightRepository>('supabaseHighlightRepository' as any);
        const authManager = container.resolve<IAuthManager>('authManager');
        const logger = container.resolve<ILogger>('logger');

        return new DualWriteRepository(localRepo, cloudRepo, authManager, logger);
    });
}
