/**
 * @file crypto-utils.ts
 * @description Cryptographic utilities for domain-scoped storage key obfuscation
 */

const SALT = 'underscore-v1';

/**
 * Hashes domain name for storage key obfuscation.
 */
export async function hashDomain(domain: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(domain + SALT);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
