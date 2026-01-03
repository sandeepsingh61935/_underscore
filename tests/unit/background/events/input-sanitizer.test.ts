/**
 * @file input-sanitizer.test.ts
 * @description Unit tests for InputSanitizer (XSS protection)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InputSanitizer } from '@/background/events/input-sanitizer';
import type { ILogger } from '@/shared/interfaces/i-logger';

const createMockLogger = (): ILogger => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setLevel: vi.fn(),
    getLevel: vi.fn(() => 1 as any),
});

describe('InputSanitizer', () => {
    let sanitizer: InputSanitizer;
    let logger: ILogger;

    beforeEach(() => {
        logger = createMockLogger();
        sanitizer = new InputSanitizer(logger);
    });

    describe('XSS Protection', () => {
        it('should sanitize XSS script tag', () => {
            const malicious = '<script>alert("xss")</script>Hello';
            const result = sanitizer.sanitizeText(malicious);

            expect(result).toBe('Hello');
            expect(result).not.toContain('<script>');
        });

        it('should block javascript: URL', () => {
            const malicious = 'javascript:alert(1)';
            const result = sanitizer.sanitizeURL(malicious);

            expect(result).toBeNull();
        });
    });

    describe('Safe Content Preservation', () => {
        it('should preserve safe HTML tags', () => {
            const safe = '<strong>bold</strong>';
            const result = sanitizer.sanitizeHTML(safe);

            expect(result).toBe('<strong>bold</strong>');
        });

        it('should preserve Unicode text', () => {
            const unicode = '日本語 emoji 👍 ñoño';
            const result = sanitizer.sanitizeText(unicode);

            expect(result).toBe(unicode);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty string', () => {
            const result = sanitizer.sanitizeText('');

            expect(result).toBe('');
        });
    });
});
