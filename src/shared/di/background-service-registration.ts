/**
 * @file background-service-registration.ts
 * @description Service registration for background script (Service Worker)
 *
 * @deprecated Use src/background/di/background-service-registration.ts in production.
 * Kept for test compatibility.
 */

import { registerBaseServices } from './base-service-registration';
import type { Container } from './container';

import { AuthManager } from '@/background/auth/auth-manager';
import type { IAuditLogger } from '@/background/auth/interfaces/i-audit-logger';
import type { EventBus } from '@/shared/utils/event-bus';
import type { ILogger } from '@/shared/utils/logger';

export function registerBackgroundServices(container: Container): void {
  registerBaseServices(container);

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
