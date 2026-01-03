/**
 * @file di-container.integration.test.ts
 * @description Integration tests for DI container behavior
 * @testing 3 tests covering singleton registration, dependency resolution, service lifecycle
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Container } from '@/shared/di/container';
import { EventBus } from '@/shared/utils/event-bus';
import { LoggerFactory } from '@/shared/utils/logger';
import type { ILogger } from '@/shared/utils/logger';

describe('DI Container Integration Tests', () => {
    let container: Container;

    beforeEach(() => {
        container = new Container();
    });

    /**
     * Test 1: BASIC - Singleton services return same instance
     */
    it('should return the same instance for singleton services', () => {
        // Arrange: Register a singleton
        container.registerSingleton<ILogger>('logger', () => {
            return LoggerFactory.getLogger('Test');
        });

        // Act: Resolve twice
        const logger1 = container.resolve<ILogger>('logger');
        const logger2 = container.resolve<ILogger>('logger');

        // Assert: Same instance
        expect(logger1).toBe(logger2);
        expect(logger1).toBeDefined();
    });

    /**
     * Test 2: REALISTIC - Transient services return new instances
     */
    it('should return different instances for transient services', () => {
        // Arrange: Register a transient service
        let instanceCount = 0;
        container.registerTransient('counter', () => {
            return { id: ++instanceCount };
        });

        // Act: Resolve twice
        const instance1 = container.resolve<{ id: number }>('counter');
        const instance2 = container.resolve<{ id: number }>('counter');

        // Assert: Different instances
        expect(instance1).not.toBe(instance2);
        expect(instance1.id).toBe(1);
        expect(instance2.id).toBe(2);
    });

    /**
     * Test 3: TRICKY - Dependencies are resolved correctly
     */
    it('should resolve dependencies in correct order', () => {
        // Arrange: Register services with dependencies
        container.registerSingleton<ILogger>('logger', () => {
            return LoggerFactory.getLogger('Test');
        });

        container.registerSingleton<EventBus>('eventBus', () => {
            return new EventBus();
        });

        container.registerSingleton('serviceWithDeps', () => {
            const logger = container.resolve<ILogger>('logger');
            const eventBus = container.resolve<EventBus>('eventBus');

            return {
                logger,
                eventBus,
                name: 'TestService',
            };
        });

        // Act: Resolve service with dependencies
        const service = container.resolve<{
            logger: ILogger;
            eventBus: EventBus;
            name: string;
        }>('serviceWithDeps');

        // Assert: Dependencies injected correctly
        expect(service).toBeDefined();
        expect(service.logger).toBeDefined();
        expect(service.eventBus).toBeDefined();
        expect(service.name).toBe('TestService');

        // Assert: Dependencies are singletons
        const logger = container.resolve<ILogger>('logger');
        const eventBus = container.resolve<EventBus>('eventBus');
        expect(service.logger).toBe(logger);
        expect(service.eventBus).toBe(eventBus);
    });
});
