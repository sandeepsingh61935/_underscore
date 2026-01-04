/**
 * @file csp-validator.ts
 * @description Content Security Policy validator for OAuth flows
 * @security Prevents XSS attacks in OAuth redirect pages
 */

import type { ILogger } from '@/shared/interfaces/i-logger';
import type { IAuditLogger } from './interfaces/i-audit-logger';

/**
 * CSP Violation Report
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP#violation_report_syntax
 */
export interface CSPViolationReport {
    'document-uri': string;
    'violated-directive': string;
    'effective-directive': string;
    'original-policy': string;
    'blocked-uri': string;
    'source-file'?: string;
    'line-number'?: number;
    'column-number'?: number;
}

/**
 * CSP Validator
 * 
 * @responsibility Validate CSP for OAuth redirect pages
 * @security Ensures no unsafe-inline scripts in OAuth flow
 */
export class CSPValidator {
    private readonly ALLOWED_DIRECTIVES = [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'", // Allow inline styles for UI
        "img-src 'self' data: https:",
        "connect-src 'self' https://accounts.google.com https://appleid.apple.com",
        "frame-ancestors 'none'",
    ];

    constructor(
        private readonly logger: ILogger,
        private readonly auditLogger?: IAuditLogger
    ) { }

    /**
     * Validate CSP header for OAuth redirect page
     * 
     * @param cspHeader - CSP header value
     * @returns True if valid, false otherwise
     */
    validateCSP(cspHeader: string): boolean {
        if (!cspHeader) {
            this.logger.warn('Missing CSP header');
            return false;
        }

        // Check for unsafe-inline in script-src
        if (this.hasUnsafeInlineScript(cspHeader)) {
            this.logger.error('CSP contains unsafe-inline in script-src', new Error('Unsafe CSP'));
            return false;
        }

        // Check for unsafe-eval
        if (cspHeader.includes('unsafe-eval')) {
            this.logger.warn('CSP contains unsafe-eval');
            return false;
        }

        this.logger.debug('CSP validated successfully');
        return true;
    }

    /**
     * Handle CSP violation report
     * 
     * @param report - CSP violation report from browser
     */
    async handleViolation(report: CSPViolationReport): Promise<void> {
        this.logger.warn('CSP violation detected', {
            directive: report['violated-directive'],
            blockedUri: report['blocked-uri'],
            documentUri: report['document-uri'],
        });

        // Log to audit logger if available
        if (this.auditLogger) {
            await this.auditLogger.logSecurityEvent({
                type: 'CSP_VIOLATION',
                details: {
                    violatedDirective: report['violated-directive'],
                    blockedUri: report['blocked-uri'],
                    documentUri: report['document-uri'],
                    sourceFile: report['source-file'],
                    lineNumber: report['line-number'],
                },
            });
        }
    }

    /**
     * Generate recommended CSP header for OAuth pages
     * 
     * @returns CSP header value
     */
    generateRecommendedCSP(): string {
        return this.ALLOWED_DIRECTIVES.join('; ');
    }

    /**
     * Check if CSP has unsafe-inline in script-src
     */
    private hasUnsafeInlineScript(csp: string): boolean {
        // Extract script-src directive
        const scriptSrcMatch = csp.match(/script-src\s+([^;]+)/);
        if (!scriptSrcMatch) {
            // No script-src means default-src applies
            const defaultSrcMatch = csp.match(/default-src\s+([^;]+)/);
            if (defaultSrcMatch && defaultSrcMatch[1].includes('unsafe-inline')) {
                return true;
            }
            return false;
        }

        return scriptSrcMatch[1].includes('unsafe-inline');
    }
}
