import type { SupportedStorage } from '@supabase/supabase-js';

/**
 * Storage adapter implementation for Supabase client
 * Stores session data directly in chrome.storage.local
 * 
 * Note: Chrome Extension storage is already sandboxed and encrypted at rest by the OS/Browser.
 * Additional application-level encryption with hardcoded keys adds complexity without real security.
 */
export class SupabaseStorageAdapter implements SupportedStorage {
    /**
     * @param storageArea - Storage area to use (default: local)
     */
    constructor(
        private readonly storageArea: chrome.storage.StorageArea = chrome.storage.local
    ) { }

    /**
     * Retrieve item from storage
     * @param key - Storage key
     */
    async getItem(key: string): Promise<string | null> {
        try {
            const result = await this.storageArea.get(key);
            return (result[key] as string) || null;
        } catch (error) {
            console.warn('Failed to retrieve Supabase session:', error);
            return null;
        }
    }

    /**
     * Set item in storage
     * @param key - Storage key
     * @param value - Value to store
     */
    async setItem(key: string, value: string): Promise<void> {
        try {
            await this.storageArea.set({ [key]: value });
        } catch (error) {
            console.error('Failed to save Supabase session:', error);
            throw error;
        }
    }

    /**
     * Remove item from storage
     * @param key - Storage key
     */
    async removeItem(key: string): Promise<void> {
        try {
            await this.storageArea.remove(key);
        } catch (error) {
            console.error('Failed to remove Supabase session:', error);
            throw error;
        }
    }
}
