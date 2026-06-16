
import { describe, it, expect, beforeEach } from 'vitest';
import { Container } from '@/shared/di/container';
import type { Container as BackgroundContainer } from '@/background/di/container';
import { registerServices } from '@/shared/di/service-registration';
import { registerAPIComponents } from '@/background/api/api-container-registration';
import { registerEventComponents } from '@/background/events/events-container-registration';
import { IAPIClient } from '@/background/api/interfaces/i-api-client';
import { MockAPIClient } from '../../helpers/mocks/mock-api-client';
import { IMigrator } from '@/background/migration/interfaces/i-migrator';
import { IHighlightRepository } from '@/shared/repositories/i-highlight-repository';
import { createTestHighlight } from '../../helpers/test-fixtures';
import { registerSyncComponents } from '@/background/sync/sync-container-registration';
import { registerRealtimeComponents } from '@/background/realtime/realtime-container-registration';

describe('Migration E2E Flow (DI Container)', () => {
    let container: Container;

    beforeEach(() => {
        container = new Container();

        // Register Real Services
        // Note: We need to register configurations first if expected
        container.registerInstance('supabaseConfig', { url: 'http://mock', anonKey: 'mock' });

        // The two parallel DI trees (src/shared/di and src/background/di) define
        // their own Container classes. They're runtime-compatible but nominally
        // distinct types. Cast at the boundary so the test can mix registrations
        // from both trees.
        const bg = container as unknown as BackgroundContainer;
        registerServices(container);
        registerAPIComponents(bg);
        registerEventComponents(bg);
        registerSyncComponents(bg);
        registerRealtimeComponents(bg);

        // Override API Client with Mock for E2E safety (don't hit real network)
        // We re-register it to overwrite the real one
        container.registerSingleton<IAPIClient>('apiClient', () => {
            return new MockAPIClient();
        });
    });

    it('successfully resolves and executes full migration via DI', async () => {
        // Resolve Migration Service
        const migrator = container.resolve<IMigrator>('migrator');
        const repo = container.resolve<IHighlightRepository>('repository');
        const api = container.resolve<IAPIClient>('apiClient') as MockAPIClient;

        // Setup Data
        const h1 = createTestHighlight({ id: 'e2e-1', text: 'E2E Test' });
        await repo.add(h1);

        // Execute
        const result = await migrator.migrate();

        // Verify
        expect(result.migrated).toBe(1);
        expect(result.failed).toBe(0);

        // Check Remote State via API Client
        const remote = await api.getHighlights();
        expect(remote).toHaveLength(1);
        expect(remote[0]?.id).toBe('e2e-1');
    });
});
