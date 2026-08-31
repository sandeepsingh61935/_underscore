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

import { InMemoryHighlightRepository } from '@/shared/repositories/in-memory-highlight-repository';
import { RepositoryFacade } from '@/shared/repositories/repository-facade';
import { LoggerFactory } from '@/shared/utils/logger';
/**
 * Singleton instance
 */
let serviceInstance: CloudModeService | null = null;

/**
 * Create CloudModeService with the RepositoryFacade.
 *
 * Per ADR-005: the service no longer holds an IHighlightRepository
 * reference (which the content-side IPC adapter cannot satisfy as it is
 * write-only). Instead, it holds a RepositoryFacade. The facade
 * initializes itself from an in-memory repository and writes are routed
 * to the background via the IPC adapter, which is registered separately
 * for the cloud-mode flow.
 *
 * @returns CloudModeService instance
 */
export function createCloudModeServiceWithCloudSync(): CloudModeService {
  if (serviceInstance) {
    return serviceInstance;
  }

  const logger = LoggerFactory.getLogger('CloudModeService');

  // Facade backed by an in-memory repo. Writes go through the facade
  // (sync); the facade's underlying repository handles the actual
  // persistence path (IndexedDB / IPC adapter / Supabase).
  const facade = new RepositoryFacade(new InMemoryHighlightRepository());
  void facade.initialize().catch((e) => {
    logger.error('Failed to initialize facade', e as Error);
  });

  // Create supporting services
  const selectorEngine = new MultiSelectorEngine();

  // Create CloudModeService
  serviceInstance = new CloudModeService(facade, selectorEngine, logger);

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
