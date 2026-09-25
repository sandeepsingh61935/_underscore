/**
 * @file content-highlight-metadata-client.ts
 * @description Sends highlight metadata updates (notes, tags) to background.
 */

import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import {
  UPDATE_HIGHLIGHT_METADATA,
  type MessageResponse,
} from '@/shared/schemas/message-schemas';

const GENERIC_SAVE_ERROR = "Couldn't save. Try again.";

const TAG_GATE_COPY: Record<string, string> = {
  AUTH_REQUIRED: 'Sign in to add tags.',
  PAID_REQUIRED: 'Tags need a paid account.',
  CAPABILITY_DENIED: 'Tags are not available.',
  WRONG_SCOPE: 'Tags are not available for this highlight.',
};

export function annotationSaveError(
  field: 'notes' | 'tags',
  responseError: string | undefined
): string {
  if (field === 'tags' && responseError && TAG_GATE_COPY[responseError]) {
    return TAG_GATE_COPY[responseError];
  }
  return GENERIC_SAVE_ERROR;
}

export class ContentHighlightMetadataClient {
  constructor(private readonly messageBus: IMessageBus) {}

  async update(payload: {
    id: string;
    notes?: string;
    tags?: string[];
  }): Promise<{ ok: true } | { ok: false; error: string }> {
    const response = await this.messageBus.send<MessageResponse<undefined>>('background', {
      type: UPDATE_HIGHLIGHT_METADATA,
      payload,
      timestamp: Date.now(),
    });
    if (!response?.success) {
      const field = payload.tags !== undefined ? 'tags' : 'notes';
      return { ok: false, error: annotationSaveError(field, response?.error) };
    }
    return { ok: true };
  }
}
