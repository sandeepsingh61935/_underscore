/**
 * Service Registration Tests (8 tests)
 *
 * Verifies that all services are correctly registered and can be resolved.
 * Tests dependency graph integrity and singleton behavior.
 */
import { describe, it, expect, beforeEach } from 'vitest';

import type { IHighlightMode } from '@/content/modes/highlight-mode.interface';
import { ModeManager } from '@/content/modes/mode-manager';
import { Container } from '@/shared/di/container';
import { registerServices, getDependencyGraph } from '@/shared/di/service-registration';
import type { IMessaging, ITabQuery } from '@/shared/interfaces/i-messaging';
import type { IModeManager } from '@/shared/interfaces/i-mode-manager';
import type { IStorage } from '@/shared/interfaces/i-storage';
import type { IHighlightRepository } from '@/shared/repositories/i-highlight-repository';
import type { EventBus } from '@/shared/utils/event-bus';
import type { ILogger } from '@/shared/utils/logger';

describe('Service Registration (8 tests)', () => {
    let container: Container;

    beforeEach(() => {
        container = new Container();
        registerServices(container);
    });

    // ============================================
    // Registration Tests
    // ============================================

    it('1. all services are registered', () => {
        // Act
        const keys = container.getRegisteredKeys();

        // Assert
        const expectedServices = [
            'logger',
            'eventBus',
            'storage',
            'repository',
            'messaging',
            'tabQuery',
            'modeManager',
            'walkMode',
            'sprintMode',
            'vaultMode',
        ];

        expectedServices.forEach((service) => {
            expect(keys).toContain(service);
        });
    });

    it('2. can resolve all services without errors', () => {
        // Act & Assert: Should not throw
        expect(() => container.resolve<ILogger>('logger')).not.toThrow();
        expect(() => container.resolve<EventBus>('eventBus')).not.toThrow();
        expect(() => container.resolve<IStorage>('storage')).not.toThrow();
        expect(() => container.resolve<IHighlightRepository>('repository')).not.toThrow();
        expect(() => container.resolve<IMessaging>('messaging')).not.toThrow();
        expect(() => container.resolve<ITabQuery>('tabQuery')).not.toThrow();
        expect(() => container.resolve<IModeManager>('modeManager')).not.toThrow();
        expect(() => container.resolve<IHighlightMode>('walkMode')).not.toThrow();
        expect(() => container.resolve<IHighlightMode>('sprintMode')).not.toThrow();
        expect(() => container.resolve<IHighlightMode>('vaultMode')).not.toThrow();
    });

    // ============================================
    // Dependency Graph Tests
    // ============================================

    it('3. dependency graph is acyclic (no circular dependencies)', () => {
        // Act: Resolve all services (would throw if circular)
        expect(() => {
            container.resolve('logger');
            container.resolve('eventBus');
            container.resolve('storage');
            container.resolve('repository');
            container.resolve('messaging');
            container.resolve('tabQuery');
            container.resolve('modeManager');
            container.resolve('walkMode');
            container.resolve('sprintMode');
            container.resolve('vaultMode');
        }).not.toThrow(/Circular dependency/);
    });

    it('4. dependency graph structure is correct', () => {
        // Act
        const graph = getDependencyGraph();

        // Assert
        expect(graph.get('logger')).toEqual([]);
        expect(graph.get('eventBus')).toEqual([]);
        expect(graph.get('modeManager')).toEqual(['eventBus', 'logger']);
        expect(graph.get('walkMode')).toContain('repository');
        expect(graph.get('walkMode')).toContain('eventBus');
        expect(graph.get('sprintMode')).toContain('repository');
        expect(graph.get('sprintMode')).toContain('storage');
    });

    // ============================================
    // Lifecycle Tests
    // ============================================

    it('5. singletons are shared correctly', () => {
        // Act: Resolve same service twice
        const logger1 = container.resolve<ILogger>('logger');
        const logger2 = container.resolve<ILogger>('logger');

        const eventBus1 = container.resolve<EventBus>('eventBus');
        const eventBus2 = container.resolve<EventBus>('eventBus');

        const storage1 = container.resolve<IStorage>('storage');
        const storage2 = container.resolve<IStorage>('storage');

        // CommandFactory should be singleton
        // We use 'any' here because CommandFactory might not be exported as a type in this file imports yet,
        // or we need to import it. Let's check imports.
        // It is NOT imported. I need to add import first.
        const factory1 = container.resolve('commandFactory');
        const factory2 = container.resolve('commandFactory');

        // Assert: Same instances
        expect(logger1).toBe(logger2);
        expect(eventBus1).toBe(eventBus2);
        expect(storage1).toBe(storage2);
        expect(factory1).toBe(factory2);
    });

    it('6. transient services create new instances', () => {
        // Act: Resolve modes twice
        const walkMode1 = container.resolve<IHighlightMode>('walkMode');
        const walkMode2 = container.resolve<IHighlightMode>('walkMode');

        const sprintMode1 = container.resolve<IHighlightMode>('sprintMode');
        const sprintMode2 = container.resolve<IHighlightMode>('sprintMode');

        // Assert: Different instances
        expect(walkMode1).not.toBe(walkMode2);
        expect(sprintMode1).not.toBe(sprintMode2);
    });

    // ============================================
    // Integration Tests
    // ============================================

    it('7. resolved services are functional (integration test)', () => {
        // Act: Resolve modeManager and interact with it
        const modeManager = container.resolve<IModeManager>('modeManager');
        const walkMode = container.resolve<IHighlightMode>('walkMode');

        // Register and activate mode
        modeManager.registerMode(walkMode);

        // Assert: Should not throw
        expect(() => modeManager.activateMode('walk')).not.toThrow();
        expect(modeManager.getCurrentMode()).toBe(walkMode);
    });

    it('8. can swap implementations for testing', () => {
        // Arrange: Create new container with mock
        const testContainer = new Container();

        // Register mock logger
        const mockLogger = {
            debug: () => { },
            info: () => { },
            warn: () => { },
            error: () => { },
            setLevel: () => { },
            getLevel: () => 'debug' as const,
        } as unknown as ILogger;

        testContainer.registerInstance('logger', mockLogger);
        testContainer.registerSingleton('eventBus', () => container.resolve('eventBus'));

        // Register modeManager with mock logger
        testContainer.registerSingleton('modeManager', () => {
            const eventBus = testContainer.resolve<EventBus>('eventBus');
            const logger = testContainer.resolve<ILogger>('logger');
            return new ModeManager(eventBus, logger);
        });

        // Act
        const modeManager = testContainer.resolve<IModeManager>('modeManager');

        // Assert: Should work with mock logger
        expect(modeManager).toBeDefined();
    });
});
