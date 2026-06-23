import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BackgroundHighlightOrchestrator } from './background-highlight-orchestrator';
import { LoggerFactory } from '@/shared/utils/logger';
import type { RepositoryFacade } from '@/shared/repositories/repository-facade';
import type { HighlightDataV2, EncryptedText } from '@/shared/schemas/highlight-schema';
import type { HighlightEncryptor } from './highlight-encryptor';

const logger = LoggerFactory.getLogger('Test');

function makeHighlight(id: string): HighlightDataV2 {
  return {
    id,
    text: 'sample',
    contentHash: `hash-${id}`,
    colorRole: 'yellow' as const,
    type: 'underscore' as const,
    ranges: [],
    createdAt: new Date(),
    url: 'https://example.com',
  } as unknown as HighlightDataV2;
}

function makeEnvelope(): EncryptedText {
  return { ciphertext: 'AAAA', iv: 'BBBB', keyId: 'user-abc' };
}

describe('BackgroundHighlightOrchestrator', () => {
  let facade: RepositoryFacade;
  let encryptor: HighlightEncryptor;
  let subscriptions: Map<string, (payload: any) => Promise<any>>;
  let orchestrator: BackgroundHighlightOrchestrator;

  beforeEach(() => {
    facade = {
      add: vi.fn(),
      addMany: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      getAll: vi.fn(() => [makeHighlight('h-1')]),
      get: vi.fn((id: string) => (id === 'h-1' ? makeHighlight('h-1') : undefined)),
      findByContentHash: vi.fn((hash: string) => {
        if (hash === 'hash-h-1') return makeHighlight('h-1');
        return undefined;
      }),
    } as unknown as RepositoryFacade;

    // Encryptor stub: clears `text` and sets `textEncrypted` (mirrors
    // the real HighlightEncryptor contract).
    encryptor = {
      encrypt: vi.fn(async (h: HighlightDataV2) => {
        if (h.textEncrypted) return h;
        return { ...h, text: '', textEncrypted: makeEnvelope() };
      }),
      decrypt: vi.fn(async (e: EncryptedText) => e.ciphertext + '-plaintext'),
    } as unknown as HighlightEncryptor;

    subscriptions = new Map();
    const messageBus = {
      subscribe: vi.fn((type: string, handler: any) => {
        subscriptions.set(type, handler);
      }),
    };

    orchestrator = new BackgroundHighlightOrchestrator(
      facade,
      encryptor,
      messageBus as any,
      logger
    );
    orchestrator.initialize();
  });

  it('subscribes to all IPC_HIGHLIGHT_* channels', () => {
    expect(subscriptions.has('IPC_HIGHLIGHT_ADD')).toBe(true);
    expect(subscriptions.has('IPC_HIGHLIGHT_ADD_MANY')).toBe(true);
    expect(subscriptions.has('IPC_HIGHLIGHT_UPDATE')).toBe(true);
    expect(subscriptions.has('IPC_HIGHLIGHT_REMOVE')).toBe(true);
    expect(subscriptions.has('IPC_HIGHLIGHTS_FIND_BY_URL')).toBe(true);
    expect(subscriptions.has('IPC_HIGHLIGHT_FIND_BY_CONTENT_HASH')).toBe(true);
    expect(subscriptions.has('IPC_HIGHLIGHT_DECRYPT_TEXT')).toBe(true);
    expect(subscriptions.has('IPC_HIGHLIGHT_GET')).toBe(true);
  });

  it('onAdd: encrypts the highlight then delegates to facade.add with ciphertext in textEncrypted', async () => {
    const h = makeHighlight('h-2');
    const result = await subscriptions.get('IPC_HIGHLIGHT_ADD')!(h);
    expect(encryptor.encrypt).toHaveBeenCalledWith(h);
    const persisted = (facade.add as any).mock.calls[0][0];
    expect(persisted.id).toBe('h-2');
    expect(persisted.text).toBe('');
    expect(persisted.textEncrypted).toEqual(makeEnvelope());
    expect(result).toEqual({ success: true, data: undefined });
  });

  it('onAdd: returns error envelope when encryptor throws (vault locked)', async () => {
    (encryptor.encrypt as any).mockRejectedValueOnce(new Error('Vault is locked'));
    const result = await subscriptions.get('IPC_HIGHLIGHT_ADD')!(makeHighlight('h-locked'));
    expect(result).toEqual({ success: false, error: 'Vault is locked' });
    expect(facade.add).not.toHaveBeenCalled();
  });

  it('onAdd: returns error envelope when facade throws', async () => {
    (facade.add as any).mockImplementation(() => { throw new Error('boom'); });
    const result = await subscriptions.get('IPC_HIGHLIGHT_ADD')!(makeHighlight('h-err'));
    expect(result).toEqual({ success: false, error: 'boom' });
  });

  it('onAddMany: encrypts the batch and calls facade.addMany once', async () => {
    const highlights = [makeHighlight('h-bulk-1'), makeHighlight('h-bulk-2')];
    const result = await subscriptions.get('IPC_HIGHLIGHT_ADD_MANY')!({ highlights });
    expect(encryptor.encrypt).toHaveBeenCalledTimes(2);
    expect(facade.addMany).toHaveBeenCalledTimes(1);
    expect(facade.add).not.toHaveBeenCalled();
    const persisted = (facade.addMany as any).mock.calls[0][0];
    expect(persisted[0].text).toBe('');
    expect(persisted[0].textEncrypted).toEqual(makeEnvelope());
    expect(persisted[1].text).toBe('');
    expect(persisted[1].textEncrypted).toEqual(makeEnvelope());
    expect(result).toEqual({ success: true, data: undefined });
  });

  it('onAddMany: returns error envelope when facade throws', async () => {
    (facade.addMany as any).mockImplementation(() => { throw new Error('boom-batch'); });
    const result = await subscriptions.get('IPC_HIGHLIGHT_ADD_MANY')!({ highlights: [makeHighlight('h-err')] });
    expect(result).toEqual({ success: false, error: 'boom-batch' });
  });

  it('onUpdate: encrypts the text when the caller sends plaintext', async () => {
    (facade.get as any) = vi.fn(() => makeHighlight('h-3'));
    await subscriptions.get('IPC_HIGHLIGHT_UPDATE')!({ id: 'h-3', updates: { text: 'new' } });
    expect(encryptor.encrypt).toHaveBeenCalledTimes(1);
    const persisted = (facade.update as any).mock.calls[0];
    expect(persisted[0]).toBe('h-3');
    expect(persisted[1].text).toBe('');
    expect(persisted[1].textEncrypted).toEqual(makeEnvelope());
  });

  it('onUpdate: passes through when the caller does not touch text', async () => {
    await subscriptions.get('IPC_HIGHLIGHT_UPDATE')!({ id: 'h-3', updates: { colorRole: 'blue' } });
    expect(encryptor.encrypt).not.toHaveBeenCalled();
    const persisted = (facade.update as any).mock.calls[0];
    expect(persisted[0]).toBe('h-3');
    expect(persisted[1].colorRole).toBe('blue');
  });

  it('onUpdate: returns NOT_FOUND when the caller updates text on a missing highlight (no plaintext leak)', async () => {
    (facade.get as any) = vi.fn(() => undefined);
    const result = await subscriptions.get('IPC_HIGHLIGHT_UPDATE')!({ id: 'missing', updates: { text: 'secret' } });
    expect(result.success).toBe(false);
    expect(result.code).toBe('NOT_FOUND');
    expect(encryptor.encrypt).not.toHaveBeenCalled();
    expect(facade.update).not.toHaveBeenCalled();
  });

  it('onRemove: delegates to facade.remove', async () => {
    await subscriptions.get('IPC_HIGHLIGHT_REMOVE')!({ id: 'h-4' });
    expect(facade.remove).toHaveBeenCalledWith('h-4');
  });

  it('onFindByUrl: returns facade.getAll() filtered by url', async () => {
    const result = await subscriptions.get('IPC_HIGHLIGHTS_FIND_BY_URL')!({ url: 'https://example.com' });
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('onFindByUrl: ephemeral mode filters out highlights older than 24h', async () => {
    const fresh = makeHighlight('h-fresh');
    const stale = {
      ...makeHighlight('h-stale'),
      createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25h old
    };
    (facade.getAll as any) = vi.fn(() => [fresh, stale]);

    const result = await subscriptions.get('IPC_HIGHLIGHTS_FIND_BY_URL')!({
      url: 'https://example.com',
      mode: 'ephemeral',
    });
    expect(result.success).toBe(true);
    const ids = (result.data as HighlightDataV2[]).map((h) => h.id);
    expect(ids).toContain('h-fresh');
    expect(ids).not.toContain('h-stale');
  });

  it('onFindByUrl: local and cloud modes do NOT filter by TTL', async () => {
    const stale = {
      ...makeHighlight('h-stale'),
      createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
    };
    (facade.getAll as any) = vi.fn(() => [stale]);

    for (const mode of ['local', 'cloud'] as const) {
      const result = await subscriptions.get('IPC_HIGHLIGHTS_FIND_BY_URL')!({
        url: 'https://example.com',
        mode,
      });
      const ids = (result.data as HighlightDataV2[]).map((h) => h.id);
      expect(ids).toContain('h-stale');
    }
  });

  it('onFindByContentHash: returns facade.findByContentHash(hash)', async () => {
    const result = await subscriptions.get('IPC_HIGHLIGHT_FIND_BY_CONTENT_HASH')!({ hash: 'hash-h-1' });
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.id).toBe('h-1');

    const notFoundResult = await subscriptions.get('IPC_HIGHLIGHT_FIND_BY_CONTENT_HASH')!({ hash: 'non-existent' });
    expect(notFoundResult.success).toBe(true);
    expect(notFoundResult.data).toBeNull();
  });

  it('onDecryptText: returns plaintext for a stored envelope', async () => {
    (facade.get as any) = vi.fn(() => ({
      ...makeHighlight('h-5'),
      text: '',
      textEncrypted: makeEnvelope(),
    }));
    const result = await subscriptions.get('IPC_HIGHLIGHT_DECRYPT_TEXT')!({ id: 'h-5' });
    expect(result.success).toBe(true);
    expect(result.data.plaintext).toBe('AAAA-plaintext');
  });

  it('onDecryptText: passes through when no envelope is present (legacy plaintext)', async () => {
    (facade.get as any) = vi.fn(() => makeHighlight('h-6'));
    const result = await subscriptions.get('IPC_HIGHLIGHT_DECRYPT_TEXT')!({ id: 'h-6' });
    expect(result.success).toBe(true);
    expect(result.data.plaintext).toBe('sample');
    expect(encryptor.decrypt).not.toHaveBeenCalled();
  });

  it('onDecryptText: returns NOT_FOUND when the highlight is missing', async () => {
    (facade.get as any) = vi.fn(() => undefined);
    const result = await subscriptions.get('IPC_HIGHLIGHT_DECRYPT_TEXT')!({ id: 'nope' });
    expect(result.success).toBe(false);
    expect(result.code).toBe('NOT_FOUND');
  });

  it('onDecryptText: surfaces encryptor errors', async () => {
    (facade.get as any) = vi.fn(() => ({
      ...makeHighlight('h-7'),
      text: '',
      textEncrypted: makeEnvelope(),
    }));
    (encryptor.decrypt as any).mockRejectedValueOnce(new Error('Vault is locked'));
    const result = await subscriptions.get('IPC_HIGHLIGHT_DECRYPT_TEXT')!({ id: 'h-7' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Vault is locked');
  });

  it('onGetHighlight: returns the stored record with textEncrypted when includePlaintext is false', async () => {
    const stored = { ...makeHighlight('h-8'), text: '', textEncrypted: makeEnvelope() };
    (facade.get as any) = vi.fn(() => stored);
    const result = await subscriptions.get('IPC_HIGHLIGHT_GET')!({ id: 'h-8' });
    expect(result.success).toBe(true);
    expect(result.data.textEncrypted).toBe(stored.textEncrypted);
    expect(encryptor.decrypt).not.toHaveBeenCalled();
  });

  it('onGetHighlight: decrypts textEncrypted when includePlaintext is true', async () => {
    const envelope = makeEnvelope();
    const stored = { ...makeHighlight('h-9'), text: '', textEncrypted: envelope };
    (facade.get as any) = vi.fn(() => stored);
    const result = await subscriptions.get('IPC_HIGHLIGHT_GET')!({
      id: 'h-9',
      includePlaintext: true,
    });
    expect(result.success).toBe(true);
    expect(result.data.text).toBe('AAAA-plaintext');
    expect(encryptor.decrypt).toHaveBeenCalledWith(envelope);
  });

  it('onGetHighlight: returns NOT_FOUND when the highlight is missing', async () => {
    (facade.get as any) = vi.fn(() => undefined);
    const result = await subscriptions.get('IPC_HIGHLIGHT_GET')!({ id: 'nope' });
    expect(result.success).toBe(false);
    expect(result.code).toBe('NOT_FOUND');
  });
});
