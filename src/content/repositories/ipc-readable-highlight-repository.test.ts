/**
 * @file ipc-readable-highlight-repository.test.ts
 * @description Unit tests for the read-side IPC adapter.
 *
 * The content script needs to read highlights from the background on
 * page load (the local in-memory cache is empty after a reload). Per
 * ADR-005 the read side is a separate adapter from the writable IPC
 * adapter. This file tests that adapter.
 *
 * Channel: IPC_HIGHLIGHT_GET_BY_URL
 * Payload: { url: string, mode: 'basic' | 'pro' | 'pro_xai' }
 * Response: { success: true, data: HighlightDataV2[] }
 */

import { describe, it, expect, vi } from 'vitest';
import { IpcReadableHighlightRepository } from './ipc-readable-highlight-repository';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';

function makeBus(impl: (msg: { type: string; payload: unknown }) => Promise<unknown>): IMessageBus {
    const send = <T = unknown>(_target: string, msg: { type: string; payload: unknown }): Promise<T> =>
        impl(msg) as Promise<T>;
    return {
        send,
        subscribe: vi.fn(() => () => {}),
        publish: vi.fn(async () => {}),
    };
}

const modeOf = (m: ModeType) => () => m;

function makeHighlight(over: Partial<HighlightDataV2> = {}): HighlightDataV2 {
    return {
        id: 'h-1',
        text: 'hello',
        contentHash: 'a'.repeat(64),
        colorRole: 'yellow',
        type: 'underscore',
        ranges: [],
        createdAt: new Date('2024-01-01'),
        url: 'https://example.com/a',
        ...over,
    };
}

describe('IpcReadableHighlightRepository', () => {
    it('sends IPC_HIGHLIGHTS_FIND_BY_URL with url and mode on findByUrl', async () => {
        const bus = makeBus(async () => ({ success: true, data: [] as HighlightDataV2[] }));
        const sendSpy = vi.spyOn(bus, 'send');
        const repo = new IpcReadableHighlightRepository(bus, modeOf('basic'));

        await repo.findByUrl('https://example.com/a');

        expect(sendSpy).toHaveBeenCalledWith(
            'background',
            expect.objectContaining({
                type: 'IPC_HIGHLIGHTS_FIND_BY_URL',
                payload: { url: 'https://example.com/a', mode: 'basic' },
                timestamp: expect.any(Number),
            })
        );
    });

    it('returns the data array on a successful response', async () => {
        const items = [makeHighlight({ id: 'h-1' }), makeHighlight({ id: 'h-2' })];
        const bus = makeBus(async () => ({ success: true, data: items }));
        const repo = new IpcReadableHighlightRepository(bus, modeOf('basic'));

        const result = await repo.findByUrl('https://example.com/a');

        expect(result).toEqual(items);
    });

    it('throws when the bus returns success: false after retries', async () => {
        const bus = makeBus(async () => ({ success: false, error: 'boom' }));
        const repo = new IpcReadableHighlightRepository(bus, modeOf('pro'));

        await expect(repo.findByUrl('https://example.com/a')).rejects.toThrow(
            /success: false|boom/
        );
    });

    it('retries findByUrl after a transient IPC failure then succeeds', async () => {
        let attempts = 0;
        const items = [makeHighlight({ id: 'h-restored' })];
        const bus = makeBus(async () => {
            attempts += 1;
            if (attempts === 1) {
                throw new Error('Receiving end does not exist');
            }
            return { success: true, data: items };
        });
        const repo = new IpcReadableHighlightRepository(bus, modeOf('pro_xai'));

        const result = await repo.findByUrl('https://example.com/a');

        expect(attempts).toBeGreaterThanOrEqual(2);
        expect(result).toEqual(items);
    });

    it('findById throws (not supported via read IPC adapter; use facade)', async () => {
        const bus = makeBus(async () => ({ success: true, data: [] }));
        const repo = new IpcReadableHighlightRepository(bus, modeOf('basic'));

        await expect(repo.findById('h-1')).rejects.toThrow();
    });

    it('findAll throws (not supported via read IPC adapter)', async () => {
        const bus = makeBus(async () => ({ success: true, data: [] }));
        const repo = new IpcReadableHighlightRepository(bus, modeOf('basic'));

        await expect(repo.findAll()).rejects.toThrow();
    });
});
