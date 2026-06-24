/**
 * @file highlight-encryptor.ts
 * @description Per-highlight text encryption in the background (ADR-013).
 *
 * The content script is a courier: it carries plaintext over IPC. The
 * background is the vault: it encrypts plaintext into an `EncryptedText`
 * envelope before persistence, and decrypts the envelope when the popup
 * needs to render the text.
 *
 * Algorithm choice — Option B (master-key symmetric AES-GCM).
 *
 * The simpler hybrid alternative would derive a per-highlight AES session
 * key, encrypt the text with it, and wrap the session key with the user's
 * RSA public key. That option enables offline read on devices that hold
 * the user's private key but not the master key, and adds an extra
 * ciphertext field (`wrappedKey`) to the envelope. The ADR's envelope
 * shape (`{ ciphertext, iv, keyId }`) does not include `wrappedKey`, so
 * the symmetric option matches the documented contract.
 *
 * Trade-off: every read requires the vault to be unlocked. That matches
 * ADR-013's threat model — the master key lives in background memory only
 * for the SW's lifetime anyway — and the popup already needs the master
 * key for any other private-key operation (e.g. cloud sync).
 *
 * The master key never leaves `IKeyManager`; this service accesses it
 * via `IKeyManager.withMasterKey`, which atomically hands the key to a
 * callback and discards the reference when the callback resolves.
 */

import type { EncryptedText, HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import type { IKeyManager } from '@/background/auth/interfaces/i-key-manager';

export class HighlightEncryptor {
    constructor(private readonly keyManager: IKeyManager) {}

    /**
     * Encrypt a highlight's plaintext text into the ADR-013 envelope.
     *
     * - Sets `textEncrypted` to the ciphertext envelope and clears the
     *   plaintext `text` so no plaintext is persisted at rest. The `text`
     *   field remains on the in-flight shape (which is what the
     *   HighlightDataV2 contract requires) but the orchestrator hands the
     *   resulting record to the repository, which persists it.
     * - Idempotent: if `textEncrypted` is already set, the highlight is
     *   returned unchanged.
     * - Returns the highlight unchanged if the vault is locked (no user
     *   signed in). Ephemeral and Local modes are anonymous and have no
     *   encryption boundary; the plaintext text is stored as-is. ADR-013
     *   only requires encryption for cloud-mode persistence.
     */
    async encrypt(highlight: HighlightDataV2): Promise<HighlightDataV2> {
        if (highlight.textEncrypted) {
            return highlight;
        }

        // No user = no vault = no encryption. Return as-is so writes
        // from anonymous ephemeral/local users still reach IndexedDB.
        if (!this.keyManager.isUnlocked || this.keyManager.currentUserId === null) {
            return highlight;
        }

        const plaintext = highlight.text;
        if (typeof plaintext !== 'string') {
            return highlight;
        }

        const envelope = await this.keyManager.withMasterKey(async (masterKey) => {
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const ciphertext = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv },
                masterKey,
                new TextEncoder().encode(plaintext)
            );

            const env: EncryptedText = {
                ciphertext: arrayBufferToBase64(ciphertext),
                iv: arrayBufferToBase64(iv.buffer),
                keyId: highlight.userId ?? '',
            };
            return env;
        });

        return {
            ...highlight,
            // ADR-013: do not persist plaintext. We drop `text` to an empty
            // string so the schema validates, and store the ciphertext in
            // `textEncrypted`. The popup decrypts `textEncrypted` back to
            // plaintext via `decrypt()` when it needs to render.
            text: '',
            textEncrypted: envelope,
        };
    }

    /**
     * Decrypt an `EncryptedText` envelope back to plaintext.
     *
     * Throws if the vault is locked or if AES-GCM authentication fails
     * (e.g. tampered ciphertext, wrong key).
     */
    async decrypt(envelope: EncryptedText): Promise<string> {
        return this.keyManager.withMasterKey(async (masterKey) => {
            const iv = new Uint8Array(base64ToArrayBuffer(envelope.iv));
            const ciphertext = new Uint8Array(base64ToArrayBuffer(envelope.ciphertext));

            const plaintext = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv },
                masterKey,
                ciphertext
            );

            return new TextDecoder().decode(plaintext);
        });
    }
}

// ============================================
// Base64 helpers
// ============================================
//
// Same approach as `KeyManager` so envelopes round-trip on the same
// encoding rules. Local to this file to avoid widening the shared utils
// surface for two callers.

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i] as number);
    }
    return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}
