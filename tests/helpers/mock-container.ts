/**
 * @file mock-container.ts
 * @description Helper to create a DI container with mock implementations
 */

import { MockLogger } from './mocks/mock-logger';
import { MockMessaging } from './mocks/mock-messaging';
import { MockModeManager } from './mocks/mock-mode-manager';
import { MockRepository } from './mocks/mock-repository';
import { MockStorage } from './mocks/mock-storage';

import { Container } from '@/shared/di/container';
import { EventBus } from '@/shared/utils/event-bus'; // Use real EventBus (fast, logic-free)

export interface MockContainerContext {
    container: Container;
    mocks: {
        logger: MockLogger;
        repository: MockRepository;
        storage: MockStorage;
        messaging: MockMessaging;
        modeManager: MockModeManager;
        eventBus: EventBus;
    };
}

/**
 * Creates a container pre-registered with mocks
 * useful for unit testing components that depend on DI
 */
export function createMockContainer(): MockContainerContext {
    const container = new Container();

    // Create mocks
    const logger = new MockLogger();
    const repository = new MockRepository();
    const storage = new MockStorage();
    const messaging = new MockMessaging();
    const modeManager = new MockModeManager();
    const eventBus = new EventBus();

    // Register mocks
    container.registerInstance('logger', logger);
    container.registerInstance('repository', repository);
    container.registerInstance('storage', storage);
    container.registerInstance('messaging', messaging);
    container.registerInstance('modeManager', modeManager);
    container.registerInstance('eventBus', eventBus);

    return {
        container,
        mocks: {
            logger,
            repository,
            storage,
            messaging,
            modeManager,
            eventBus,
        },
    };
}
