/**
 * @file background-highlight-orchestrator.ts
 * @description SW-side subscriber for highlight IPC channels.
 *
 * Sole owner of cross-context highlight write/read wiring. Listens for
 * IPC_HIGHLIGHT_* messages from the content script and persists
 * highlight text as plaintext.
 *
 * @see docs/04-adrs/004-highlight-bridge-wiring.md
 */

import type { RepositoryFacade } from '@/shared/repositories/repository-facade';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import type { ILogger } from '@/shared/utils/logger';

export class BackgroundHighlightOrchestrator {
  constructor(
    private readonly facade: RepositoryFacade,
    private readonly messageBus: IMessageBus,
    private readonly logger: ILogger
  ) {}

  initialize(): void {
    this.messageBus.subscribe('IPC_HIGHLIGHT_ADD', this.onAdd.bind(this));
    this.messageBus.subscribe('IPC_HIGHLIGHT_ADD_MANY', this.onAddMany.bind(this));
    this.messageBus.subscribe('IPC_HIGHLIGHT_UPDATE', this.onUpdate.bind(this));
    this.messageBus.subscribe('IPC_HIGHLIGHT_REMOVE', this.onRemove.bind(this));
    this.messageBus.subscribe('IPC_HIGHLIGHTS_FIND_BY_URL', this.onFindByUrl.bind(this));
    this.messageBus.subscribe('IPC_HIGHLIGHT_FIND_BY_CONTENT_HASH', this.onFindByContentHash.bind(this));
    this.messageBus.subscribe('IPC_HIGHLIGHT_GET', this.onGetHighlight.bind(this));
  }

  /** Pass summaries through unchanged (text is stored plaintext). */
  async enrichWithPlaintext<T extends { id: string; text: string }>(
    summaries: T[]
  ): Promise<T[]> {
    return summaries;
  }

  private async onAdd(highlight: HighlightDataV2) {
    this.logger.info('[bridge] add', { id: highlight.id, url: highlight.url });
    try {
      this.facade.add(highlight);
      this.logger.debug('[bridge] response', { id: highlight.id, ok: true });
      return { success: true, data: undefined as void };
    } catch (e) {
      const err = e as Error;
      this.logger.error('[bridge] add failed', err, { id: highlight.id });
      return { success: false, error: err.message };
    }
  }

  private async onAddMany({ highlights }: { highlights: HighlightDataV2[] }) {
    this.logger.info('[bridge] addMany', { count: highlights.length });
    try {
      this.facade.addMany(highlights);
      this.logger.debug('[bridge] response', { count: highlights.length, ok: true });
      return { success: true, data: undefined as void };
    } catch (e) {
      const err = e as Error;
      this.logger.error('[bridge] addMany failed', err, { count: highlights.length });
      return { success: false, error: err.message };
    }
  }

  private async onUpdate({ id, updates }: { id: string; updates: Partial<HighlightDataV2> }) {
    this.logger.info('[bridge] update', { id });
    try {
      if (typeof updates.text === 'string' && !this.facade.get(id)) {
        return { success: false, error: `Highlight not found: ${id}`, code: 'NOT_FOUND' };
      }
      this.facade.update(id, updates);
      return { success: true, data: undefined as void };
    } catch (e) {
      const err = e as Error;
      this.logger.error('[bridge] update failed', err, { id });
      return { success: false, error: err.message };
    }
  }

  private async onRemove({ id }: { id: string }) {
    this.logger.info('[bridge] remove', { id });
    try {
      this.facade.remove(id);
      return { success: true, data: undefined as void };
    } catch (e) {
      const err = e as Error;
      this.logger.error('[bridge] remove failed', err, { id });
      return { success: false, error: err.message };
    }
  }

  private async onFindByUrl({
    url,
    mode,
  }: {
    url: string;
    mode?: 'basic' | 'pro' | 'pro_xai';
  }) {
    this.logger.info('[bridge] findByUrl', { url, mode });
    try {
      const data = this.facade.getAll().filter((h) => h.url === url);
      return { success: true, data };
    } catch (e) {
      const err = e as Error;
      this.logger.error('[bridge] findByUrl failed', err, { url });
      return { success: false, error: err.message };
    }
  }

  private async onFindByContentHash({ hash }: { hash: string }) {
    this.logger.info('[bridge] findByContentHash', { hash });
    try {
      const data = this.facade.findByContentHash(hash);
      return { success: true, data: data || null };
    } catch (e) {
      const err = e as Error;
      this.logger.error('[bridge] findByContentHash failed', err, { hash });
      return { success: false, error: err.message };
    }
  }

  private async onGetHighlight({ id }: { id: string }) {
    this.logger.info('[bridge] getHighlight', { id });
    try {
      const stored = this.facade.get(id);
      if (!stored) {
        return { success: false, error: `Highlight not found: ${id}`, code: 'NOT_FOUND' };
      }
      return { success: true, data: stored };
    } catch (e) {
      const err = e as Error;
      this.logger.error('[bridge] getHighlight failed', err, { id });
      return { success: false, error: err.message };
    }
  }
}
