/**
 * @file highlight-encryptor.test.ts
 * @description Unit tests for HighlightEncryptor (ADR-013)
 *
 * Real WebCrypto is used for the master key derivation and AES-GCM
 * operations so the round-trip exercises the actual on-the-wire envelope
 * shape. The IKeyManager stub simulates the locked/unlocked invariant
 * by throwing from `withMasterKey` when locked.
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { HighlightEncryptor } from '@/background/services/highlight-encryptor';
import type { IKeyManager } from '@/background/auth/interfaces/i-key-manager';
import type { EncryptedText, HighlightDataV2 } from '@/shared/schemas/highlight-schema';

function makeHighlight(overrides: Partial<HighlightDataV2> = {}): HighlightDataV2 {
  return {
    id: 'h-1',
    userId: 'user-abc',
    text: 'plaintext-payload',
    contentHash: 'hash-1',
    colorRole: 'yellow' as const,
    type: 'underscore' as const,
    ranges: [],
    createdAt: new Date('2026-06-17T00:00:00Z'),
    url: 'https://example.com',
    ...overrides,
  } as unknown as HighlightDataV2;
}

function makeLockedKeyManager(): IKeyManager {
  return {
    isUnlocked: false,
    withMasterKey: async () => {
      throw new Error('Vault is locked — call unlock() first');
    },
  } as unknown as IKeyManager;
}

async function makeUnlockedKeyManager(): Promise<IKeyManager> {
  // Derive a real AES-GCM master key from a known passphrase so the
  // encrypt/decrypt round-trip is end-to-end.
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode('test-passphrase'),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const masterKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 1, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  return {
    isUnlocked: true,
    withMasterKey: async <T>(fn: (key: CryptoKey) => Promise<T>): Promise<T> => fn(masterKey),
  } as unknown as IKeyManager;
}

describe('HighlightEncryptor', () => {
  let keyManager: IKeyManager;
  let encryptor: HighlightEncryptor;

  describe('when the vault is locked', () => {
    beforeEach(() => {
      keyManager = makeLockedKeyManager();
      encryptor = new HighlightEncryptor(keyManager);
    });

    it('encrypt() throws because the master key is unavailable', async () => {
      await expect(encryptor.encrypt(makeHighlight())).rejects.toThrow(
        /Vault is locked/
      );
    });

    it('decrypt() throws because the master key is unavailable', async () => {
      const envelope: EncryptedText = {
        ciphertext: 'AAAA',
        iv: 'AAAAAAAA',
        keyId: 'user-abc',
      };
      await expect(encryptor.decrypt(envelope)).rejects.toThrow(/Vault is locked/);
    });
  });

  describe('when the vault is unlocked', () => {
    beforeEach(async () => {
      keyManager = await makeUnlockedKeyManager();
      encryptor = new HighlightEncryptor(keyManager);
    });

    it('encrypt() sets textEncrypted to an EncryptedText envelope with base64 ciphertext + iv and userId as keyId', async () => {
      const result = await encryptor.encrypt(makeHighlight({ text: 'secret' }));

      expect(result.text).toBe('');
      expect(result.textEncrypted).toBeDefined();
      const envelope = result.textEncrypted as EncryptedText;
      expect(envelope.ciphertext).toMatch(/^[A-Za-z0-9+/=]+$/);
      expect(envelope.iv).toMatch(/^[A-Za-z0-9+/=]+$/);
      expect(envelope.iv.length).toBeGreaterThan(0);
      expect(envelope.keyId).toBe('user-abc');
    });

    it('encrypt() clears the plaintext text field (no plaintext at rest)', async () => {
      const result = await encryptor.encrypt(makeHighlight({ text: 'secret' }));
      expect(result.text).toBe('');
    });

    it('encrypt() leaves every other field on the highlight untouched', async () => {
      const input = makeHighlight({ text: 'secret', id: 'h-keep' });
      const result = await encryptor.encrypt(input);
      expect(result.id).toBe('h-keep');
      expect(result.url).toBe(input.url);
      expect(result.contentHash).toBe(input.contentHash);
      expect(result.ranges).toBe(input.ranges);
      expect(result.userId).toBe('user-abc');
    });

    it('encrypt() is idempotent on already-encrypted input', async () => {
      const encryptedOnce = await encryptor.encrypt(makeHighlight({ text: 'secret' }));
      const encryptedTwice = await encryptor.encrypt(encryptedOnce);
      // Same reference: the second call short-circuits because
      // textEncrypted is already set.
      expect(encryptedTwice).toBe(encryptedOnce);
    });

    it('decrypt() round-trips with encrypt() for ASCII plaintext', async () => {
      const input = makeHighlight({ text: 'hello world' });
      const encrypted = await encryptor.encrypt(input);
      const plaintext = await encryptor.decrypt(encrypted.textEncrypted as EncryptedText);
      expect(plaintext).toBe('hello world');
    });

    it('decrypt() round-trips for unicode plaintext (multi-byte)', async () => {
      const input = makeHighlight({ text: '日本語 — emoji check' });
      const encrypted = await encryptor.encrypt(input);
      const plaintext = await encryptor.decrypt(encrypted.textEncrypted as EncryptedText);
      expect(plaintext).toBe('日本語 — emoji check');
    });

    it('decrypt() round-trips for the maximum-length payload', async () => {
      const longText = 'x'.repeat(10_000); // matches HighlightDataV2's upper bound
      const input = makeHighlight({ text: longText });
      const encrypted = await encryptor.encrypt(input);
      const plaintext = await encryptor.decrypt(encrypted.textEncrypted as EncryptedText);
      expect(plaintext).toBe(longText);
    });

    it('encrypt() uses a fresh IV per call (no IV reuse)', async () => {
      const a = await encryptor.encrypt(makeHighlight({ text: 'same' }));
      const b = await encryptor.encrypt(makeHighlight({ text: 'same' }));
      // Same plaintext, same key — IVs MUST differ to keep AES-GCM safe.
      expect((a.textEncrypted as EncryptedText).iv).not.toBe(
        (b.textEncrypted as EncryptedText).iv
      );
      expect((a.textEncrypted as EncryptedText).ciphertext).not.toBe(
        (b.textEncrypted as EncryptedText).ciphertext
      );
    });

    it('decrypt() rejects a tampered ciphertext (AES-GCM authentication)', async () => {
      const encrypted = await encryptor.encrypt(makeHighlight({ text: 'secret' }));
      const envelope = encrypted.textEncrypted as EncryptedText;
      // Flip a base64 char to perturb the ciphertext bytes.
      const tamperedCiphertext =
        envelope.ciphertext.slice(0, -1) +
        (envelope.ciphertext.slice(-1) === 'A' ? 'B' : 'A');
      const tampered: EncryptedText = { ...envelope, ciphertext: tamperedCiphertext };
      await expect(encryptor.decrypt(tampered)).rejects.toBeDefined();
    });
  });
});
