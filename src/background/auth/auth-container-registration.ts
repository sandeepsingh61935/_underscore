/**
 * @file auth-container-registration.ts
 * @description DI container registration for authentication & security layer
 * @architecture Dependency Injection - centralized service registration
 */

import type { Container } from '@/background/di/container';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { IAuditLogger } from './interfaces/i-audit-logger';
import { AuditLogger } from './audit-logger';
import { CSPValidator } from './csp-validator';

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
        return new AuditLogger(logger);
    });

    container.registerSingleton('cspValidator', () => {
        const logger = container.resolve<ILogger>('logger');
        const auditLogger = container.resolve<IAuditLogger>('auditLogger');
        return new CSPValidator(logger, auditLogger);
    });
}
