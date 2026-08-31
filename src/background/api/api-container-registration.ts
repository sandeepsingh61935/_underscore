/**
 * @file api-container-registration.ts
 * @description DI container registration for API client layer
 * @architecture Dependency Injection - centralized service registration
 */

import type { SupabaseClient as SupabaseSDKClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';

import { CacheManager } from './cache-manager';
import type { IAPIClient } from './interfaces/i-api-client';
import type { ICacheManager } from './interfaces/i-cache-manager';
import type { IPaginationClient } from './interfaces/i-pagination-client';
import { PaginationClient } from './pagination-client';
import { ResilientAPIClient } from './resilient-api-client';
import { SupabaseClient, type SupabaseConfig } from './supabase-client';

import type { IAuthManager } from '@/background/auth/interfaces/i-auth-manager';
import { SupabaseStorageAdapter } from '@/background/auth/supabase-storage-adapter';
import type { Container } from '@/background/di/container';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';

export function registerAPIComponents(container: Container): void {
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

  container.registerSingleton('_supabaseClient', () => {
    const logger = container.resolve<ILogger>('logger');
    const authManager = container.resolve<IAuthManager>('authManager');
    const config = container.resolve<SupabaseConfig>('supabaseConfig');
    const sdkClient = container.resolve<SupabaseSDKClient>('_supabaseSDK');

    return new SupabaseClient(authManager, logger, config, sdkClient);
  });

  /**
   * ResilientAPIClient (production API client)
   * ResilientAPIClient → SupabaseClient
   */
  container.registerSingleton<IAPIClient>('apiClient', () => {
    const logger = container.resolve<ILogger>('logger');
    const baseClient = container.resolve<IAPIClient>('_supabaseClient');

    return new ResilientAPIClient(
      baseClient,
      logger,
      {
        maxRetries: 3,
        initialDelayMs: 100,
        maxDelayMs: 2000,
        backoffMultiplier: 2,
      },
      {
        failureThreshold: 5,
        resetTimeout: 30000,
        successThreshold: 2,
        name: 'API Client',
      }
    );
  });

  container.registerSingleton<IPaginationClient>('paginationClient', () => {
    const logger = container.resolve<ILogger>('logger');
    const apiClient = container.resolve<IAPIClient>('apiClient');

    return new PaginationClient(apiClient, logger, {
      limit: 100,
      timeoutMs: 5000,
    });
  });

  container.registerSingleton<ICacheManager<string, HighlightDataV2[]>>(
    'highlightCache',
    () => {
      const logger = container.resolve<ILogger>('logger');

      return new CacheManager<string, HighlightDataV2[]>(logger, {
        maxSize: 100,
        ttlMs: 5 * 60 * 1000,
      });
    }
  );

  container.registerSingleton('syncEventsCache', () => {
    const logger = container.resolve<ILogger>('logger');

    return new CacheManager(logger, {
      maxSize: 50,
      ttlMs: 2 * 60 * 1000,
    });
  });
}
