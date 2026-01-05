/**
 * @file auth-errors.ts
 * @description Authentication-specific error classes
 * @architecture Error Handling Framework (04-error-logging-framework.md)
 */

import { AppError } from '@/background/errors/app-error';

/**
 * Authentication error base class
 */
export class AuthenticationError extends AppError {
    constructor(message: string, context?: Record<string, unknown>) {
        super(message, context, true);
    }

    override toUserMessage(): string {
        return 'Authentication failed. Please try signing in again.';
    }
}

/**
 * Rate limit exceeded error
 */
export class RateLimitError extends AppError {
    constructor(message: string, context?: Record<string, unknown>) {
        super(message, context, true);
    }

    override toUserMessage(): string {
        return 'Too many login attempts. Please try again in 15 minutes.';
    }
}

/**
 * Token encryption/decryption error
 */
export class EncryptionError extends AppError {
    constructor(message: string, context?: Record<string, unknown>) {
        super(message, context, false);
    }

    override toUserMessage(): string {
        return 'Security error occurred. Please try again.';
    }
}

/**
 * Token decryption error
 */
export class DecryptionError extends AppError {
    constructor(message: string, context?: Record<string, unknown>) {
        super(message, context, false);
    }

    override toUserMessage(): string {
        return 'Failed to decrypt authentication data. Please sign in again.';
    }
}

/**
 * Invalid OAuth provider error
 */
export class InvalidProviderError extends AppError {
    constructor(provider: string) {
        super(`Invalid OAuth provider: ${provider}`, { provider }, true);
    }

    override toUserMessage(): string {
        return 'Invalid authentication provider selected.';
    }
}

/**
 * OAuth redirect error
 */
export class OAuthRedirectError extends AppError {
    constructor(message: string, context?: Record<string, unknown>) {
        super(message, context, true);
    }

    override toUserMessage(): string {
        return 'Authentication was cancelled or failed. Please try again.';
    }
}
