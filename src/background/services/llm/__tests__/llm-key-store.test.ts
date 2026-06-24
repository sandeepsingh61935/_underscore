import { describe, it, expect, vi, beforeEach } from 'vitest';

import { LLMKeyStore } from '../llm-key-store';

// We mock chrome.storage.* via vi.stubGlobal. The store uses chrome.storage
// directly; tests use a Map-backed shim.
function makeChromeStorage(initial: Record<string, unknown> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    local: {
      get: vi.fn(async (k: string) => (data.has(k) ? { [k]: data.get(k) } : {})),
      set: vi.fn(async (obj: Record<string, unknown>) => {
        for (const [k, v] of Object.entries(obj)) data.set(k, v);
      }),
      remove: vi.fn(async (k: string) => { data.delete(k); }),
    },
    session: {
      get: vi.fn(async (k: string) => (data.has(k) ? { [k]: data.get(k) } : {})),
      set: vi.fn(async (obj: Record<string, unknown>) => {
        for (const [k, v] of Object.entries(obj)) data.set(k, v);
      }),
      remove: vi.fn(async (k: string) => { data.delete(k); }),
    },
    _peek: (k: string) => data.get(k),
  };
}

describe('LLMKeyStore (ephemeral mode)', () => {
  it('stores keys in chrome.storage.session', async () => {
    const storage = makeChromeStorage();
    vi.stubGlobal('chrome', { storage: { local: storage.local, session: storage.session } });

    const store = new LLMKeyStore('ephemeral');
    await store.set('anthropic', 'sk-test-123');

    expect(storage.session.set).toHaveBeenCalledWith({ 'llm.anthropic.key': 'sk-test-123' });
  });

  it('retrieves keys from chrome.storage.session', async () => {
    const storage = makeChromeStorage({ 'llm.anthropic.key': 'sk-test-123' });
    vi.stubGlobal('chrome', { storage: { local: storage.local, session: storage.session } });

    const store = new LLMKeyStore('ephemeral');
    expect(await store.get('anthropic')).toBe('sk-test-123');
  });
});

describe('LLMKeyStore (local mode)', () => {
  it('encrypts keys with a per-install key before persisting', async () => {
    const storage = makeChromeStorage();
    vi.stubGlobal('chrome', { storage: { local: storage.local, session: storage.session } });

    const store = new LLMKeyStore('local');
    await store.set('ollama', 'local-key');

    const stored = await storage.local.get('llm.ollama.encrypted');
    expect(stored['llm.ollama.encrypted']).toBeTruthy();
    expect((stored['llm.ollama.encrypted'] as string)).not.toContain('local-key');
  });

  it('decrypts on read', async () => {
    const storage = makeChromeStorage();
    vi.stubGlobal('chrome', { storage: { local: storage.local, session: storage.session } });

    const store = new LLMKeyStore('local');
    await store.set('ollama', 'local-key');
    expect(await store.get('ollama')).toBe('local-key');
  });
});

describe('LLMKeyStore (cloud mode)', () => {
  it('uses the vault master key for encryption', async () => {
    const storage = makeChromeStorage();
    // Derive a real CryptoKey for the test so encryptWithKey works end-to-end.
    const baseKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode('test-master-key-material-32bytes!!!'),
      { name: 'PBKDF2' },
      false,
      ['deriveKey'],
    );
    const realKey = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: new TextEncoder().encode('test'), iterations: 1000, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
    const vault = {
      withMasterKey: vi.fn(async (cb: (mk: CryptoKey) => Promise<string>) => {
        return cb(realKey).then(s => `vault(${s})`);
      }),
    };
    vi.stubGlobal('chrome', { storage: { local: storage.local, session: storage.session } });

    const store = new LLMKeyStore('cloud', vault as any);
    await store.set('anthropic', 'sk-cloud');

    expect(vault.withMasterKey).toHaveBeenCalled();
    const stored = await storage.local.get('llm.anthropic.encrypted');
    expect(String(stored['llm.anthropic.encrypted'])).toMatch(/^vault\(/);
  });
});

describe('LLMKeyStore (general)', () => {
  beforeEach(() => {
    const storage = makeChromeStorage();
    vi.stubGlobal('chrome', { storage: { local: storage.local, session: storage.session } });
  });

  it('clear() removes the key', async () => {
    const store = new LLMKeyStore('ephemeral');
    await store.set('anthropic', 'sk');
    await store.clear('anthropic');
    expect(await store.get('anthropic')).toBeNull();
  });

  it('get() returns null when no key is set', async () => {
    const store = new LLMKeyStore('ephemeral');
    expect(await store.get('anthropic')).toBeNull();
  });
});