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

import { notifyLibraryDataChanged } from '@/background/services/library-change-notifier';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import type { RepositoryFacade } from '@/shared/repositories/repository-facade';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import type { ILogger } from '@/shared/utils/logger';
import {
  normalizePageUrl,
  resolveHighlightPageUrl,
} from '@/shared/utils/normalize-page-url';

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
    this.messageBus.subscribe(
      'IPC_HIGHLIGHT_FIND_BY_CONTENT_HASH',
      this.onFindByContentHash.bind(this)
    );
    this.messageBus.subscribe('IPC_HIGHLIGHT_GET', this.onGetHighlight.bind(this));
  }

  /** Pass summaries through unchanged (text is stored plaintext). */
  async enrichWithPlaintext<T extends { id: string; text: string }>(
    summaries: T[]
  ): Promise<T[]> {
    return summaries;
  }

  /**
   * Stamp highlight with tab address-bar URL when the content script location
   * is incomplete (iframes without ?v= / other query identity).
   */
  private withTabPageUrl(
    highlight: HighlightDataV2,
    sender?: chrome.runtime.MessageSender
  ): HighlightDataV2 {
    const tabUrl = sender?.tab?.url;
    const resolved = resolveHighlightPageUrl({
      contentUrl: highlight.url,
      tabUrl,
    });
    if (!resolved || resolved === highlight.url) {
      return highlight;
    }
    this.logger.info('[bridge] page url from tab', {
      id: highlight.id,
      contentUrl: highlight.url,
      tabUrl,
      resolved,
    });
    return { ...highlight, url: resolved };
  }

  private async onAdd(highlight: HighlightDataV2, sender?: chrome.runtime.MessageSender) {
    const stamped = this.withTabPageUrl(highlight, sender);
    this.logger.info('[bridge] add', { id: stamped.id, url: stamped.url });
    try {
      // Await IndexedDB (active auth scope) so SW death after response does not drop the row.
      await this.facade.addPersisted(stamped);
      notifyLibraryDataChanged({ source: 'highlight-bridge-add' });
      this.logger.debug('[bridge] response', { id: stamped.id, ok: true });
      return { success: true, data: undefined as void };
    } catch (e) {
      const err = e as Error;
      this.logger.error('[bridge] add failed', err, { id: stamped.id });
      return { success: false, error: err.message };
    }
  }

  private async onAddMany(
    { highlights }: { highlights: HighlightDataV2[] },
    sender?: chrome.runtime.MessageSender
  ) {
    const stamped = highlights.map((h) => this.withTabPageUrl(h, sender));
    this.logger.info('[bridge] addMany', { count: stamped.length });
    try {
      await this.facade.addManyPersisted(stamped);
      notifyLibraryDataChanged({ source: 'highlight-bridge-add-many' });
      this.logger.debug('[bridge] response', { count: stamped.length, ok: true });
      return { success: true, data: undefined as void };
    } catch (e) {
      const err = e as Error;
      this.logger.error('[bridge] addMany failed', err, { count: stamped.length });
      return { success: false, error: err.message };
    }
  }

  private async onUpdate({
    id,
    updates,
  }: {
    id: string;
    updates: Partial<HighlightDataV2>;
  }) {
    this.logger.info('[bridge] update', { id });
    try {
      if (typeof updates.text === 'string' && !this.facade.get(id)) {
        return { success: false, error: `Highlight not found: ${id}`, code: 'NOT_FOUND' };
      }
      await this.facade.updatePersisted(id, updates);
      notifyLibraryDataChanged({ source: 'highlight-bridge-update' });
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
      await this.facade.removePersisted(id);
      notifyLibraryDataChanged({ source: 'highlight-bridge-remove' });
      return { success: true, data: undefined as void };
    } catch (e) {
      const err = e as Error;
      this.logger.error('[bridge] remove failed', err, { id });
      return { success: false, error: err.message };
    }
  }

  private async onFindByUrl(
    {
      url,
      mode,
    }: {
      url: string;
      mode?: 'basic' | 'pro' | 'pro_xai';
    },
    sender?: chrome.runtime.MessageSender
  ) {
    const tabUrl = sender?.tab?.url;
    const resolved = resolveHighlightPageUrl({ contentUrl: url, tabUrl });
    this.logger.info('[bridge] findByUrl', { url, tabUrl, resolved, mode });
    try {
      const keys = new Set<string>();
      if (resolved) keys.add(resolved);
      const normalizedRequested = normalizePageUrl(url);
      if (normalizedRequested) keys.add(normalizedRequested);

      const byId = new Map<string, HighlightDataV2>();
      const readable = this.facade.getReadable();
      for (const key of keys) {
        const durable = await readable.findByUrl(key);
        for (const h of durable) {
          byId.set(h.id, h);
        }
      }
      for (const h of this.facade.getAll()) {
        if (!h.url) continue;
        const n = normalizePageUrl(h.url);
        if (keys.has(n)) {
          byId.set(h.id, h);
        }
      }
      return { success: true, data: Array.from(byId.values()) };
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
