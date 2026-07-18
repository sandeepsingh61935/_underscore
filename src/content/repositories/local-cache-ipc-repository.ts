/**
 * @file local-cache-ipc-repository.ts
 * @description Composite repository for the content script.
 *
 * Writes go to a local InMemoryHighlightRepository cache (synchronous,
 * for UI reads via RepositoryFacade) AND are forwarded to the background
 * over IPC (awaited with short retry for cold service-worker wake).
 * Reads come from the local cache only.
 */

import { InMemoryHighlightRepository } from '@/shared/repositories/in-memory-highlight-repository';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import type {
  IHighlightRepository,
  RepositoryOptions,
} from '@/shared/repositories/i-highlight-repository';
import type { HighlightDataV2, SerializedRange } from '@/shared/schemas/highlight-schema';
import { LoggerFactory } from '@/shared/utils/logger';
import { sendBackgroundIpcWithRetry } from '@/shared/messaging/send-background-ipc-with-retry';

export class LocalCacheIpcRepository implements IHighlightRepository {
  private readonly cache = new InMemoryHighlightRepository();
  private readonly logger = LoggerFactory.getLogger('LocalCacheIpcRepository');

  constructor(private readonly messageBus: IMessageBus) {}

  async add(highlight: HighlightDataV2, _options?: RepositoryOptions): Promise<void> {
    await this.cache.add(highlight);
    await this.sendIpc('IPC_HIGHLIGHT_ADD', highlight);
  }

  async addMany(highlights: HighlightDataV2[]): Promise<void> {
    await this.cache.addMany(highlights);
    await this.sendIpc('IPC_HIGHLIGHT_ADD_MANY', { highlights });
  }

  async update(
    id: string,
    updates: Partial<HighlightDataV2>,
    _options?: RepositoryOptions
  ): Promise<void> {
    await this.cache.update(id, updates);
    await this.sendIpc('IPC_HIGHLIGHT_UPDATE', { id, updates });
  }

  async remove(id: string, _options?: RepositoryOptions): Promise<void> {
    await this.cache.remove(id);
    await this.sendIpc('IPC_HIGHLIGHT_REMOVE', { id });
  }

  async clear(): Promise<void> {
    await this.cache.clear();
    await this.sendIpc('IPC_HIGHLIGHT_CLEAR', {});
  }

  findById(id: string): Promise<HighlightDataV2 | null> {
    return this.cache.findById(id);
  }

  findAll(): Promise<HighlightDataV2[]> {
    return this.cache.findAll();
  }

  count(): Promise<number> {
    return this.cache.count();
  }

  exists(id: string): Promise<boolean> {
    return this.cache.exists(id);
  }

  findByUrl(url: string): Promise<HighlightDataV2[]> {
    return this.cache.findByUrl(url);
  }

  findByContentHash(hash: string): Promise<HighlightDataV2 | null> {
    return this.cache.findByContentHash(hash);
  }

  findOverlapping(range: SerializedRange): Promise<HighlightDataV2[]> {
    return this.cache.findOverlapping(range);
  }

  /**
   * Local cache already succeeded; IPC failure after retries is logged only.
   */
  private async sendIpc(type: string, payload: unknown): Promise<void> {
    await sendBackgroundIpcWithRetry(
      this.messageBus,
      { type, payload, timestamp: Date.now() },
      {
        onExhausted: 'log',
        onLogExhausted: (error, attempts) => {
          this.logger.warn(`IPC ${type} failed after retries (cache write already succeeded)`, {
            error: error instanceof Error ? error.message : String(error),
            attempts,
          });
        },
      }
    );
  }
}
