/**
 * @file integration-setup.ts
 * @description Setup utilities for integration tests
 * 
 * Provides helpers for creating integrated test environments
 */

import { Container } from '@/shared/di/container';
import { registerServices } from '@/shared/di/service-registration';
import { EventBus } from '@/shared/utils/event-bus';
import { LoggerFactory, LogLevel } from '@/shared/utils/logger';
import type { ILogger } from '@/shared/utils/logger';
import type { IHighlightRepository } from '@/shared/repositories/i-highlight-repository';
import type { IStorage } from '@/shared/interfaces/i-storage';

/**
 * Integration test context
 */
export interface IntegrationTestContext {
    container: Container;
    eventBus: EventBus;
    logger: ILogger;
    repository: IHighlightRepository;
    storage: IStorage;
}

/**
 * Create an integration test environment with real services
 * 
 * Uses real implementations (not mocks) for true integration testing
 * Following testing-strategy-v2: prefer real implementations
 */
export function createIntegrationContext(): IntegrationTestContext {
    const container = new Container();
    registerServices(container);

    // Resolve core services
    const eventBus = container.resolve<EventBus>('eventBus');
    const logger = container.resolve<ILogger>('logger');
    const repository = container.resolve<IHighlightRepository>('repository');
    const storage = container.resolve<IStorage>('storage');

    // Set logger to minimal output during tests
    logger.setLevel(LogLevel.ERROR);

    return {
        container,
        eventBus,
        logger,
        repository,
        storage,
    };
}

/**
 * Clean up integration test context
 */
export async function cleanupIntegrationContext(context: IntegrationTestContext): Promise<void> {
    // Clear event listeners
    context.eventBus.removeAllListeners?.();

    // Clear storage
    await context.storage.clear?.();

    // Clear container
    context.container.clear?.();
}

/**
 * Wait for event to be emitted
 */
export function waitForEvent(
    eventBus: EventBus,
    eventName: string,
    timeout = 1000
): Promise<any> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Timeout waiting for event: ${eventName}`));
        }, timeout);

        eventBus.once(eventName, (data: any) => {
            clearTimeout(timer);
            resolve(data);
        });
    });
}
