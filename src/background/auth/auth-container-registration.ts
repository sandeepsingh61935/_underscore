/**
 * @file auth-container-registration.ts
 * @description DI container registration for authentication & security layer
 * @architecture Dependency Injection - centralized service registration
 */

import type { Container } from '@/shared/di/container';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { IKeyManager } from './interfaces/i-key-manager';
import type { IEncryptionService } from './interfaces/i-encryption-service';
import { KeyManager } from './key-manager';
import { E2EEncryptionService } from './e2e-encryption-service';

/**
 * Register authentication & security components in DI container
 * 
 * Registered services:
 * - 'keyManager' → KeyManager (RSA-2048 key generation & storage)
 * - 'encryptionService' → E2EEncryptionService (hybrid encryption for highlights)
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
}
