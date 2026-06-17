/**
 * @file cloud-mode-service-factory.ts
 * @description Factory for creating CloudModeService with cloud sync enabled
 * 
 * This factory creates CloudModeService instances with DualWriteRepository,
 * enabling automatic sync to Supabase when authenticated.
 * 
 * Used by content scripts which run in a separate context from the background
 * service worker and cannot directly access the DI container.
 */

import { CloudModeService } from './cloud-mode-service';
import { MultiSelectorEngine } from './multi-selector-engine';
import { IpcHighlightRepository } from '@/content/repositories/ipc-highlight-repository';
import { ChromeMessageBus } from '@/shared/services/chrome-message-bus';
import { LoggerFactory } from '@/shared/utils/logger';
/**
 * Singleton instance
 */
let serviceInstance: CloudModeService | null = null;

/**
 * Create CloudModeService with IPC proxy to background worker
 *
 * This creates a service that delegates all persistence to the background
 * worker via message passing.
 *
 * @returns CloudModeService instance
 */
export function createCloudModeServiceWithCloudSync(): CloudModeService {
    if (serviceInstance) {
        return serviceInstance;
    }

    const logger = LoggerFactory.getLogger('CloudModeService');

    // Per ADR-004: IPC goes through IMessageBus. We construct a fresh
    // ChromeMessageBus here because this factory is used outside the DI
    // container (in content scripts that don't have container access).
    const messageBus = new ChromeMessageBus(logger);
    const repository = new IpcHighlightRepository(messageBus);

    // Create supporting services
    const selectorEngine = new MultiSelectorEngine();

    // Create CloudModeService
    serviceInstance = new CloudModeService(repository, selectorEngine, logger);

    return serviceInstance;
}

/**
 * Get existing service instance or create new one with cloud sync
 * 
 * @deprecated Use createCloudModeServiceWithCloudSync() for clarity
 */
export function getCloudModeServiceWithCloudSync(): CloudModeService {
    return createCloudModeServiceWithCloudSync();
}
