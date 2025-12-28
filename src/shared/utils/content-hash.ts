/**
 * @file content-hash.ts
 * @description Content-based hashing for deduplication
 * 
 * Uses SHA-256 to generate unique hashes for text content
 */

import { LoggerFactory } from './logger';
import type { ILogger } from './logger';

const logger: ILogger = LoggerFactory.getLogger('ContentHash');

/**
 * Generate SHA-256 hash of text content
 * Used for content-based deduplication
 * 
 * @param text - Text content to hash
 * @returns 64-character hex string (SHA-256)
 */
export async function generateContentHash(text: string): Promise<string> {
    try {
        // Normalize text (lowercase, trim whitespace)
        const normalized = text.toLowerCase().trim();

        // Encode to UTF-8
        const encoder = new TextEncoder();
        const data = encoder.encode(normalized);

        // Generate SHA-256 hash
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);

        // Convert to hex string
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        logger.debug('Generated content hash', {
            textLength: text.length,
            hash: hashHex.substring(0, 16) + '...' // Log first 16 chars
        });

        return hashHex;
    } catch (error) {
        logger.error('Failed to generate content hash', error as Error);
        throw error;
    }
}

/**
 * Verify if text matches hash
 * 
 * @param text - Text to verify
 * @param hash - Expected hash
 * @returns true if text generates the same hash
 */
export async function verifyContentHash(text: string, hash: string): Promise<boolean> {
    const generatedHash = await generateContentHash(text);
    return generatedHash === hash;
}
