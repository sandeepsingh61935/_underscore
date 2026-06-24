/**
 * Three-tier API key store (ADR-021).
 *
 *  - ephemeral mode: chrome.storage.session (cleared on browser restart)
 *  - local mode:     chrome.storage.local + AES-GCM with per-install random key
 *  - cloud mode:     chrome.storage.local + AES-GCM with vault master key (ADR-013)
 *
 * Per-install key is generated once and stored alongside the encrypted blobs.
 */

import type { ModeName } from '@/content/modes/mode-constants';

export interface IVaultKeyManager {
  withMasterKey<T>(cb: (mk: CryptoKey) => Promise<T>): Promise<T>;
}

type ProviderName = 'anthropic' | 'ollama';

const ALG = 'AES-GCM';
const IV_BYTES = 12;
const INSTALL_KEY_ID = 'llm.installKey';

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function fromBase64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveKey(secret: string): Promise<CryptoKey> {
  const salt = new TextEncoder().encode('underscore-llm-keystore-v1');
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    baseKey,
    { name: ALG, length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function getOrCreateInstallKey(): Promise<string> {
  const existing = await chrome.storage.local.get(INSTALL_KEY_ID);
  if (existing[INSTALL_KEY_ID]) return existing[INSTALL_KEY_ID] as string;
  const random = crypto.getRandomValues(new Uint8Array(32));
  const secret = toBase64(random);
  await chrome.storage.local.set({ [INSTALL_KEY_ID]: secret });
  return secret;
}

async function encryptWithKey(key: CryptoKey, plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALG, iv: iv as BufferSource },
    key,
    new TextEncoder().encode(plaintext),
  );
  return `${toBase64(iv)}.${toBase64(new Uint8Array(ciphertext))}`;
}

async function decryptWithKey(key: CryptoKey, blob: string): Promise<string> {
  const [ivB64, ctB64] = blob.split('.');
  if (!ivB64 || !ctB64) throw new Error('LLMKeyStore: malformed ciphertext blob');
  const plaintext = await crypto.subtle.decrypt(
    { name: ALG, iv: fromBase64(ivB64) as BufferSource },
    key,
    fromBase64(ctB64) as BufferSource,
  );
  return new TextDecoder().decode(plaintext);
}

export class LLMKeyStore {
  constructor(
    private readonly mode: ModeName,
    private readonly vault?: IVaultKeyManager,
  ) {}

  async get(provider: ProviderName): Promise<string | null> {
    if (this.mode === 'ephemeral') {
      const r = await chrome.storage.session.get(`llm.${provider}.key`);
      return (r[`llm.${provider}.key`] as string | undefined) ?? null;
    }
    const r = await chrome.storage.local.get(`llm.${provider}.encrypted`);
    const blob = r[`llm.${provider}.encrypted`] as string | undefined;
    if (!blob) return null;
    if (this.mode === 'cloud') {
      if (!this.vault) throw new Error('LLMKeyStore: cloud mode requires a vault.');
      return this.vault.withMasterKey(mk => decryptWithKey(mk, blob));
    }
    // local mode
    const installSecret = await getOrCreateInstallKey();
    const mk = await deriveKey(installSecret);
    return decryptWithKey(mk, blob);
  }

  async set(provider: ProviderName, key: string): Promise<void> {
    if (this.mode === 'ephemeral') {
      await chrome.storage.session.set({ [`llm.${provider}.key`]: key });
      return;
    }
    const blob = await this.encrypt(key);
    await chrome.storage.local.set({ [`llm.${provider}.encrypted`]: blob });
  }

  async clear(provider: ProviderName): Promise<void> {
    if (this.mode === 'ephemeral') {
      await chrome.storage.session.remove(`llm.${provider}.key`);
      return;
    }
    await chrome.storage.local.remove(`llm.${provider}.encrypted`);
  }

  private async encrypt(plaintext: string): Promise<string> {
    if (this.mode === 'cloud') {
      if (!this.vault) throw new Error('LLMKeyStore: cloud mode requires a vault.');
      return this.vault.withMasterKey(mk => encryptWithKey(mk, plaintext));
    }
    const installSecret = await getOrCreateInstallKey();
    const mk = await deriveKey(installSecret);
    return encryptWithKey(mk, plaintext);
  }
}