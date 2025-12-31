/**
 * @file mocks.test.ts
 * @description Verifies that mock implementations behave correctly
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { createMockContainer } from '../../helpers/mock-container';

import type { ILogger } from '@/shared/utils/logger';

describe('Mock Infrastructure (10 tests)', () => {
    let context: ReturnType<typeof createMockContainer>;

    beforeEach(() => {
        context = createMockContainer();
    });

    // ============================================
    // Mock Repository Tests
    // ============================================

    it('1. MockRepository tracks method calls', async () => {
        const { repository } = context.mocks;
        const item = { id: '1', text: 'test' } as any;

        await repository.add(item);

        expect(repository.addSpy).toHaveBeenCalledWith(item);
        expect(await repository.findById('1')).toEqual(item);
    });

    it('2. MockRepository can be reset', async () => {
        const { repository } = context.mocks;
        await repository.add({ id: '1' } as any);

        repository.reset();

        expect(repository.count()).toBe(0);
        expect(repository.addSpy).not.toHaveBeenCalled(); // Cleared history
    });

    // ============================================
    // Mock Logger Tests
    // ============================================

    it('3. MockLogger captures logs', () => {
        const { logger } = context.mocks;

        logger.info('test message');
        logger.error('error message', new Error('fail'));

        expect(logger.infoSpy).toHaveBeenCalledWith('test message');
        expect(logger.errorSpy).toHaveBeenCalledWith('error message', expect.any(Error));
    });

    // ============================================
    // Mock Storage Tests
    // ============================================

    it('4. MockStorage simulates persistence', async () => {
        const { storage } = context.mocks;
        const event = { type: 'test', timestamp: 123 } as any;

        await storage.saveEvent(event);
        const loaded = await storage.loadEvents();

        expect(storage.saveEventSpy).toHaveBeenCalledWith(event);
        expect(loaded).toContain(event);
    });

    // ============================================
    // Mock Messaging Tests
    // ============================================

    it('5. MockMessaging handles simulator helpers', () => {
        const { messaging } = context.mocks;
        const handler = vi.fn();

        messaging.onMessage(handler);
        messaging.simulateMessage({ type: 'TEST' });

        expect(handler).toHaveBeenCalledWith({ type: 'TEST' }, {}, expect.any(Function));
    });

    // ============================================
    // Mock Mode Manager Tests
    // ============================================

    it('6. MockModeManager allows spying on mode transitions', async () => {
        const { modeManager } = context.mocks;

        await modeManager.activateMode('sprint');

        expect(modeManager.activateModeSpy).toHaveBeenCalledWith('sprint');
        expect(modeManager.currentModeName).toBe('sprint');
    });

    it('7. MockModeManager stubs highlight creation', async () => {
        const { modeManager } = context.mocks;

        const id = await modeManager.createHighlight({} as any, 'yellow');

        expect(modeManager.createHighlightSpy).toHaveBeenCalled();
        expect(id).toContain('mock-id');
    });

    // ============================================
    // Mock Container Tests
    // ============================================

    it('8. MockContainer provides correctly typed resolutions', () => {
        const { container } = context;

        // Verify we get the MOCK implementation back, typed as the interface
        const resolvedLogger = container.resolve<ILogger>('logger');

        // It should match the mock instance
        expect(resolvedLogger).toBe(context.mocks.logger);
    });

    it('9. MockContainer dependencies are pre-wired', () => {
        // Just verifying the helper set everything up
        expect(context.container.has('logger')).toBe(true);
        expect(context.container.has('repository')).toBe(true);
        expect(context.container.has('storage')).toBe(true);
        expect(context.container.has('messaging')).toBe(true);
        expect(context.container.has('modeManager')).toBe(true);
        expect(context.container.has('eventBus')).toBe(true); // Real one
    });

    it('10. Mocks isolate state between tests', async () => {
        // Verify state doesn't leak if we create a NEW container
        const { repository: repo1 } = context.mocks;
        await repo1.add({ id: 'A' } as any);

        const context2 = createMockContainer();
        const { repository: repo2 } = context2.mocks;

        expect(repo1.count()).toBe(1);
        expect(repo2.count()).toBe(0);
    });
});
