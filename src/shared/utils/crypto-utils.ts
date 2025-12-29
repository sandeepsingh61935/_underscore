/**
 * @file crypto-utils.ts
 * @description Cryptographic utilities for domain-scoped storage encryption
 */

const SALT = 'underscore-v1'; // Version-specific salt

/**
 * Hash domain name for storage key obfuscation
 * Prevents enumeration of visited domains
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
 * Derive encryption key from domain
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
 * Encrypt data with domain-specific key
 * Format: IV (12 bytes) + encrypted data
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
 * Decrypt data with domain-specific key
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
