/**
 * Two-tier API key store (ADR-021).
 *
 *  - basic mode:          chrome.storage.session (cleared on browser restart)
 *  - pro / pro_xai mode:  chrome.storage.local + AES-GCM with vault master key (ADR-013)
 *
 * Per-install key is generated once and stored alongside the encrypted blobs
 * (used as a fallback when a pro/pro_xai key is set before the vault is
 * available, e.g. mid-onboarding).
 */

import type { ModeName } from '@/content/modes/mode-constants';
import { resolveProviderModel } from '@/shared/llm/provider-models';
import { base64ToBytes, bytesToBase64 } from '@/shared/utils/base64';

export interface IVaultKeyManager {
  withMasterKey<T>(cb: (mk: CryptoKey) => Promise<T>): Promise<T>;
}

type ProviderName = import('@/shared/interfaces/i-llm-service').ProviderName;

const ALG = 'AES-GCM';
const IV_BYTES = 12;
const INSTALL_KEY_ID = 'llm.installKey';
const ACTIVE_PROVIDER_KEY = 'llm.activeProvider';

function modelStorageKey(provider: ProviderName): string {
  return `llm.${provider}.model`;
}

interface BasicBackend {
  area: chrome.storage.StorageArea;
  storageKey: (provider: ProviderName) => string;
}

function basicLocalBackend(): BasicBackend {
  return {
    area: chrome.storage.local,
    storageKey: (provider) => `llm.basic.${provider}.key`,
  };
}

function resolveBasicBackend(): BasicBackend {
  // Service workers have no `window`. Avoid chrome.storage.session here — on some
  // platforms it throws ReferenceError: window is not defined.
  if (typeof window === 'undefined') {
    return basicLocalBackend();
  }
  try {
    const session = chrome.storage?.session;
    if (session && typeof session.get === 'function' && typeof session.set === 'function') {
      return {
        area: session,
        storageKey: (provider) => `llm.${provider}.key`,
      };
    }
  } catch {
    // Fall through to local storage.
  }
  return basicLocalBackend();
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
  const secret = bytesToBase64(random);
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
  return `${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(ciphertext))}`;
}

async function decryptWithKey(key: CryptoKey, blob: string): Promise<string> {
  const [ivB64, ctB64] = blob.split('.');
  if (!ivB64 || !ctB64) throw new Error('LLMKeyStore: malformed ciphertext blob');
  const plaintext = await crypto.subtle.decrypt(
    { name: ALG, iv: base64ToBytes(ivB64) as BufferSource },
    key,
    base64ToBytes(ctB64) as BufferSource,
  );
  return new TextDecoder().decode(plaintext);
}

export class LLMKeyStore {
  private basicBackend: BasicBackend = resolveBasicBackend();

  constructor(
    private readonly mode: ModeName,
    private readonly vault?: IVaultKeyManager,
  ) {}

  private async withEphemeralBackend<T>(
    run: (backend: BasicBackend) => Promise<T>,
  ): Promise<T> {
    try {
      return await run(this.basicBackend);
    } catch (err) {
      if (this.basicBackend.area !== chrome.storage.local) {
        this.basicBackend = basicLocalBackend();
        return run(this.basicBackend);
      }
      throw err;
    }
  }

  async get(provider: ProviderName): Promise<string | null> {
    if (this.mode === 'basic') {
      return this.withEphemeralBackend(async (backend) => {
        const key = backend.storageKey(provider);
        const r = await backend.area.get(key);
        return (r[key] as string | undefined) ?? null;
      });
    }
    // pro / pro_xai
    const r = await chrome.storage.local.get(`llm.${provider}.encrypted`);
    const blob = r[`llm.${provider}.encrypted`] as string | undefined;
    if (!blob) return null;
    if (this.vault) {
      return this.vault.withMasterKey(mk => decryptWithKey(mk, blob));
    }
    // Fallback: install-key AES (e.g. key set before the vault was available)
    const installSecret = await getOrCreateInstallKey();
    const mk = await deriveKey(installSecret);
    return decryptWithKey(mk, blob);
  }

  async set(provider: ProviderName, key: string): Promise<void> {
    if (this.mode === 'basic') {
      await this.withEphemeralBackend(async (backend) => {
        const storageKey = backend.storageKey(provider);
        await backend.area.set({ [storageKey]: key });
      });
      return;
    }
    const blob = await this.encrypt(key);
    await chrome.storage.local.set({ [`llm.${provider}.encrypted`]: blob });
  }

  async clear(provider: ProviderName): Promise<void> {
    if (this.mode === 'basic') {
      await this.withEphemeralBackend(async (backend) => {
        const storageKey = backend.storageKey(provider);
        await backend.area.remove(storageKey);
      });
      return;
    }
    await chrome.storage.local.remove(`llm.${provider}.encrypted`);
  }

  /** Selected model id for a provider (not encrypted — stored in local). */
  async getModel(provider: ProviderName): Promise<string> {
    const r = await chrome.storage.local.get(modelStorageKey(provider));
    const stored = r[modelStorageKey(provider)] as string | undefined;
    return resolveProviderModel(provider, stored);
  }

  async setModel(provider: ProviderName, model: string): Promise<void> {
    const trimmed = model.trim();
    if (!trimmed) throw new Error('LLMKeyStore: model id cannot be empty');
    await chrome.storage.local.set({ [modelStorageKey(provider)]: trimmed });
  }

  /** Provider used for summarize/synthesize when none is specified in the request. */
  async getActiveProvider(): Promise<ProviderName | null> {
    const r = await chrome.storage.local.get(ACTIVE_PROVIDER_KEY);
    const stored = r[ACTIVE_PROVIDER_KEY] as ProviderName | undefined;
    return stored ?? null;
  }

  async setActiveProvider(provider: ProviderName): Promise<void> {
    await chrome.storage.local.set({ [ACTIVE_PROVIDER_KEY]: provider });
  }

  private async encrypt(plaintext: string): Promise<string> {
    if (this.vault) {
      return this.vault.withMasterKey(mk => encryptWithKey(mk, plaintext));
    }
    // Fallback: install-key AES (e.g. key set before the vault was available)
    const installSecret = await getOrCreateInstallKey();
    const mk = await deriveKey(installSecret);
    return encryptWithKey(mk, plaintext);
  }
}
