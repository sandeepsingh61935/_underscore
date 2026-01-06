
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { openDB, deleteDB } from 'idb';
import { OfflineQueueService } from '@/background/services/offline-queue-service';
import type { SupabaseHighlightRepository } from '@/background/repositories/supabase-highlight-repository';
import type { IAuthManager, User } from '@/background/auth/interfaces/i-auth-manager';
import type { ILogger } from '@/shared/interfaces/i-logger';

describe('OfflineQueueService', () => {
    let service: OfflineQueueService;
    let mockCloudRepo: any;
    let mockAuthManager: any;
    let mockLogger: any;

    const DB_NAME = 'underscore_offline_queue';
    const STORE_NAME = 'queue';

    beforeEach(async () => {
        // Mock dependencies
        mockCloudRepo = {
            add: vi.fn(),
            update: vi.fn(),
            remove: vi.fn(),
        };

        mockAuthManager = {
            currentUser: { id: 'user-1' } as User,
            getAuthState: vi.fn().mockReturnValue({ isAuthenticated: true }),
        };

        mockLogger = {
            debug: vi.fn(),
            info: vi.fn(),
            error: vi.fn(),
        };

        // Reset DB
        await deleteDB(DB_NAME);

        service = new OfflineQueueService(
            mockCloudRepo as unknown as SupabaseHighlightRepository,
            mockAuthManager as unknown as IAuthManager,
            mockLogger as unknown as ILogger
        );
    });

    afterEach(async () => {
        await service.close(); // Close connection before deleting DB
        vi.clearAllMocks();
        await deleteDB(DB_NAME);
    });

    it('should enqueue operations', async () => {
        await service.enqueue('add', 'hl-1', { text: 'test' });

        const count = await service.size();
        expect(count).toBe(1);

        const db = await openDB(DB_NAME, 1);
        const all = await db.getAll(STORE_NAME);
        expect(all[0]).toMatchObject({
            type: 'add',
            targetId: 'hl-1',
            retryCount: 0
        });
        expect(all[0].id).toBeDefined();
        db.close();
    });

    it('should process queue when online and authenticated', async () => {
        Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

        // Enqueue items
        await service.enqueue('add', 'hl-1', { text: 'foo' });
        await service.enqueue('remove', 'hl-2');

        // Process
        await service.processQueue();

        // Verify calls
        expect(mockCloudRepo.add).toHaveBeenCalledWith({ text: 'foo' });
        expect(mockCloudRepo.remove).toHaveBeenCalledWith('hl-2');

        // Check queue empty
        const count = await service.size();
        expect(count).toBe(0);
    });

    it('should NOT process queue if offline', async () => {
        Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

        await service.enqueue('add', 'hl-1');
        await service.processQueue();

        expect(mockCloudRepo.add).not.toHaveBeenCalled();
        const count = await service.size();
        expect(count).toBe(1);
    });

    it('should NOT process queue if unauthenticated', async () => {
        Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
        mockAuthManager.currentUser = null;

        await service.enqueue('add', 'hl-1');
        await service.processQueue();

        expect(mockCloudRepo.add).not.toHaveBeenCalled();
        const count = await service.size();
        expect(count).toBe(1);
    });

    it('should retry failed operations', async () => {
        Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

        // Setup failure
        mockCloudRepo.add.mockRejectedValueOnce(new Error('Network Error'));

        await service.enqueue('add', 'hl-1');
        await service.processQueue();

        // Should have called add
        expect(mockCloudRepo.add).toHaveBeenCalled();

        // Should still be in queue
        const count = await service.size();
        expect(count).toBe(1);

        // Retry count should be incremented
        const db = await openDB(DB_NAME, 1);
        const item = (await db.getAll(STORE_NAME))[0];
        expect(item.retryCount).toBe(1);
        db.close();
    });

    it('should drop operation after max retries', async () => {
        Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

        // Mock add to always fail
        mockCloudRepo.add.mockRejectedValue(new Error('Persistent Error'));

        // Manually insert item with high retry count
        const db = await openDB(DB_NAME, 1, {
            upgrade(db) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('timestamp', 'timestamp');
            }
        });
        await db.add(STORE_NAME, {
            id: 'test-id',
            type: 'add',
            targetId: 'hl-1',
            payload: {},
            timestamp: Date.now(),
            retryCount: 5 // Max is 5 in code
        });
        db.close();

        // Process
        await service.processQueue();

        // Should try one more time? NO, code checks `if (op.retryCount < 5)`. 
        // If it comes in as 5, it tries to execute. If it fails, checks < 5. 5 is not < 5.
        // So it drops (deletes).

        expect(mockCloudRepo.add).toHaveBeenCalled(); // It attempts execution first

        // Should be gone
        const count = await service.size();
        expect(count).toBe(0);

        expect(mockLogger.error).toHaveBeenCalledWith(
            expect.stringContaining('Max retries exceeded'),
            undefined,
            expect.anything()
        );
    });
});
