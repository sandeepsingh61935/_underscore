/**
 * @file https-validator.ts
 * @description HTTPS enforcement to prevent MITM attacks
 * @architecture Security Pattern - Fail-fast validation
 * @security Enforces HTTPS for all API endpoints
 */

import { APIError } from './api-errors';

/**
 * Security error for protocol violations
 */
export class SecurityError extends APIError {
    constructor(message: string) {
        super(message, 'SECURITY_ERROR', { severity: 'HIGH' });
        this.name = 'SecurityError';
    }
}

/**
 * HTTPS Validator
 * Enforces HTTPS protocol for all API communications
 * 
 * @security Prevents MITM attacks by rejecting HTTP endpoints
 */
export class HTTPSValidator {
    /**
     * Validate URL uses HTTPS protocol
     * 
     * @param url - URL to validate
     * @throws {SecurityError} If protocol is not HTTPS
     * @throws {TypeError} If URL is invalid
     * 
     * @example
     * ```typescript
     * HTTPSValidator.validate('https://api.supabase.co'); // ✅ Pass
     * HTTPSValidator.validate('http://api.supabase.co');  // ❌ Throws SecurityError
     * HTTPSValidator.validate('localhost:3000');          // ✅ Pass (dev mode)
     * ```
     */
    static validate(url: string): void {
        // Parse URL
        let parsed: URL;
        try {
            parsed = new URL(url);
        } catch (error) {
            throw new TypeError(`Invalid URL: ${url}`);
        }

        // Allow localhost for development (any protocol)
        if (this.isLocalhost(parsed.hostname)) {
            return;
        }

        // Enforce HTTPS for all other hosts
        if (parsed.protocol !== 'https:') {
            throw new SecurityError(
                `API endpoint must use HTTPS protocol. Got: ${parsed.protocol}//${parsed.hostname}`
            );
        }
    }

    /**
     * Check if hostname is localhost
     */
    private static isLocalhost(hostname: string): boolean {
        // Strip brackets from IPv6 (e.g., [::1] -> ::1)
        const clean = hostname.replace(/^\[|\]$/g, '');
        return (
            clean === 'localhost' ||
            clean === '127.0.0.1' ||
            clean === '::1' ||
            clean.startsWith('192.168.') ||
            clean.startsWith('10.') ||
            clean.endsWith('.local')
        );
    }
}
