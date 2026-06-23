/**
 * @file ipc-readable-highlight-repository.ts
 * @description Read-side IPC adapter for the content script.
 *
 * Per ADR-005, the content-script IPC adapter is split:
 * - `IpcHighlightRepository` is writable-only (IWritableHighlightRepository).
 * - This class is read-only (IReadableHighlightRepository).
 *
 * restoreHighlights() in content.ts needs the read side so it can pull
 * persisted highlights from the background on page load. The local
 * in-memory cache is empty after a reload, so reads MUST go through the
 * background's real storage (IndexedDB or DualWrite, per mode).
 *
 * The background's `IPC_HIGHLIGHTS_FIND_BY_URL` handler (already wired
 * in BackgroundHighlightOrchestrator) reads from the facade cache which
 * was populated from IDB at startup. This adapter adds the current mode
 * to the payload so the handler can apply the 24h TTL filter in
 * ephemeral mode.
 *
 * Mode is resolved per-call from the supplied mode-state getter, so a
 * mode switch takes effect on the next restore.
 */

import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import type { IReadableHighlightRepository } from '@/shared/repositories/i-highlight-repository';
import type { HighlightDataV2, SerializedRange } from '@/shared/schemas/highlight-schema';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import type { StorageMode } from '@/shared/types/storage';

export class IpcReadableHighlightRepository implements IReadableHighlightRepository {
    constructor(
        private readonly messageBus: IMessageBus,
        private readonly getMode: () => ModeType
    ) {}

    async findByUrl(url: string): Promise<HighlightDataV2[]> {
        const mode = this.getMode() as StorageMode;
        const res = await this.messageBus.send<{
            success: boolean;
            data?: HighlightDataV2[];
            error?: string;
        }>('background', {
            type: 'IPC_HIGHLIGHTS_FIND_BY_URL',
            payload: { url, mode },
            timestamp: Date.now(),
        });
        if (!res.success || !res.data) {
            throw new Error(res.error ?? 'IPC_HIGHLIGHTS_FIND_BY_URL failed');
        }
        return res.data;
    }

    // The other read methods are not used by restoreHighlights. Per ADR-005
    // they remain on the local facade (read+write) and on the background's
    // full repository; not on this read IPC adapter.
    async findById(_id: string): Promise<HighlightDataV2 | null> {
        throw new Error('findById not supported via read IPC adapter; use RepositoryFacade');
    }
    async findAll(): Promise<HighlightDataV2[]> {
        throw new Error('findAll not supported via read IPC adapter; use RepositoryFacade');
    }
    async count(): Promise<number> {
        throw new Error('count not supported via read IPC adapter; use RepositoryFacade');
    }
    async exists(_id: string): Promise<boolean> {
        throw new Error('exists not supported via read IPC adapter; use RepositoryFacade');
    }
    async findByContentHash(_hash: string): Promise<HighlightDataV2 | null> {
        throw new Error('findByContentHash not supported via read IPC adapter; use RepositoryFacade');
    }
    async findOverlapping(_range: SerializedRange): Promise<HighlightDataV2[]> {
        throw new Error('findOverlapping not supported via read IPC adapter; use RepositoryFacade');
    }
    async clear(): Promise<void> {
        throw new Error('clear not supported via read IPC adapter; use RepositoryFacade');
    }
}
