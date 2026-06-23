/**
 * @file background-highlight-orchestrator.ts
 * @description SW-side subscriber for highlight IPC channels.
 *
 * Sole owner of cross-context highlight write/read wiring. Listens for
 * IPC_HIGHLIGHT_* messages from the content script, encrypts the
 * highlight text per ADR-013 before persistence, and decrypts on
 * explicit read requests.
 *
 * @see docs/04-adrs/004-highlight-bridge-wiring.md
 * @see docs/04-adrs/013-encryption-boundary-background-side.md
 */

import type { RepositoryFacade } from '@/shared/repositories/repository-facade';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import type { ILogger } from '@/shared/utils/logger';
import type { HighlightEncryptor } from './highlight-encryptor';

export class BackgroundHighlightOrchestrator {
  constructor(
    private readonly facade: RepositoryFacade,
    private readonly encryptor: HighlightEncryptor,
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
    this.messageBus.subscribe('IPC_HIGHLIGHT_DECRYPT_TEXT', this.onDecryptText.bind(this));
    this.messageBus.subscribe('IPC_HIGHLIGHT_GET', this.onGetHighlight.bind(this));
  }

  private async onAdd(highlight: HighlightDataV2) {
    this.logger.info('[bridge] add', { id: highlight.id, url: highlight.url });
    try {
      const encrypted = await this.encryptor.encrypt(highlight);
      this.facade.add(encrypted);
      this.logger.debug('[bridge] response', { id: encrypted.id, ok: true });
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
      // Encrypt the whole batch first; per-record failures fail the batch
      // (a half-encrypted bulk write would be worse than an error envelope).
      const encrypted = await Promise.all(
        highlights.map((h) => this.encryptor.encrypt(h))
      );
      this.facade.addMany(encrypted);
      this.logger.debug('[bridge] response', { count: encrypted.length, ok: true });
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
      // If the caller updates `text` with plaintext, encrypt it before
      // persistence. The encryptor sets `textEncrypted` and clears the
      // plaintext `text` so no plaintext lands at rest.
      if (typeof updates.text === 'string') {
        const existing = this.facade.get(id);
        if (!existing) {
          // No existing record to derive userId from. Reject the update
          // rather than persist plaintext with a possibly-mismatched
          // userId; the caller can re-send with the correct id.
          return { success: false, error: `Highlight not found: ${id}`, code: 'NOT_FOUND' };
        }
        const stub: HighlightDataV2 = {
          ...existing,
          text: updates.text,
          userId: existing.userId,
        };
        const encrypted = await this.encryptor.encrypt(stub);
        updates = {
          ...updates,
          text: encrypted.text,
          textEncrypted: encrypted.textEncrypted,
        };
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
    mode?: 'ephemeral' | 'local' | 'cloud';
  }) {
    this.logger.info('[bridge] findByUrl', { url, mode });
    try {
      const all = this.facade.getAll();
      // Ephemeral mode: filter out highlights older than 24h. The IDB
      // rows do not physically expire (cleanup sweep is out of scope);
      // we enforce TTL at the read seam so the user sees the right set.
      const TTL_MS = 24 * 60 * 60 * 1000;
      const cutoff = mode === 'ephemeral' ? Date.now() - TTL_MS : null;
      const data = all.filter((h) => {
        if (h.url !== url) return false;
        if (cutoff !== null) {
          const created = h.createdAt instanceof Date
            ? h.createdAt.getTime()
            : new Date(h.createdAt).getTime();
          if (created < cutoff) return false;
        }
        return true;
      });
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

  /**
   * Decrypt a single highlight's text by ID. Used by the popup when it
   * needs to render a highlight's text but only has the envelope.
   */
  private async onDecryptText({ id }: { id: string }) {
    this.logger.info('[bridge] decryptText', { id });
    try {
      const stored = this.facade.get(id);
      if (!stored) {
        return { success: false, error: `Highlight not found: ${id}`, code: 'NOT_FOUND' };
      }
      if (stored.textEncrypted) {
        const plaintext = await this.encryptor.decrypt(stored.textEncrypted);
        return { success: true, data: { id, plaintext } };
      }
      // No envelope (e.g. vault was locked at write time, or legacy
      // plaintext data) — return whatever `text` holds.
      return { success: true, data: { id, plaintext: stored.text } };
    } catch (e) {
      const err = e as Error;
      this.logger.error('[bridge] decryptText failed', err, { id });
      return { success: false, error: err.message };
    }
  }

  /**
   * Fetch a single highlight by ID. When `includePlaintext` is true, the
   * returned record's `text` field is plaintext (decrypted from
   * `textEncrypted`); otherwise `text` is the empty-string placeholder.
   */
  private async onGetHighlight({ id, includePlaintext }: { id: string; includePlaintext?: boolean }) {
    this.logger.info('[bridge] getHighlight', { id, includePlaintext });
    try {
      const stored = this.facade.get(id);
      if (!stored) {
        return { success: false, error: `Highlight not found: ${id}`, code: 'NOT_FOUND' };
      }
      if (includePlaintext && stored.textEncrypted) {
        const plaintext = await this.encryptor.decrypt(stored.textEncrypted);
        return { success: true, data: { ...stored, text: plaintext } };
      }
      return { success: true, data: stored };
    } catch (e) {
      const err = e as Error;
      this.logger.error('[bridge] getHighlight failed', err, { id });
      return { success: false, error: err.message };
    }
  }
}
