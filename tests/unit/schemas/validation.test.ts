/**
 * @file validation.test.ts
 * @description Unit tests for Zod validation schemas
 */

import { describe, it, expect } from 'vitest';

import {
    MessageSchema,
    ModeConfigSchema,
    HighlightSchema
} from '@/shared/schemas/validation';

describe('Validation Schemas', () => {

    describe('MessageSchema', () => {
        it('accepts valid messages', () => {
            const valid = { type: 'TEST_MSG', payload: { foo: 'bar' } };
            const result = MessageSchema.safeParse(valid);
            expect(result.success).toBe(true);
        });

        it('accepts message without payload', () => {
            const noPayload = { type: 'PING' };
            const result = MessageSchema.safeParse(noPayload);
            expect(result.success).toBe(true);
        });

        it('rejects missing type', () => {
            const invalid = { payload: 123 };
            const result = MessageSchema.safeParse(invalid);
            expect(result.success).toBe(false);
        });

        it('rejects empty type', () => {
            const invalid = { type: '' };
            const result = MessageSchema.safeParse(invalid);
            expect(result.success).toBe(false);
        });
    });

    describe('ModeConfigSchema', () => {
        it('accepts valid mode names', () => {
            const modes = ['walk', 'sprint', 'vault'];
            modes.forEach(mode => {
                const result = ModeConfigSchema.safeParse({ modeName: mode });
                expect(result.success).toBe(true);
            });
        });

        it('rejects invalid mode name', () => {
            const invalid = { modeName: 'invalid-mode' };
            const result = ModeConfigSchema.safeParse(invalid);
            expect(result.success).toBe(false);
        });

        it('accepts optional settings', () => {
            const valid = { modeName: 'walk', settings: { verbose: true } };
            const result = ModeConfigSchema.safeParse(valid);
            expect(result.success).toBe(true);
        });
    });

    describe('HighlightSchema (V2 validation)', () => {
        it('validates minimal highlight data', () => {
            const valid = {
                version: 2,
                id: '12345678-1234-4234-8234-123456789012', // Valid UUID v4 format
                text: 'sample text',
                contentHash: 'a'.repeat(64),
                colorRole: 'yellow',
                type: 'underscore',
                ranges: [{
                    xpath: '/div',
                    startOffset: 0,
                    endOffset: 5,
                    text: 'sample',
                    textBefore: '',
                    textAfter: ''
                }],
                createdAt: new Date()
            };
            const result = HighlightSchema.safeParse(valid);
            if (!result.success) {
                console.error(JSON.stringify(result.error.format(), null, 2));
            }
            expect(result.success).toBe(true);
        });

        it('rejects invalid uuid', () => {
            const invalid = {
                version: 2,
                id: 'bad-uuid', // Invalid
                text: 'text',
                contentHash: 'a'.repeat(64),
                colorRole: 'yellow',
                type: 'underscore',
                ranges: [],
                createdAt: new Date()
            };
            const result = HighlightSchema.safeParse(invalid);
            expect(result.success).toBe(false);
        });
    });
});
