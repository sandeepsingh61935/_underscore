/**
 * @file ipc-highlight-repository.ts
 * @description IPC Highlight Repository (Content Script Side)
 *
 * Per ADR-004 + ADR-005: a writable-only adapter that delegates to the
 * Background Worker via IMessageBus. The Background Worker remains the
 * single source of truth for the database.
 *
 * Reads go through RepositoryFacade on the content side, not through
 * this adapter. Implements IWritableHighlightRepository only.
 */

import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import type { MessageResponse } from '@/shared/schemas/message-schemas';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import type {
  IWritableHighlightRepository,
  RepositoryOptions,
} from '@/shared/repositories/i-highlight-repository';

export class IpcHighlightRepository implements IWritableHighlightRepository {
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

  async clear(): Promise<void> {
    throw new Error('clear not supported via IPC adapter; use RepositoryFacade instead');
  }

  async addMany(highlights: HighlightDataV2[]): Promise<void> {
    // TODO(ADR-011): batch via single IPC_HIGHLIGHT_ADD_MANY message.
    for (const highlight of highlights) {
      await this.add(highlight);
    }
  }
}
