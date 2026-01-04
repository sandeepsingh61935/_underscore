import { IPersistentStorage } from '@/shared/interfaces/i-storage';

export class ChromePersistentStorage implements IPersistentStorage {
    async save<T>(key: string, value: T): Promise<void> {
        await chrome.storage.local.set({ [key]: value });
    }

    async load<T>(key: string): Promise<T | null> {
        const result = await chrome.storage.local.get(key);
        return (result[key] as T) ?? null;
    }

    async delete(key: string): Promise<void> {
        await chrome.storage.local.remove(key);
    }
}
