import type { IHighlightRepository, RepositoryOptions } from '@/background/repositories/i-highlight-repository';
import type { HighlightDataV2, SerializedRange } from '@/shared/schemas/highlight-schema';

/**
 * IPC Highlight Repository (Content Script Side)
 * 
 * Acts as a dumb terminal adapter that implements IHighlightRepository
 * but delegates all write operations to the Background Worker via Chrome IPC.
 * This ensures the Background Worker remains the single source of truth for the database.
 */
export class IpcHighlightRepository implements IHighlightRepository {
    async add(highlight: HighlightDataV2, _options?: RepositoryOptions): Promise<void> {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                type: 'IPC_HIGHLIGHT_ADD',
                payload: highlight,
                timestamp: Date.now(),
            }, () => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve();
                }
            });
        });
    }

    async update(id: string, updates: Partial<HighlightDataV2>, _options?: RepositoryOptions): Promise<void> {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                type: 'IPC_HIGHLIGHT_UPDATE',
                payload: { id, updates },
                timestamp: Date.now(),
            }, () => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve();
                }
            });
        });
    }

    async remove(id: string, _options?: RepositoryOptions): Promise<void> {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                type: 'IPC_HIGHLIGHT_REMOVE',
                payload: { id },
                timestamp: Date.now(),
            }, () => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve();
                }
            });
        });
    }

    async findByUrl(url: string): Promise<HighlightDataV2[]> {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                type: 'IPC_HIGHLIGHTS_FIND_BY_URL',
                payload: { url },
                timestamp: Date.now(),
            }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else if (response && response.success) {
                    resolve(response.data);
                } else {
                    reject(new Error(response?.error || 'Failed to fetch highlights by url via IPC'));
                }
            });
        });
    }

    // ============================================
    // Read operations (Should be handled via state or events, not direct IPC calls here)
    // ============================================

    async findById(_id: string): Promise<HighlightDataV2 | null> {
        throw new Error('findById not implemented in IpcHighlightRepository');
    }

    async findAll(): Promise<HighlightDataV2[]> {
        throw new Error('findAll not implemented in IpcHighlightRepository');
    }

    async count(): Promise<number> {
        throw new Error('count not implemented in IpcHighlightRepository');
    }

    async exists(_id: string): Promise<boolean> {
        throw new Error('exists not implemented in IpcHighlightRepository');
    }

    async clear(): Promise<void> {
        throw new Error('clear not implemented in IpcHighlightRepository');
    }

    async findByContentHash(_hash: string): Promise<HighlightDataV2 | null> {
        throw new Error('findByContentHash not implemented in IpcHighlightRepository');
    }

    async findOverlapping(_range: SerializedRange): Promise<HighlightDataV2[]> {
        throw new Error('findOverlapping not implemented in IpcHighlightRepository');
    }

    async addMany(highlights: HighlightDataV2[]): Promise<void> {
        for (const highlight of highlights) {
            await this.add(highlight);
        }
    }
}
