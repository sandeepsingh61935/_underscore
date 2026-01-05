/**
 * @file supabase-storage-adapter.test.ts
 * @description Unit tests for SupabaseStorageAdapter
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseStorageAdapter } from '@/background/auth/supabase-storage-adapter';

describe('SupabaseStorageAdapter', () => {
    let adapter: SupabaseStorageAdapter;
    let mockStorage: any;

    beforeEach(() => {
        // Mock chrome.storage.local
        mockStorage = {
            get: vi.fn(),
            set: vi.fn(),
            remove: vi.fn(),
        };

        adapter = new SupabaseStorageAdapter(mockStorage);
    });

    it('should set item directly in storage', async () => {
        const key = 'test-key';
        const value = 'test-value';

        await adapter.setItem(key, value);

        expect(mockStorage.set).toHaveBeenCalledWith({ [key]: value });
    });

    it('should get item directly from storage', async () => {
        const key = 'test-key';
        const value = 'test-value';

        mockStorage.get.mockResolvedValue({ [key]: value });

        const result = await adapter.getItem(key);

        expect(result).toBe(value);
        expect(mockStorage.get).toHaveBeenCalledWith(key);
    });

    it('should return null if item not found', async () => {
        const key = 'test-key';

        mockStorage.get.mockResolvedValue({});

        const result = await adapter.getItem(key);

        expect(result).toBeNull();
    });

    it('should remove item directly from storage', async () => {
        const key = 'test-key';

        await adapter.removeItem(key);

        expect(mockStorage.remove).toHaveBeenCalledWith(key);
    });

    it('should handle set errors', async () => {
        const error = new Error('Storage failed');
        mockStorage.set.mockRejectedValue(error);

        await expect(adapter.setItem('key', 'value')).rejects.toThrow(error);
    });

    it('should handle remove errors', async () => {
        const error = new Error('Storage failed');
        mockStorage.remove.mockRejectedValue(error);

        await expect(adapter.removeItem('key')).rejects.toThrow(error);
    });

    it('should return null on get error (prevent crash)', async () => {
        const error = new Error('Storage failed');
        mockStorage.get.mockRejectedValue(error);

        const result = await adapter.getItem('key');
        expect(result).toBeNull();
    });
});
