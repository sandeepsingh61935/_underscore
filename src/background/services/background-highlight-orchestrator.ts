/**
 * @file background-highlight-orchestrator.ts
 * @description SW-side subscriber for highlight IPC channels.
 *
 * Sole owner of cross-context highlight write/read wiring. Listens for
 * IPC_HIGHLIGHT_* messages from the content script and delegates to
 * the SW's RepositoryFacade.
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
    this.messageBus.subscribe('IPC_HIGHLIGHT_UPDATE', this.onUpdate.bind(this));
    this.messageBus.subscribe('IPC_HIGHLIGHT_REMOVE', this.onRemove.bind(this));
    this.messageBus.subscribe('IPC_HIGHLIGHTS_FIND_BY_URL', this.onFindByUrl.bind(this));
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

  private async onUpdate({ id, updates }: { id: string; updates: Partial<HighlightDataV2> }) {
    this.logger.info('[bridge] update', { id });
    try {
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

  private async onFindByUrl({ url }: { url: string }) {
    this.logger.info('[bridge] findByUrl', { url });
    try {
      const all = this.facade.getAll();
      const data = all.filter((h) => h.url === url);
      return { success: true, data };
    } catch (e) {
      const err = e as Error;
      this.logger.error('[bridge] findByUrl failed', err, { url });
      return { success: false, error: err.message };
    }
  }
}
