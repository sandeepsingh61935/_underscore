/**
 * @file background-service-registration.ts
 * @description Service registration for background script (Service Worker)
 *
 * Registers services that are ONLY available in background context:
 * - Authentication (Auth Manager)
 *
 * DO NOT import content script modules (modes, UI components) here.
 * They use DOM APIs (document, CSS.highlights) which don't exist in Service Workers.
 */

import type { Container } from './container';
import { registerBaseServices } from './base-service-registration';
import type { EventBus } from '@/shared/utils/event-bus';
import type { ILogger } from '@/shared/utils/logger';

import { AuthManager } from '@/background/auth/auth-manager';
import type { IAuditLogger } from '@/background/auth/interfaces/i-audit-logger';

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
     * Auth Manager - Singleton
     * OAuth authentication with automatic token refresh
     *
     * Note: keyManager is intentionally NOT injected here — KeyManager depends on
     * AuthManager, so wiring both in the constructor creates a DI cycle.
     * Vault lock on sign-out is handled in background.ts logout handlers.
     */
    container.registerSingleton('authManager', () => {
        const supabase = container.resolve<any>('_supabaseSDK');
        const eventBus = container.resolve<EventBus>('eventBus');
        const logger = container.resolve<ILogger>('logger');
        const auditLogger = container.has('auditLogger')
            ? container.resolve<IAuditLogger>('auditLogger')
            : undefined;

        return new AuthManager(supabase, eventBus, logger, auditLogger);
    });
}
