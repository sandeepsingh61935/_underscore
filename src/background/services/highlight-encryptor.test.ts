import { describe, it, expect, vi } from 'vitest';
import { HighlightEncryptor } from './highlight-encryptor';
import type { IKeyManager } from '@/background/auth/interfaces/i-key-manager';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';

function makeHighlight(over: Partial<HighlightDataV2> = {}): HighlightDataV2 {
  return {
    id: 'h-1',
    text: 'sample plaintext',
    contentHash: 'hash-1',
    colorRole: 'yellow' as const,
    type: 'underscore' as const,
    ranges: [],
    createdAt: new Date(),
    url: 'https://example.com',
    ...over,
  } as unknown as HighlightDataV2;
}

function makeKeyManager(over: Partial<IKeyManager> = {}): IKeyManager {
  return {
    isUnlocked: false,
    currentUserId: null,
    withMasterKey: vi.fn(),
    unlock: vi.fn(),
    lock: vi.fn(),
    generateKeyPair: vi.fn(),
    getPublicKey: vi.fn(),
    getPrivateKey: vi.fn(),
    rotateKey: vi.fn(),
    backupKey: vi.fn(),
    restoreKey: vi.fn(),
    ...over,
  } as unknown as IKeyManager;
}

describe('HighlightEncryptor.encrypt', () => {
  it('returns the highlight unchanged when vault is locked (anonymous ephemeral user)', async () => {
    const keyManager = makeKeyManager({ isUnlocked: false, currentUserId: null });
    const encryptor = new HighlightEncryptor(keyManager);

    const input = makeHighlight();
    const out = await encryptor.encrypt(input);

    // No encryption attempted; plaintext preserved; no textEncrypted field set.
    expect(out.text).toBe('sample plaintext');
    expect(out.textEncrypted).toBeUndefined();
    expect(keyManager.withMasterKey).not.toHaveBeenCalled();
  });

  it('encrypts normally when vault is unlocked', async () => {
    // Provide a real-ish master key flow by stubbing withMasterKey.
    const fakeMasterKey = {} as CryptoKey;
    const keyManager = makeKeyManager({
      isUnlocked: true,
      currentUserId: 'user-abc',
      withMasterKey: vi.fn(async (fn) => fn(fakeMasterKey)),
    });
    // Stub crypto.subtle.encrypt since we can't construct a real key.
    const subtleEncrypt = vi.fn(async () => new ArrayBuffer(16));
    globalThis.crypto.subtle.encrypt = subtleEncrypt as any;

    const encryptor = new HighlightEncryptor(keyManager);
    const out = await encryptor.encrypt(makeHighlight({ userId: 'user-abc' }));

    expect(subtleEncrypt).toHaveBeenCalledTimes(1);
    expect(out.text).toBe('');
    expect(out.textEncrypted).toBeDefined();
    expect(out.textEncrypted?.keyId).toBe('user-abc');
  });

  it('returns highlight unchanged if it is already encrypted (idempotent)', async () => {
    const keyManager = makeKeyManager({ isUnlocked: true, currentUserId: 'user-abc' });
    const encryptor = new HighlightEncryptor(keyManager);

    const already = makeHighlight({ textEncrypted: { ciphertext: 'X', iv: 'Y', keyId: 'user-abc' } });
    const out = await encryptor.encrypt(already);
    expect(out).toBe(already);
  });

  it('returns highlight unchanged if there is no plaintext text', async () => {
    const keyManager = makeKeyManager({ isUnlocked: true, currentUserId: 'user-abc' });
    const encryptor = new HighlightEncryptor(keyManager);

    const noText = makeHighlight({ text: undefined });
    const out = await encryptor.encrypt(noText);
    expect(out.text).toBeUndefined();
    expect(out.textEncrypted).toBeUndefined();
  });
});
