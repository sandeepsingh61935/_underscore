import { describe, it, expect } from 'vitest';
import { toStorageFormat, fromStorageFormat, type RuntimeHighlight } from '@/content/highlight-type-bridge';

// Mocks
const mockRange = {
    startContainer: {},
    endContainer: {},
    startOffset: 0,
    endOffset: 5,
    toString: () => 'test text'
};

const mockSerializedRange = {
    xpath: '/html/body/div[1]',
    startOffset: 0,
    endOffset: 5,
    text: 'test text',
    textBefore: '',
    textAfter: ''
};

describe('Highlight Type Bridge', () => {
    describe('toStorageFormat', () => {
        it('should convert RuntimeHighlight (legacy single range) to V2 storage format', async () => {
            const runtime: RuntimeHighlight = {
                id: 'hl-123',
                text: 'test text',
                color: 'yellow',
                type: 'underscore',
                createdAt: new Date('2024-01-01'),
                range: mockSerializedRange // Legacy format
            };

            const stored = await toStorageFormat(runtime);

            expect(stored).toEqual(expect.objectContaining({
                version: 2,
                id: 'hl-123',
                text: 'test text',
                color: 'yellow',
                type: 'underscore',
                createdAt: new Date('2024-01-01'),
                ranges: [mockSerializedRange]
            }));
            expect(stored.contentHash).toBeDefined();
        });

        it('should convert RuntimeHighlight (new multi-range) to V2 storage format', async () => {
            const runtime: RuntimeHighlight = {
                id: 'hl-456',
                text: 'test text',
                color: 'green',
                type: 'highlight',
                createdAt: new Date('2024-01-02'),
                ranges: [mockSerializedRange, mockSerializedRange] // New format
            };

            const stored = await toStorageFormat(runtime);

            expect(stored.ranges).toHaveLength(2);
            expect(stored.id).toBe('hl-456');
        });

        it('should throw error if no ranges provided', async () => {
            const runtime: RuntimeHighlight = {
                id: 'bad-hl',
                text: 'oops',
                color: 'red',
                type: 'underscore',
                createdAt: new Date()
            };

            await expect(toStorageFormat(runtime)).rejects.toThrow('Highlight must have at least one range');
        });
    });

    describe('fromStorageFormat', () => {
        it('should convert V2 storage format to partial runtime object', () => {
            const stored = {
                version: 2,
                id: 'hl-789',
                text: 'stored text',
                color: 'purple',
                type: 'underscore',
                createdAt: new Date('2024-01-03'),
                contentHash: 'abc',
                ranges: [mockSerializedRange],
                colorRole: 'purple'
            } as const;

            const runtime = fromStorageFormat(stored as any);

            expect(runtime).toEqual({
                id: 'hl-789',
                text: 'stored text',
                color: 'purple',
                type: 'underscore',
                createdAt: new Date('2024-01-03'),
                range: mockSerializedRange
            });
        });
    });
});
