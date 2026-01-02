/**
 * @file crypto-utils.test.ts
 * @description Tests for cryptographic utilities
 */

import { describe, it, expect } from 'vitest';

import { hashDomain, encryptData, decryptData } from '@/shared/utils/crypto-utils';

describe('Crypto Utils', () => {
  describe('hashDomain', () => {
    it('should hash domain consistently', async () => {
      const hash1 = await hashDomain('example.com');
      const hash2 = await hashDomain('example.com');

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 = 64 hex chars
    });

    it('should produce different hashes for different domains', async () => {
      const hash1 = await hashDomain('example.com');
      const hash2 = await hashDomain('test.com');

      expect(hash1).not.toBe(hash2);
    });

    it('should produce hex string', async () => {
      const hash = await hashDomain('example.com');
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('encryption', () => {
    it('should encrypt and decrypt data', async () => {
      const original = 'sensitive data';
      const domain = 'example.com';

      const encrypted = await encryptData(original, domain);
      const decrypted = await decryptData(encrypted, domain);

      expect(decrypted).toBe(original);
    });

    it('should produce different ciphertext each time', async () => {
      const data = 'test data';
      const domain = 'example.com';

      const encrypted1 = await encryptData(data, domain);
      const encrypted2 = await encryptData(data, domain);

      // Different due to random IV
      expect(encrypted1).not.toBe(encrypted2);

      // But both decrypt correctly
      expect(await decryptData(encrypted1, domain)).toBe(data);
      expect(await decryptData(encrypted2, domain)).toBe(data);
    });

    it('should fail with wrong domain key', async () => {
      const data = 'secret';
      const encrypted = await encryptData(data, 'example.com');

      await expect(decryptData(encrypted, 'wrong.com')).rejects.toThrow();
    });

    it('should handle unicode data', async () => {
      const data = 'Hello 世界 🎉';
      const encrypted = await encryptData(data, 'example.com');
      const decrypted = await decryptData(encrypted, 'example.com');

      expect(decrypted).toBe(data);
    });

    it('should handle large data', async () => {
      const data = 'x'.repeat(10000);
      const encrypted = await encryptData(data, 'example.com');
      const decrypted = await decryptData(encrypted, 'example.com');

      expect(decrypted).toBe(data);
    });
  });

  describe('Cross-Domain Isolation (CRITICAL)', () => {
    it('should encrypt same data differently per domain', async () => {
      const data = 'sensitive user highlight';

      const encrypted1 = await encryptData(data, 'wikipedia.org');
      const encrypted2 = await encryptData(data, 'example.com');

      // Same plaintext → different ciphertext on different domains
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should prevent cross-domain decryption', async () => {
      const data = 'secret';
      const encrypted = await encryptData(data, 'siteA.com');

      // Domain B cannot decrypt Domain A's data
      await expect(
        decryptData(encrypted, 'siteB.com')
      ).rejects.toThrow(); // AES-GCM authentication fails
    });

    it('should isolate subdomains', async () => {
      const data = 'test';
      const enc1 = await encryptData(data, 'mail.google.com');
      const enc2 = await encryptData(data, 'docs.google.com');

      // Different subdomains → different keys
      expect(enc1).not.toBe(enc2);

      // mail.google.com cannot decrypt docs.google.com data
      await expect(
        decryptData(enc1, 'docs.google.com')
      ).rejects.toThrow();
    });
  });

  describe('Tampering & Corruption Detection', () => {
    it('should detect tampered ciphertext', async () => {
      const encrypted = await encryptData('data', 'example.com');

      // Flip bits in ciphertext (simulate tampering)
      const tampered = encrypted.slice(0, -5) + 'AAAAA';

      // AES-GCM auth tag should detect tampering
      await expect(
        decryptData(tampered, 'example.com')
      ).rejects.toThrow();
    });

    it('should reject invalid base64 ciphertext', async () => {
      await expect(
        decryptData('not-valid-base64!@#$%', 'example.com')
      ).rejects.toThrow();
    });

    it('should handle empty string encryption', async () => {
      const encrypted = await encryptData('', 'example.com');
      const decrypted = await decryptData(encrypted, 'example.com');

      expect(decrypted).toBe('');
    });

    it('should preserve all Unicode characters', async () => {
      const unicode = '你好世界 🌍 こんにちは مرحبا ñáéíóú';
      const encrypted = await encryptData(unicode, 'example.com');
      const decrypted = await decryptData(encrypted, 'example.com');

      expect(decrypted).toBe(unicode);
    });
  });
});
