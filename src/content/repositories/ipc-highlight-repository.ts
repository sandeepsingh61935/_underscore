/**
 * @file ipc-highlight-repository.ts
 * @description IPC Highlight Repository (Content Script Side)
 *
 * Per ADR-004: this adapter delegates writes to the Background Worker via
 * IMessageBus. Per ADR-005 (separate step): this adapter will be narrowed
 * to IWritableHighlightRepository only, with reads going through
 * RepositoryFacade. For now it still implements IHighlightRepository so the
 * existing DI wiring is preserved.
 */

import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import type { MessageResponse } from '@/shared/schemas/message-schemas';
import type { HighlightDataV2, SerializedRange } from '@/shared/schemas/highlight-schema';
import type { IHighlightRepository, RepositoryOptions } from '@/shared/repositories/i-highlight-repository';

export class IpcHighlightRepository implements IHighlightRepository {
  constructor(private readonly messageBus: IMessageBus) {}

  async add(highlight: HighlightDataV2, _options?: RepositoryOptions): Promise<void> {
    await this.messageBus.send<MessageResponse<void>>('background', {
      type: 'IPC_HIGHLIGHT_ADD',
      payload: highlight as unknown as object,
      timestamp: Date.now(),
    });
  }

  async update(id: string, updates: Partial<HighlightDataV2>, _options?: RepositoryOptions): Promise<void> {
    await this.messageBus.send<MessageResponse<void>>('background', {
      type: 'IPC_HIGHLIGHT_UPDATE',
      payload: { id, updates } as unknown as object,
      timestamp: Date.now(),
    });
  }

  async remove(id: string, _options?: RepositoryOptions): Promise<void> {
    await this.messageBus.send<MessageResponse<void>>('background', {
      type: 'IPC_HIGHLIGHT_REMOVE',
      payload: { id } as unknown as object,
      timestamp: Date.now(),
    });
  }

  async addMany(highlights: HighlightDataV2[]): Promise<void> {
    // TODO(ADR-011): batch via single IPC_HIGHLIGHT_ADD_MANY message.
    for (const highlight of highlights) {
      await this.add(highlight);
    }
  }

  // ============================================
  // Read operations — TODO(ADR-005): migrate to RepositoryFacade.
  // Throwing preserves today's contract until the split lands.
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

  async findOverlapping(_range: SerializedRange): Promise<HighlightDataV2[]> {
    throw new Error('findOverlapping not implemented in IpcHighlightRepository');
  }

  async findByUrl(url: string): Promise<HighlightDataV2[]> {
    const response = await this.messageBus.send<MessageResponse<HighlightDataV2[]>>('background', {
      type: 'IPC_HIGHLIGHTS_FIND_BY_URL',
      payload: { url } as unknown as object,
      timestamp: Date.now(),
    });
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch highlights by url via IPC');
    }
    return response.data;
  }

  async findByContentHash(hash: string): Promise<HighlightDataV2 | null> {
    const response = await this.messageBus.send<MessageResponse<HighlightDataV2 | null>>('background', {
      type: 'IPC_HIGHLIGHT_FIND_BY_CONTENT_HASH',
      payload: { hash } as unknown as object,
      timestamp: Date.now(),
    });
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch highlight by content hash via IPC');
    }
    return response.data ?? null;
  }
}
