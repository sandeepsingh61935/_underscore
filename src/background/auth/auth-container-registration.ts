/**
 * @file auth-container-registration.ts
 * @description DI container registration for authentication & security layer
 * @architecture Dependency Injection - centralized service registration
 */

import { AuditLogger } from './audit-logger';
import { CSPValidator } from './csp-validator';
import { ForwardingAuditLogger } from './forwarding-audit-logger';
import type { IAuditLogger } from './interfaces/i-audit-logger';
import {
  resolveFunctionsBaseUrl,
  ServerAuditSink,
} from './server-audit-sink';

import type { SupabaseConfig } from '@/background/api/supabase-client';
import type { Container } from '@/background/di/container';
import type { ILogger } from '@/shared/interfaces/i-logger';

/**
 * Register authentication & security components in DI container
 *
 * Registered services:
 * - 'auditLogger' → AuditLogger (security event logging, 90-day retention)
 * - 'cspValidator' → CSPValidator (OAuth XSS protection)
 */
export function registerAuthComponents(container: Container): void {
  container.registerSingleton<IAuditLogger>('auditLogger', () => {
    const logger = container.resolve<ILogger>('logger');
    const local = new AuditLogger(logger);

    // Server sink is best-effort: unconfigured Supabase or missing
    // auth-audit table degrades to local-only logging (fail open).
    try {
      const config = container.resolve<SupabaseConfig>('supabaseConfig');
      if (!config.url || !config.anonKey) {
        return local;
      }
      const sink = new ServerAuditSink(
        resolveFunctionsBaseUrl(config.url),
        config.anonKey,
        async () => {
          try {
            const sdk = container.resolve<{ auth: { getSession: () => Promise<{ data: { session: { access_token: string } | null } }> } }>('_supabaseSDK');
            const { data } = await sdk.auth.getSession();
            return data.session?.access_token ?? null;
          } catch {
            return null;
          }
        },
        logger
      );
      return new ForwardingAuditLogger(local, sink);
    } catch {
      return local;
    }
  });

  container.registerSingleton('cspValidator', () => {
    const logger = container.resolve<ILogger>('logger');
    const auditLogger = container.resolve<IAuditLogger>('auditLogger');
    return new CSPValidator(logger, auditLogger);
  });
}
