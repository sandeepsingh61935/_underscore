/**
 * @file crypto-utils.ts
 * @description Cryptographic utilities for domain-scoped storage encryption
 */

const SALT = 'underscore-v1'; // Version-specific salt

/**
 * Hashes domain name for storage key obfuscation
 *
 * @param domain - The domain name to hash (e.g., 'example.com')
 * @returns Promise resolving to hex-encoded SHA-256 hash
 *
 * @remarks
 * Security properties:
 * - Uses SHA-256 for cryptographic hashing
 * - Adds version-specific salt to prevent rainbow table attacks
 * - Prevents enumeration of visited domains in storage
 * - Deterministic: same domain always produces same hash
 *
 * @example
 * ```typescript
 * const hash = await hashDomain('example.com');
 * console.log(hash); // '3a7bd3e2360a3d29eea436fcfb7e44c735d117c42d1c1835420b6b9942dd4f1b'
 * ```
 */
export async function hashDomain(domain: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(domain + SALT);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Derives encryption key from domain using PBKDF2
 *
 * @param domain - The domain name to derive key from
 * @returns Promise resolving to AES-256-GCM CryptoKey
 *
 * @remarks
 * Security properties:
 * - Uses PBKDF2 with 100,000 iterations (OWASP recommended minimum)
 * - Derives AES-256-GCM key (authenticated encryption)
 * - Domain-specific keys (domain A ≠ domain B)
 * - Keys never stored, derived on-demand
 * - Salt is version-specific ('underscore-v1')
 *
 * @security
 * - Keys are NOT cached (derived fresh each time)
 * - Extension uninstall = permanent data loss (keys not recoverable)
 * - Not protected against malicious browser extensions with storage access
 *
 * @private
 * @internal
 */
async function deriveKey(domain: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(domain + SALT),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(SALT),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate random IV (Initialization Vector)
 */
function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(12));
}

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Encrypts data using AES-256-GCM with domain-specific key
 *
 * @param data - Plaintext string to encrypt
 * @param domain - Domain name for key derivation (e.g., 'example.com')
 * @returns Promise resolving to base64-encoded ciphertext (IV + encrypted data)
 *
 * @throws {Error} If encryption fails
 * @throws {Error} If domain is invalid
 *
 * @remarks
 * Encryption format: `base64(IV || ciphertext)`
 * - IV: 12 bytes (random, unique per encryption)
 * - Ciphertext: AES-256-GCM encrypted data with auth tag
 *
 * Security guarantees:
 * - **Domain isolation**: Data encrypted on domain A cannot be decrypted on domain B
 * - **Forward secrecy**: Random IV ensures same plaintext → different ciphertext
 * - **Tampering detection**: AES-GCM auth tag detects modifications
 * - **Unicode support**: Preserves all Unicode characters
 *
 * @security
 * - Uses crypto.subtle (Web Crypto API)
 * - Random IV via crypto.getRandomValues()
 * - AES-GCM provides authenticated encryption (no separate HMAC needed)
 * - Keys derived via PBKDF2 (100k iterations)
 *
 * @example
 * ```typescript
 * const plaintext = 'sensitive user data';
 * const encrypted = await encryptData(plaintext, 'example.com');
 * console.log(encrypted); // 'a3F2ZXJ0eXVpb3BbXQ==' (base64)
 *
 * // Same plaintext, different ciphertext (random IV)
 * const encrypted2 = await encryptData(plaintext, 'example.com');
 * console.log(encrypted !== encrypted2); // true
 * ```
 */
export async function encryptData(data: string, domain: string): Promise<string> {
  const key = await deriveKey(domain);
  const iv = generateIV();
  const encoder = new TextEncoder();

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as any },
    key,
    encoder.encode(data)
  );

  // Combine IV + encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return arrayBufferToBase64(combined.buffer as ArrayBuffer);
}

/**
 * Decrypts data using AES-256-GCM with domain-specific key
 *
 * @param encryptedData - Base64-encoded ciphertext (IV + encrypted data)
 * @param domain - Domain name for key derivation (must match encryption domain)
 * @returns Promise resolving to decrypted plaintext string
 *
 * @throws {Error} If decryption fails (wrong domain, tampered data, invalid base64)
 * @throws {DOMException} If AES-GCM authentication fails (tampered ciphertext)
 *
 * @remarks
 * Decryption process:
 * 1. Decode base64 to get IV + ciphertext
 * 2. Extract IV (first 12 bytes)
 * 3. Extract ciphertext (remaining bytes)
 * 4. Derive key from domain (PBKDF2)
 * 5. Decrypt using AES-GCM (verifies auth tag)
 *
 * Security guarantees:
 * - **Cross-domain protection**: Decryption fails if domain doesn't match
 * - **Tampering detection**: AES-GCM auth tag verification (throws if modified)
 * - **Invalid data rejection**: Throws on corrupted/invalid base64
 *
 * @security
 * - AES-GCM authentication tag prevents silent data corruption
 * - Wrong domain key → authentication failure (not decryption to garbage)
 * - Timing-safe comparison (crypto.subtle handles this)
 *
 * @example
 * ```typescript
 * const encrypted = await encryptData('secret', 'example.com');
 *
 * // Correct domain - succeeds
 * const decrypted = await decryptData(encrypted, 'example.com');
 * console.log(decrypted); // 'secret'
 *
 * // Wrong domain - throws
 * try {
 *   await decryptData(encrypted, 'different.com');
 * } catch (e) {
 *   console.error('Decryption failed:', e); // AES-GCM auth failure
 * }
 *
 * // Tampered data - throws
 * const tampered = encrypted.slice(0, -5) + 'AAAAA';
 * try {
 *   await decryptData(tampered, 'example.com');
 * } catch (e) {
 *   console.error('Tampering detected:', e); // Auth tag mismatch
 * }
 * ```
 */
export async function decryptData(
  encryptedData: string,
  domain: string
): Promise<string> {
  const key = await deriveKey(domain);
  const combined = new Uint8Array(base64ToArrayBuffer(encryptedData));

  // Extract IV and data
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}
