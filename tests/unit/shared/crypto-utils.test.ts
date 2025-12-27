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

            await expect(
                decryptData(encrypted, 'wrong.com')
            ).rejects.toThrow();
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
});
