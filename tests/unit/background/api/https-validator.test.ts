/**
 * @file https-validator.test.ts
 * @description Unit tests for HTTPSValidator
 * @testing-strategy Security validation, protocol enforcement
 */

import { describe, it, expect } from 'vitest';
import { HTTPSValidator, SecurityError } from '@/background/api/https-validator';

describe('HTTPSValidator', () => {
    describe('Test 1: HTTPS URLs pass validation', () => {
        it('should allow valid HTTPS URL', () => {
            // Act & Assert
            expect(() => {
                HTTPSValidator.validate('https://api.supabase.co');
            }).not.toThrow();
        });

        it('should allow HTTPS with port', () => {
            // Act & Assert
            expect(() => {
                HTTPSValidator.validate('https://api.supabase.co:443');
            }).not.toThrow();
        });

        it('should allow HTTPS with path', () => {
            // Act & Assert
            expect(() => {
                HTTPSValidator.validate('https://api.supabase.co/rest/v1/highlights');
            }).not.toThrow();
        });
    });

    describe('Test 2: HTTP URLs throw SecurityError', () => {
        it('should reject HTTP URL', () => {
            // Act & Assert
            expect(() => {
                HTTPSValidator.validate('http://api.supabase.co');
            }).toThrow(SecurityError);
        });

        it('should include protocol in error message', () => {
            // Act & Assert
            try {
                HTTPSValidator.validate('http://api.supabase.co');
                expect.fail('Should have thrown SecurityError');
            } catch (error) {
                expect(error).toBeInstanceOf(SecurityError);
                expect((error as SecurityError).message).toContain('http://');
                expect((error as SecurityError).message).toContain('HTTPS');
            }
        });

        it('should reject FTP protocol', () => {
            // Act & Assert
            expect(() => {
                HTTPSValidator.validate('ftp://files.example.com');
            }).toThrow(SecurityError);
        });
    });

    describe('Test 3: Invalid URLs throw TypeError', () => {
        it('should reject malformed URL', () => {
            // Act & Assert
            expect(() => {
                HTTPSValidator.validate('not-a-valid-url');
            }).toThrow(TypeError);
        });

        it('should reject empty string', () => {
            // Act & Assert
            expect(() => {
                HTTPSValidator.validate('');
            }).toThrow(TypeError);
        });

        it('should include URL in error message', () => {
            // Act & Assert
            try {
                HTTPSValidator.validate('invalid-url');
                expect.fail('Should have thrown TypeError');
            } catch (error) {
                expect(error).toBeInstanceOf(TypeError);
                expect((error as TypeError).message).toContain('invalid-url');
            }
        });
    });

    describe('Test 4: Localhost exemption for development', () => {
        it('should allow localhost with HTTP', () => {
            // Act & Assert
            expect(() => {
                HTTPSValidator.validate('http://localhost:3000');
            }).not.toThrow();
        });

        it('should allow 127.0.0.1 with HTTP', () => {
            // Act & Assert
            expect(() => {
                HTTPSValidator.validate('http://127.0.0.1:8080');
            }).not.toThrow();
        });

        it('should allow IPv6 localhost', () => {
            // Act & Assert
            expect(() => {
                HTTPSValidator.validate('http://[::1]:3000');
            }).not.toThrow();
        });

        it('should allow private network (192.168.x.x)', () => {
            // Act & Assert
            expect(() => {
                HTTPSValidator.validate('http://192.168.1.100:3000');
            }).not.toThrow();
        });

        it('should allow private network (10.x.x.x)', () => {
            // Act & Assert
            expect(() => {
                HTTPSValidator.validate('http://10.0.0.5:8080');
            }).not.toThrow();
        });

        it('should allow .local domains', () => {
            // Act & Assert
            expect(() => {
                HTTPSValidator.validate('http://myserver.local:3000');
            }).not.toThrow();
        });
    });

    describe('Test 5: Edge cases', () => {
        it('should handle URL with query parameters', () => {
            // Act & Assert
            expect(() => {
                HTTPSValidator.validate('https://api.supabase.co/rest/v1?key=value');
            }).not.toThrow();
        });

        it('should handle URL with hash fragment', () => {
            // Act & Assert
            expect(() => {
                HTTPSValidator.validate('https://api.supabase.co/docs#section');
            }).not.toThrow();
        });

        it('should handle URL with authentication', () => {
            // Act & Assert
            expect(() => {
                HTTPSValidator.validate('https://user:pass@api.supabase.co');
            }).not.toThrow();
        });
    });
});
