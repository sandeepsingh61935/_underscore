import { Container } from '@/shared/di/container';
import { ILogger } from '@/shared/interfaces/i-logger';
import { IEventBus } from '@/shared/interfaces/i-event-bus';
import { IHighlightRepository } from '@/shared/repositories/i-highlight-repository';
import { IAPIClient } from '@/background/api/interfaces/i-api-client';
import { LocalToCloudMigrator } from './local-to-cloud-migrator';
import { MigrationValidator } from './migration-validator';
import { RollbackService } from './rollback-service';
import { ChromePersistentStorage } from '@/shared/services/chrome-persistent-storage';

export function registerMigrationComponents(container: Container): void {
    // Persistent Storage
    container.registerSingleton<ChromePersistentStorage>('persistentStorage', () => {
        return new ChromePersistentStorage();
    });

    container.registerSingleton<LocalToCloudMigrator>('migrator', () => {
        const repo = container.resolve<IHighlightRepository>('repository');
        const api = container.resolve<IAPIClient>('apiClient');
        const bus = container.resolve<IEventBus>('eventBus');
        const logger = container.resolve<ILogger>('logger');
        const storage = container.resolve<ChromePersistentStorage>('persistentStorage');

        return new LocalToCloudMigrator(repo, api, bus, logger, storage);
    });

    container.registerSingleton<MigrationValidator>('migrationValidator', () => {
        const repo = container.resolve<IHighlightRepository>('repository');
        const api = container.resolve<IAPIClient>('apiClient');
        const logger = container.resolve<ILogger>('logger');
        return new MigrationValidator(repo, api, logger);
    });

    container.registerSingleton<RollbackService>('rollbackService', () => {
        const api = container.resolve<IAPIClient>('apiClient');
        const storage = container.resolve<ChromePersistentStorage>('persistentStorage');
        const bus = container.resolve<IEventBus>('eventBus');
        const logger = container.resolve<ILogger>('logger');
        return new RollbackService(api, storage, bus, logger);
    });
}
