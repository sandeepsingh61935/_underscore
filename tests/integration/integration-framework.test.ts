/**
 * @file integration-framework.test.ts
 * @description Tests for integration test infrastructure
 * 
 * Verifies that integration test framework is working correctly
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
    createIntegrationContext,
    cleanupIntegrationContext,
    waitForEvent,
    type IntegrationTestContext
} from '../helpers/integration-setup';

describe('Integration Test Framework (5 tests)', () => {
    let context: IntegrationTestContext;

    beforeEach(() => {
        context = createIntegrationContext();
    });

    afterEach(async () => {
        await cleanupIntegrationContext(context);
    });

    it('1. createIntegrationContext provides all services', () => {
        expect(context.container).toBeDefined();
        expect(context.eventBus).toBeDefined();
        expect(context.logger).toBeDefined();
        expect(context.repository).toBeDefined();
        expect(context.storage).toBeDefined();
    });

    it('2. services are real implementations (not mocks)', () => {
        // Verify we get real instances, not mocks
        expect(context.repository.constructor.name).toBe('InMemoryHighlightRepository');
        expect(context.storage.constructor.name).toBe('StorageService');
        expect(context.eventBus.constructor.name).toBe('EventBus');
    });

    it('3. container can resolve registered services', () => {
        const logger = context.container.resolve('logger');
        const eventBus = context.container.resolve('eventBus');

        expect(logger).toBe(context.logger);
        expect(eventBus).toBe(context.eventBus);
    });

    it('4. eventBus can emit and listen to events', async () => {
        const eventData = { test: 'data' };

        const promise = waitForEvent(context.eventBus, 'test:event', 500);
        context.eventBus.emit('test:event', eventData);

        const received = await promise;
        expect(received).toEqual(eventData);
    });

    it('5. waitForEvent times out if event not emitted', async () => {
        await expect(
            waitForEvent(context.eventBus, 'never:emitted', 100)
        ).rejects.toThrow('Timeout waiting for event');
    });
});
