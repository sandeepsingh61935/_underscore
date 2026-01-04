/**
 * @file csp-validator.test.ts
 * @description Unit tests for CSPValidator
 * @testing-strategy Test CSP parsing and validation logic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CSPValidator, type CSPViolationReport } from '@/background/auth/csp-validator';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { IAuditLogger } from '@/background/auth/interfaces/i-audit-logger';

describe('CSPValidator', () => {
    let validator: CSPValidator;
    let mockLogger: ILogger;
    let mockAuditLogger: IAuditLogger;

    beforeEach(() => {
        mockLogger = {
            debug: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            setLevel: vi.fn(),
            getLevel: vi.fn(),
        };

        mockAuditLogger = {
            logAuthEvent: vi.fn(),
            logDataAccess: vi.fn(),
            logSecurityEvent: vi.fn(),
            query: vi.fn(),
        };

        validator = new CSPValidator(mockLogger, mockAuditLogger);
    });

    describe('validateCSP()', () => {
        it('should accept valid CSP without unsafe-inline', () => {
            const csp = "default-src 'self'; script-src 'self'";

            const result = validator.validateCSP(csp);

            expect(result).toBe(true);
            expect(mockLogger.debug).toHaveBeenCalled();
        });

        it('should reject CSP with unsafe-inline in script-src', () => {
            const csp = "default-src 'self'; script-src 'self' 'unsafe-inline'";

            const result = validator.validateCSP(csp);

            expect(result).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('unsafe-inline'),
                expect.any(Error)
            );
        });

        it('should reject CSP with unsafe-inline in default-src (no script-src)', () => {
            const csp = "default-src 'self' 'unsafe-inline'";

            const result = validator.validateCSP(csp);

            expect(result).toBe(false);
        });

        it('should reject CSP with unsafe-eval', () => {
            const csp = "default-src 'self'; script-src 'self' 'unsafe-eval'";

            const result = validator.validateCSP(csp);

            expect(result).toBe(false);
            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('unsafe-eval')
            );
        });

        it('should reject missing CSP header', () => {
            const result = validator.validateCSP('');

            expect(result).toBe(false);
            expect(mockLogger.warn).toHaveBeenCalledWith('Missing CSP header');
        });

        it('should allow unsafe-inline in style-src', () => {
            const csp = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'";

            const result = validator.validateCSP(csp);

            expect(result).toBe(true);
        });
    });

    describe('handleViolation()', () => {
        it('should log CSP violation', async () => {
            const report: CSPViolationReport = {
                'document-uri': 'https://example.com/oauth',
                'violated-directive': 'script-src',
                'effective-directive': 'script-src',
                'original-policy': "script-src 'self'",
                'blocked-uri': 'https://evil.com/script.js',
            };

            await validator.handleViolation(report);

            expect(mockLogger.warn).toHaveBeenCalledWith(
                'CSP violation detected',
                expect.objectContaining({
                    directive: 'script-src',
                    blockedUri: 'https://evil.com/script.js',
                })
            );
        });

        it('should log violation to audit logger', async () => {
            const report: CSPViolationReport = {
                'document-uri': 'https://example.com/oauth',
                'violated-directive': 'script-src',
                'effective-directive': 'script-src',
                'original-policy': "script-src 'self'",
                'blocked-uri': 'https://evil.com/script.js',
                'source-file': 'index.html',
                'line-number': 42,
            };

            await validator.handleViolation(report);

            expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith({
                type: 'CSP_VIOLATION',
                details: expect.objectContaining({
                    violatedDirective: 'script-src',
                    blockedUri: 'https://evil.com/script.js',
                    sourceFile: 'index.html',
                    lineNumber: 42,
                }),
            });
        });
    });

    describe('generateRecommendedCSP()', () => {
        it('should generate secure CSP header', () => {
            const csp = validator.generateRecommendedCSP();

            expect(csp).toContain("default-src 'self'");
            expect(csp).toContain("script-src 'self'");
            // Ensure script-src doesn't have unsafe-inline (style-src can have it)
            const scriptSrcDirective = csp.match(/script-src\s+[^;]+/)?.[0];
            expect(scriptSrcDirective).not.toContain('unsafe-inline');
            expect(csp).not.toContain('unsafe-eval');
        });

        it('should allow specific OAuth providers in connect-src', () => {
            const csp = validator.generateRecommendedCSP();

            expect(csp).toContain('https://accounts.google.com');
            expect(csp).toContain('https://appleid.apple.com');
        });

        it('should prevent framing', () => {
            const csp = validator.generateRecommendedCSP();

            expect(csp).toContain("frame-ancestors 'none'");
        });
    });
});
