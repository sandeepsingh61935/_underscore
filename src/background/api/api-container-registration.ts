/**
 * @file api-container-registration.ts
 * @description DI container registration for API client layer
 * @architecture Dependency Injection - centralized service registration
 */

import { createClient, SupabaseClient as SupabaseSDKClient } from '@supabase/supabase-js';
import { SupabaseStorageAdapter } from '@/background/auth/supabase-storage-adapter';
import type { Container } from '@/background/di/container';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { IAuthManager } from '@/background/auth/interfaces/i-auth-manager';
import type { IAPIClient } from './interfaces/i-api-client';
import type { IPaginationClient } from './interfaces/i-pagination-client';
import type { ICacheManager } from './interfaces/i-cache-manager';
import type { IEncryptionService } from '@/background/auth/interfaces/i-encryption-service';
import { SupabaseClient, type SupabaseConfig } from './supabase-client';
import { ResilientAPIClient } from './resilient-api-client';
import { EncryptedAPIClient } from './encrypted-api-client';
import { PaginationClient } from './pagination-client';
import { CacheManager } from './cache-manager';
import type { HighlightDataV2 } from '@/background/schemas/highlight-schema';

/**
 * Register API client components in DI container
 * 
 * Registered services:
 * - '_supabaseSDK' → Shared Supabase JS Client (Auth + Data)
 * - 'apiClient' → ResilientAPIClient (wraps SupabaseClient with retry + circuit breaker)
 * - 'paginationClient' → PaginationClient
 * - 'highlightCache' → CacheManager<string, HighlightDataV2[]>
 * 
 * Dependencies required:
 * - 'logger' → ILogger
 * - 'authManager' → IAuthManager
 * - 'supabaseConfig' → SupabaseConfig
 * 
 * @example
 * ```typescript
 * const container = new Container();
 * 
 * // Register dependencies first
 * container.registerSingleton('logger', () => new Logger());
 * container.registerSingleton('authManager', () => new AuthManager(...));
 * container.registerInstance('supabaseConfig', {
 *   url: process.env.SUPABASE_URL,
 *   anonKey: process.env.SUPABASE_ANON_KEY,
 * });
 * 
 * // Register API components
 * registerAPIComponents(container);
 * 
 * // Resolve
 * const apiClient = container.resolve<IAPIClient>('apiClient');
 * ```
 */
export function registerAPIComponents(container: Container): void {
    // ==================== Base API Client ====================

    /**
     * Shared Raw Supabase SDK Client
     * Configured with persistent storage adapter for Auth
     */
    container.registerSingleton<SupabaseSDKClient>('_supabaseSDK', () => {
        const config = container.resolve<SupabaseConfig>('supabaseConfig');

        return createClient(config.url, config.anonKey, {
            auth: {
                storage: new SupabaseStorageAdapter(),
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: false,
            },
        });
    });

    /**
     * SupabaseClient (base implementation)
     * Internal - wrapped by EncryptedAPIClient
     */
    container.registerSingleton('_supabaseClient', () => {
        const logger = container.resolve<ILogger>('logger');
        const authManager = container.resolve<IAuthManager>('authManager');
        const config = container.resolve<SupabaseConfig>('supabaseConfig');
        const sdkClient = container.resolve<SupabaseSDKClient>('_supabaseSDK');

        return new SupabaseClient(authManager, logger, config, sdkClient);
    });

    /**
     * EncryptedAPIClient (security layer)
     * Wraps SupabaseClient with E2E encryption
     * 
     * Features:
     * - Transparent encryption before pushEvents/createHighlight
     * - Transparent decryption after pullEvents/getHighlights
     * - Hybrid encryption (AES-GCM + RSA-OAEP)
     */
    container.registerSingleton('_encryptedClient', () => {
        const logger = container.resolve<ILogger>('logger');
        const authManager = container.resolve<IAuthManager>('authManager');
        const baseClient = container.resolve<IAPIClient>('_supabaseClient');
        const encryptionService = container.resolve<IEncryptionService>('encryptionService');

        return new EncryptedAPIClient(baseClient, encryptionService, authManager, logger);
    });

    /**
     * ResilientAPIClient (production API client)
     * Wraps EncryptedAPIClient with retry + circuit breaker
     * 
     * Architecture:
     * ResilientAPIClient → EncryptedAPIClient → SupabaseClient
     * 
     * Configuration:
     * - Retry: 3 attempts, exponential backoff (100ms, 200ms, 400ms)
     * - Circuit Breaker: 5 failures → OPEN, 30s reset timeout
     */
    container.registerSingleton<IAPIClient>('apiClient', () => {
        const logger = container.resolve<ILogger>('logger');
        const encryptedClient = container.resolve<IAPIClient>('_encryptedClient');

        return new ResilientAPIClient(
            encryptedClient,
            logger,
            {
                maxRetries: 3,
                initialDelayMs: 100,
                maxDelayMs: 2000,
                backoffMultiplier: 2,
            },
            {
                failureThreshold: 5,
                resetTimeout: 30000, // 30 seconds
                successThreshold: 2,
                name: 'API Client',
            }
        );
    });

    // ==================== Pagination Client ====================

    /**
     * PaginationClient (scalability enhancement)
     * Streams large datasets in pages of 100 events
     */
    container.registerSingleton<IPaginationClient>('paginationClient', () => {
        const logger = container.resolve<ILogger>('logger');
        const apiClient = container.resolve<IAPIClient>('apiClient');

        return new PaginationClient(apiClient, logger, {
            limit: 100,
            timeoutMs: 5000,
        });
    });

    // ==================== Cache Manager ====================

    /**
     * Highlight Cache (scalability enhancement)
     * LRU cache with 5-minute TTL, reduces API calls by 80%+
     */
    container.registerSingleton<ICacheManager<string, HighlightDataV2[]>>(
        'highlightCache',
        () => {
            const logger = container.resolve<ILogger>('logger');

            return new CacheManager<string, HighlightDataV2[]>(logger, {
                maxSize: 100,
                ttlMs: 5 * 60 * 1000, // 5 minutes
            });
        }
    );

    /**
     * Sync Events Cache (optional - for pullEvents caching)
     */
    container.registerSingleton('syncEventsCache', () => {
        const logger = container.resolve<ILogger>('logger');

        return new CacheManager(logger, {
            maxSize: 50,
            ttlMs: 2 * 60 * 1000, // 2 minutes (shorter TTL for sync)
        });
    });
}
