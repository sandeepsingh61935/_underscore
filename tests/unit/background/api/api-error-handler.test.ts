import { describe, it, expect } from 'vitest';
import { APIErrorHandler } from '@/background/api/api-error-handler';
import {
    APIError,
    AuthenticationError,
    NetworkError,
    RateLimitError,
    ServerError,
    ValidationError,
    NotFoundError,
} from '@/background/api/api-errors';

describe('APIErrorHandler', () => {
    describe('handle()', () => {
        it('should return APIError as-is if passed', () => {
            const original = new AuthenticationError('Auth failed');
            const result = APIErrorHandler.handle(original);
            expect(result).toBe(original);
            expect(result).toBeInstanceOf(AuthenticationError);
        });

        it('should handle null or undefined gracefully', () => {
            const err1 = APIErrorHandler.handle(null);
            expect(err1).toBeInstanceOf(APIError);
            expect(err1.message).toContain('Unknown error');

            const err2 = APIErrorHandler.handle(undefined);
            expect(err2).toBeInstanceOf(APIError);
        });

        // Authentication
        it('should transform 401/403/PGRST301 to AuthenticationError', () => {
            const cases = [
                { code: '401', msg: 'Unauthorized' },
                { code: 403, msg: 'Forbidden' }, // Number type
                { code: 'PGRST301', msg: 'JWT Expired' },
            ];

            cases.forEach((c) => {
                const err = APIErrorHandler.handle({ code: c.code, message: c.msg });
                expect(err).toBeInstanceOf(AuthenticationError);
                expect(err.message).toBe(c.msg);
            });
        });

        // Rate Limit
        it('should transform 429 to RateLimitError with retry-after', () => {
            const err = APIErrorHandler.handle({
                code: '429',
                message: 'Too many requests',
                headers: { 'retry-after': '60' },
            }) as RateLimitError;

            expect(err).toBeInstanceOf(RateLimitError);
            expect(err.retryAfter).toBe(60);
        });

        // Server Error
        it('should transform 5xx and PGRST000 to ServerError', () => {
            const cases = ['500', '502', '503', 'PGRST000'];

            cases.forEach((code) => {
                const err = APIErrorHandler.handle({ code, message: 'Server boom' });
                expect(err).toBeInstanceOf(ServerError);
                // Safe access with optional chaining and type assertion if needed, but context is generic
                expect(err.context?.['statusCode']).toBe(code === 'PGRST000' ? 500 : parseInt(code));
            });
        });

        // Validation Error
        it('should transform 400 and Postgres constraint errors to ValidationError', () => {
            const cases = [
                '400',
                'PGRST103', // Invalid input syntax
                '23505',    // Unique violation
                '23503',    // Foreign key violation
            ];

            cases.forEach((code) => {
                const err = APIErrorHandler.handle({ code, message: 'Bad input' });
                expect(err).toBeInstanceOf(ValidationError);
            });
        });

        // Not Found
        it('should transform 404 and PGRST116 to NotFoundError', () => {
            const cases = ['404', 'PGRST116'];

            cases.forEach((code) => {
                const err = APIErrorHandler.handle({ code, message: 'Not found' });
                expect(err).toBeInstanceOf(NotFoundError);
            });
        });

        // Network Error
        it('should detect network errors from message or type', () => {
            // Fetch error simulation
            const err1 = APIErrorHandler.handle(new TypeError('Failed to fetch'));
            expect(err1).toBeInstanceOf(NetworkError);

            const err2 = APIErrorHandler.handle({ message: 'Network request failed' });
            expect(err2).toBeInstanceOf(NetworkError);
        });

        // Fallback
        it('should fallback to generic APIError for unknown codes', () => {
            const err = APIErrorHandler.handle({ code: '999', message: 'Weird error' });
            expect(err).toBeInstanceOf(APIError);
            expect(err.code).toBe('API_ERROR');
            expect(err.message).toBe('Weird error');
            expect(err.context?.['code']).toBe('999');
        });

        // Use Case: Supabase "error" object structure
        it('should handle Supabase-style error objects', () => {
            const supabaseError = {
                message: 'row restriction',
                code: '42501', // RLS violation (treat as generic or auth? mapped to default here)
                details: null,
                hint: null
            };

            const err = APIErrorHandler.handle(supabaseError);
            expect(err).toBeInstanceOf(APIError);
            // 42501 is technically "insufficient_privilege" but typicaly falls to generic if not mapped
        });
    });
});
