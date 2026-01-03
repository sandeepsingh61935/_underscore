/**
 * @file i-token-store.ts
 * @description Encrypted token storage interface
 * @architecture Dependency Inversion Principle (DIP)
 * @security AES-GCM encryption for tokens
 */

/**
 * OAuth authentication token
 */
export interface AuthToken {
    /**
     * OAuth access token (encrypted in storage)
     */
    readonly accessToken: string;

    /**
     * OAuth refresh token (encrypted in storage)
     */
    readonly refreshToken: string;

    /**
     * Token expiration time
     */
    readonly expiresAt: Date;

    /**
     * User ID associated with this token
     */
    readonly userId: string;

    /**
     * OAuth provider
     */
    readonly provider: string;

    /**
     * Token scopes/permissions
     */
    readonly scopes?: string[];
}

/**
 * Encrypted token storage interface
 *
 * @responsibility Securely store and retrieve OAuth tokens
 * @security AES-GCM encryption with unique IV per token
 * @pattern Repository Pattern (storage abstraction)
 */
export interface ITokenStore {
    /**
     * Save authentication token (encrypted)
     *
     * @param token - Token to save
     * @returns Promise that resolves when token saved
     * @throws StorageError if save fails
     * @throws EncryptionError if encryption fails
     */
    saveToken(token: AuthToken): Promise<void>;

    /**
     * Retrieve authentication token (decrypted)
     *
     * @param userId - User ID to retrieve token for
     * @returns Token if found, null otherwise
     * @throws StorageError if retrieval fails
     * @throws DecryptionError if decryption fails
     */
    getToken(userId: string): Promise<AuthToken | null>;

    /**
     * Remove authentication token
     *
     * @param userId - User ID to remove token for
     * @returns Promise that resolves when token removed
     * @throws StorageError if removal fails
     */
    removeToken(userId: string): Promise<void>;

    /**
     * Clear all tokens
     *
     * @returns Promise that resolves when all tokens cleared
     * @throws StorageError if clear fails
     */
    clear(): Promise<void>;

    /**
     * Check if token exists for user
     *
     * @param userId - User ID to check
     * @returns True if token exists, false otherwise
     */
    hasToken(userId: string): Promise<boolean>;
}
