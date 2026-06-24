/**
 * @file local-cache-ipc-repository.ts
 * @description Composite repository for the content script.
 *
 * Writes go to a local InMemoryHighlightRepository cache (synchronous,
 * for UI reads via RepositoryFacade) AND are forwarded to the background
 * over IPC (fire-and-forget, for persistence). Reads come from the local
 * cache only — content-side reads do not hit the background.
 *
 * Replaces the previous DI binding where the content-side facade wrapped
 * a pure InMemoryHighlightRepository and writes died in the tab's memory.
 * Now ephemeral/local mode highlights reach IndexedDB and appear in the
 * popup's home/library view.
 */

import { InMemoryHighlightRepository } from '@/shared/repositories/in-memory-highlight-repository';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import type {
  IHighlightRepository,
  RepositoryOptions,
} from '@/shared/repositories/i-highlight-repository';
import type { HighlightDataV2, SerializedRange } from '@/shared/schemas/highlight-schema';
import { LoggerFactory } from '@/shared/utils/logger';

export class LocalCacheIpcRepository implements IHighlightRepository {
  private readonly cache = new InMemoryHighlightRepository();
  private readonly logger = LoggerFactory.getLogger('LocalCacheIpcRepository');

  constructor(private readonly messageBus: IMessageBus) {}

  // ----- writes: cache + IPC fire-and-forget -----

  async add(highlight: HighlightDataV2, _options?: RepositoryOptions): Promise<void> {
    await this.cache.add(highlight);
    this.sendIpc('IPC_HIGHLIGHT_ADD', highlight);
  }

  async addMany(highlights: HighlightDataV2[]): Promise<void> {
    await this.cache.addMany(highlights);
    this.sendIpc('IPC_HIGHLIGHT_ADD_MANY', { highlights });
  }

  async update(
    id: string,
    updates: Partial<HighlightDataV2>,
    _options?: RepositoryOptions
  ): Promise<void> {
    await this.cache.update(id, updates);
    this.sendIpc('IPC_HIGHLIGHT_UPDATE', { id, updates });
  }

  async remove(id: string, _options?: RepositoryOptions): Promise<void> {
    await this.cache.remove(id);
    this.sendIpc('IPC_HIGHLIGHT_REMOVE', { id });
  }

  async clear(): Promise<void> {
    await this.cache.clear();
    this.sendIpc('IPC_HIGHLIGHT_CLEAR', {});
  }

  // ----- reads: local cache only -----

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

  // ----- internal -----

  /**
   * Fire-and-forget IPC send. Failures are logged but never thrown —
   * the local cache write already succeeded, so a transient IPC outage
   * must not break the user's highlight workflow.
   */
  private sendIpc(type: string, payload: unknown): void {
    this.messageBus
      .send('background', { type, payload, timestamp: Date.now() })
      .catch((err: unknown) => {
        this.logger.warn(`IPC ${type} failed (cache write already succeeded)`, {
          error: err instanceof Error ? err.message : String(err),
        });
      });
  }
}
