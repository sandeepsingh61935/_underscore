/**
 * @file security.test.ts
 * @description Unit tests for security utilities
 */

import { describe, it, expect } from 'vitest';

import { SecurityService } from '@/shared/utils/security';

describe('SecurityService', () => {
    describe('sanitizeHTML', () => {
        it('should allow safe HTML tags', () => {
            const input = '<strong>Bold</strong> <em>Italic</em>';
            const output = SecurityService.sanitizeHTML(input);

            expect(output).toContain('<strong>');
            expect(output).toContain('<em>');
        });

        it('should remove script tags', () => {
            const malicious = '<script>alert("xss")</script>Hello';
            const safe = SecurityService.sanitizeHTML(malicious);

            expect(safe).not.toContain('<script>');
            expect(safe).toContain('Hello');
        });

        it('should remove event handlers', () => {
            const malicious = '<div onclick="alert(1)">Click</div>';
            const safe = SecurityService.sanitizeHTML(malicious);

            expect(safe).not.toContain('onclick');
        });

        it('should remove dangerous attributes', () => {
            const malicious = '<img src=x onerror="alert(1)">';
            const safe = SecurityService.sanitizeHTML(malicious);

            expect(safe).not.toContain('onerror');
        });
    });

    describe('sanitizeText', () => {
        it('should strip all HTML tags', () => {
            const input = '<strong>Bold</strong> text';
            const output = SecurityService.sanitizeText(input);

            expect(output).toBe('Bold text');
            expect(output).not.toContain('<');
        });

        it('should preserve text content', () => {
            const input = 'Plain text <script>evil()</script> more text';
            const output = SecurityService.sanitizeText(input);

            expect(output).toContain('Plain text');
            expect(output).toContain('more text');
            expect(output).not.toContain('<script>');
        });
    });

    describe('sanitizeURL', () => {
        it('should allow valid HTTP URLs', () => {
            const url = 'http://example.com/page';
            const result = SecurityService.sanitizeURL(url);

            expect(result).toBe('http://example.com/page');
        });

        it('should allow valid HTTPS URLs', () => {
            const url = 'https://example.com/secure';
            const result = SecurityService.sanitizeURL(url);

            expect(result).toBe('https://example.com/secure');
        });

        it('should reject javascript: URLs', () => {
            const malicious = 'javascript:alert(1)';
            const result = SecurityService.sanitizeURL(malicious);

            expect(result).toBeNull();
        });

        it('should reject data: URLs', () => {
            const malicious = 'data:text/html,<script>alert(1)</script>';
            const result = SecurityService.sanitizeURL(malicious);

            expect(result).toBeNull();
        });

        it('should reject invalid URLs', () => {
            const invalid = 'not a url';
            const result = SecurityService.sanitizeURL(invalid);

            expect(result).toBeNull();
        });
    });

    describe('isValidHexColor', () => {
        it('should accept valid hex colors', () => {
            expect(SecurityService.isValidHexColor('#FF0000')).toBe(true);
            expect(SecurityService.isValidHexColor('#00ff00')).toBe(true);
            expect(SecurityService.isValidHexColor('#ABCDEF')).toBe(true);
        });

        it('should reject invalid hex colors', () => {
            expect(SecurityService.isValidHexColor('#FFF')).toBe(false);      // Too short
            expect(SecurityService.isValidHexColor('#GGGGGG')).toBe(false);   // Invalid chars
            expect(SecurityService.isValidHexColor('FF0000')).toBe(false);    // No #
            expect(SecurityService.isValidHexColor('#FF00ZZ')).toBe(false);   // Invalid chars
        });
    });

    describe('sanitizeColor', () => {
        it('should return uppercase hex color for valid input', () => {
            const result = SecurityService.sanitizeColor('#ff0000');
            expect(result).toBe('#FF0000');
        });

        it('should return null for invalid color', () => {
            expect(SecurityService.sanitizeColor('red')).toBeNull();
            expect(SecurityService.sanitizeColor('#FFF')).toBeNull();
            expect(SecurityService.sanitizeColor('invalid')).toBeNull();
        });
    });
});
