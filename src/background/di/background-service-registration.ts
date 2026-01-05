/**
 * @file background-service-registration.ts
 * @description Service registration for background script (Service Worker)
 *
 * Registers services that are ONLY available in background context:
 * - Authentication (Auth Manager, Token Store)
 * - Auth state observation
 *
 * DO NOT import content script modules (modes, UI components) here.
 * They use DOM APIs (document, CSS.highlights) which don't exist in Service Workers.
 */

import type { Container } from './container';
import { registerBaseServices } from './base-service-registration';
import type { EventBus } from '@/background/utils/event-bus';
import type { ILogger } from '@/background/utils/logger';

// Auth Components (Static Import)
import { TokenStore } from '@/background/auth/token-store';
import { AuthManager } from '@/background/auth/auth-manager';
import { AuthStateObserver } from '@/background/auth/auth-state-observer';

import type { ITokenStore } from '@/background/auth/interfaces/i-token-store';

/**
 * Register all background services
 * 
 * @param container - IoC container
 */
export function registerBackgroundServices(container: Container): void {
    // Register base services first
    registerBaseServices(container);

    // ============================================
    // AUTHENTICATION LAYER (Background Only)
    // ============================================

    /**
     * Token Store - Singleton
     * OAuth token storage with circuit breaker protection
     */
    container.registerSingleton('tokenStore', () => {
        const logger = container.resolve<ILogger>('logger');

        // Create a persistent storage adapter (chrome.storage.local wrapper)
        const persistentStorage = {
            async save<T>(key: string, value: T): Promise<void> {
                await chrome.storage.local.set({ [key]: value });
            },
            async load<T>(key: string): Promise<T | null> {
                const result = await chrome.storage.local.get(key);
                return (result[key] as T) ?? null;
            },
            async delete(key: string): Promise<void> {
                await chrome.storage.local.remove(key);
            },
        };

        return new TokenStore(persistentStorage, logger);
    });

    /**
     * Auth Manager - Singleton
     * OAuth authentication with automatic token refresh
     */
    container.registerSingleton('authManager', () => {
        const supabase = container.resolve<any>('_supabaseSDK');
        const tokenStore = container.resolve<ITokenStore>('tokenStore');
        const eventBus = container.resolve<EventBus>('eventBus');
        const logger = container.resolve<ILogger>('logger');

        return new AuthManager(supabase, tokenStore, eventBus, logger);
    });

    /**
     * Auth State Observer - Singleton
     * Notifies subscribers of authentication state changes
     */
    container.registerSingleton('authStateObserver', () => {
        const eventBus = container.resolve<EventBus>('eventBus');
        const logger = container.resolve<ILogger>('logger');

        return new AuthStateObserver(eventBus, logger);
    });
}
