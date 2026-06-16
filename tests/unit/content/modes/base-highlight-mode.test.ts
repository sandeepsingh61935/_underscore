/**
 * @file base-highlight-mode.test.ts
 * @description Unit tests for BaseHighlightMode.renderAndRegister defensive behavior.
 *
 * The interface makes `liveRanges` optional (Range objects can't survive
 * structured clone, so payloads from IDB/Supabase may omit them). The
 * base class must NOT throw when called with a payload lacking liveRanges;
 * it should skip the CSS.highlights.add() step but still track the data
 * so removeHighlight can succeed.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { BaseHighlightMode } from '@/content/modes/base-highlight-mode';
import type { HighlightData } from '@/content/modes/highlight-mode.interface';
import type { EventBus } from '@/shared/utils/event-bus';
import type { ILogger } from '@/shared/utils/logger';
import type { IHighlightRepository } from '@/shared/repositories/i-highlight-repository';

class TestMode extends BaseHighlightMode {
    get name(): 'ephemeral' {
        return 'ephemeral';
    }
    async createHighlight(): Promise<string> {
        return '';
    }
    async createFromData(data: HighlightData): Promise<void> {
        await this.renderAndRegister(data);
    }
    async updateHighlight(): Promise<void> {}
    async clearAll(): Promise<void> {}
    // expose protected method for direct testing
    public callRenderAndRegister(data: HighlightData): Promise<void> {
        return this.renderAndRegister(data);
    }
}

describe('BaseHighlightMode.renderAndRegister (liveRanges-optional defensive)', () => {
    let mode: TestMode;
    let eventBus: EventBus;
    let logger: ILogger;
    let repository: IHighlightRepository;

    beforeEach(() => {
        eventBus = { emit: vi.fn(), on: vi.fn(), off: vi.fn() } as unknown as EventBus;
        logger = {
            debug: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            setLevel: vi.fn(),
            getLevel: vi.fn(),
        } as unknown as ILogger;
        repository = {
            add: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            getById: vi.fn(),
            getAll: vi.fn(),
            reload: vi.fn(),
        } as unknown as IHighlightRepository;

        // Override the global Highlight polyfill with one that exposes the
        // API used by base-highlight-mode.ts (add/has/delete on a Range set).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).Highlight = class {
            private ranges = new Set<Range>();
            add(range: Range): void { this.ranges.add(range); }
            has(range: Range): boolean { return this.ranges.has(range); }
            delete(range: Range): boolean { return this.ranges.delete(range); }
        };
        // Reset CSS.highlights registry (Map shape).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (CSS as any).highlights = new Map();

        mode = new TestMode(eventBus, logger, repository);
    });

    it('does not throw when data lacks liveRanges (defensive guard)', async () => {
        const data: HighlightData = {
            id: 'hl-1',
            text: 'no live ranges here',
            contentHash: 'hash-1',
            colorRole: 'yellow',
            type: 'underscore',
            ranges: [],
            // liveRanges intentionally omitted
        };

        await expect(mode.callRenderAndRegister(data)).resolves.toBeUndefined();
    });

    it('still tracks data internally even when liveRanges is missing', async () => {
        const data: HighlightData = {
            id: 'hl-track',
            text: 'tracked',
            contentHash: 'hash-track',
            colorRole: 'yellow',
            type: 'underscore',
            ranges: [],
        };

        await mode.callRenderAndRegister(data);
        expect(mode.getHighlight('hl-track')).toEqual(data);
    });

    it('removeHighlight succeeds when data lacks liveRanges', async () => {
        const data: HighlightData = {
            id: 'hl-remove',
            text: 'removable',
            contentHash: 'hash-remove',
            colorRole: 'yellow',
            type: 'underscore',
            ranges: [],
        };

        await mode.callRenderAndRegister(data);
        await expect(mode.removeHighlight('hl-remove')).resolves.toBeUndefined();
        expect(mode.getHighlight('hl-remove')).toBeNull();
    });

    it('still registers ranges when liveRanges is provided', async () => {
        const range = new Range();
        const data: HighlightData = {
            id: 'hl-with',
            text: 'with range',
            contentHash: 'hash-with',
            colorRole: 'yellow',
            type: 'underscore',
            ranges: [],
            liveRanges: [range],
        };

        await expect(mode.callRenderAndRegister(data)).resolves.toBeUndefined();
        expect(mode.getHighlight('hl-with')).toEqual(data);
    });
});
