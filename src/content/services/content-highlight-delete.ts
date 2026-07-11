import type { DeleteResult } from '@/background/services/highlight-delete-service';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import type { MessageResponse } from '@/shared/schemas/message-schemas';
import {
  IPC_HIGHLIGHT_DELETE_SCOPE,
  IPC_HIGHLIGHT_UNDO_DELETE,
} from '@/shared/schemas/message-schemas';

export type ContentDeleteOutcome =
  | { ok: true; data: DeleteResult & { success: true } }
  | { ok: false; error: string; code?: string };

/**
 * Content-script seam for scoped highlight delete + undo (background authority).
 */
export class ContentHighlightDeleteClient {
  constructor(private readonly messageBus: IMessageBus) {}

  async deleteHighlight(id: string): Promise<ContentDeleteOutcome> {
    return this.sendDelete({ scope: 'highlight', id });
  }

  async undoDelete(): Promise<ContentDeleteOutcome> {
    const response = await this.messageBus.send<MessageResponse<DeleteResult>>('background', {
      type: IPC_HIGHLIGHT_UNDO_DELETE,
      payload: {},
      timestamp: Date.now(),
    });

    if (!response?.success) {
      return { ok: false, error: response?.error ?? 'Undo failed' };
    }

    const data = response.data;
    if (!data.success) {
      return { ok: false, error: data.error, code: data.code };
    }

    return { ok: true, data };
  }

  private async sendDelete(
    payload: { scope: 'highlight'; id: string },
  ): Promise<ContentDeleteOutcome> {
    const response = await this.messageBus.send<MessageResponse<DeleteResult>>('background', {
      type: IPC_HIGHLIGHT_DELETE_SCOPE,
      payload,
      timestamp: Date.now(),
    });

    if (!response?.success) {
      return { ok: false, error: response?.error ?? 'Delete failed' };
    }

    const data = response.data;
    if (!data.success) {
      return { ok: false, error: data.error, code: data.code };
    }

    return { ok: true, data };
  }
}
