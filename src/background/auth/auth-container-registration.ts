/**
 * @file auth-container-registration.ts
 * @description DI container registration for authentication & security layer
 * @architecture Dependency Injection - centralized service registration
 */

import type { Container } from '@/background/di/container';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { IKeyManager } from './interfaces/i-key-manager';
import type { IEncryptionService } from './interfaces/i-encryption-service';
import type { IAuditLogger } from './interfaces/i-audit-logger';
import { KeyManager } from './key-manager';
import { E2EEncryptionService } from './e2e-encryption-service';
import { AuditLogger } from './audit-logger';
import { CSPValidator } from './csp-validator';

/**
 * Register authentication & security components in DI container
 * 
 * Registered services:
 * - 'keyManager' → KeyManager (RSA-2048 key generation & storage)
 * - 'encryptionService' → E2EEncryptionService (hybrid encryption for highlights)
 * - 'auditLogger' → AuditLogger (security event logging, 90-day retention)
 * - 'cspValidator' → CSPValidator (OAuth XSS protection)
 * 
 * Dependencies required:
 * - 'logger' → ILogger
 * 
 * @example
 * ```typescript
 * const container = new Container();
 * 
 * // Register dependencies first
 * container.registerSingleton('logger', () => new Logger());
 * 
 * // Register auth components
 * registerAuthComponents(container);
 * 
 * // Resolve
 * const keyManager = container.resolve<IKeyManager>('keyManager');
 * const encryptionService = container.resolve<IEncryptionService>('encryptionService');
 * const auditLogger = container.resolve<IAuditLogger>('auditLogger');
 * ```
 */
export function registerAuthComponents(container: Container): void {
    // ==================== Key Manager ====================

    /**
     * KeyManager (security foundation)
     * - Generates RSA-2048 keypairs
     * - Encrypts private keys with AES-GCM before storage
     * - Caches keys in memory for performance
     */
    container.registerSingleton<IKeyManager>('keyManager', () => {
        const logger = container.resolve<ILogger>('logger');
        return new KeyManager(logger);
    });

    // ==================== E2E Encryption Service ====================

    /**
     * E2EEncryptionService (data protection)
     * - Hybrid encryption: AES-GCM for data + RSA-OAEP for AES key
     * - Encrypts highlights before sync to server
     * - Performance: <100ms for 1KB data
     */
    container.registerSingleton<IEncryptionService>('encryptionService', () => {
        const logger = container.resolve<ILogger>('logger');
        const keyManager = container.resolve<IKeyManager>('keyManager');
        return new E2EEncryptionService(keyManager, logger);
    });

    // ==================== Audit Logger ====================

    /**
     * AuditLogger (compliance & security monitoring)
     * - Logs auth events, data access, security incidents
     * - 90-day retention policy
     * - Brute force detection (5 failed logins in 15 minutes)
     */
    container.registerSingleton<IAuditLogger>('auditLogger', () => {
        const logger = container.resolve<ILogger>('logger');
        return new AuditLogger(logger);
    });

    // ==================== CSP Validator ====================

    /**
     * CSPValidator (OAuth XSS protection)
     * - Validates CSP headers for OAuth redirect pages
     * - Detects and logs CSP violations
     * - Ensures no unsafe-inline scripts
     */
    container.registerSingleton('cspValidator', () => {
        const logger = container.resolve<ILogger>('logger');
        const auditLogger = container.resolve<IAuditLogger>('auditLogger');
        return new CSPValidator(logger, auditLogger);
    });
}
