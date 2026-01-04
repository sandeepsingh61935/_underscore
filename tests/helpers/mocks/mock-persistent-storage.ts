
import type { IPersistentStorage } from '@/shared/interfaces/i-storage';

export class MockPersistentStorage implements IPersistentStorage {
    private store = new Map<string, any>();

    async save<T>(key: string, value: T): Promise<void> {
        this.store.set(key, value);
    }

    async load<T>(key: string): Promise<T | null> {
        return this.store.get(key) || null;
    }

    async delete(key: string): Promise<void> {
        this.store.delete(key);
    }

    clear() {
        this.store.clear();
    }
}
