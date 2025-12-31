/**
 * Container Tests (12 tests)
 * 
 * Verifies IoC container functionality including:
 * - Service registration (singleton, transient, instance)
 * - Service resolution
 * - Lifecycle management
 * - Error handling
 * - Edge cases
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Container } from '@/shared/di/container';

describe('Container (12 tests)', () => {
    let container: Container;

    beforeEach(() => {
        container = new Container();
    });

    // ============================================
    // Registration Tests
    // ============================================

    it('1. can register and resolve singleton', () => {
        // Arrange
        let instanceCount = 0;
        container.registerSingleton('service', () => {
            instanceCount++;
            return { id: instanceCount };
        });

        // Act
        const instance1 = container.resolve<{ id: number }>('service');
        const instance2 = container.resolve<{ id: number }>('service');

        // Assert
        expect(instance1).toBe(instance2); // Same reference
        expect(instanceCount).toBe(1); // Factory called once
        expect(instance1.id).toBe(1);
    });

    it('2. can register and resolve transient', () => {
        // Arrange
        let instanceCount = 0;
        container.registerTransient('service', () => {
            instanceCount++;
            return { id: instanceCount };
        });

        // Act
        const instance1 = container.resolve<{ id: number }>('service');
        const instance2 = container.resolve<{ id: number }>('service');

        // Assert
        expect(instance1).not.toBe(instance2); // Different references
        expect(instanceCount).toBe(2); // Factory called twice
        expect(instance1.id).toBe(1);
        expect(instance2.id).toBe(2);
    });

    it('3. can register and resolve instance', () => {
        // Arrange
        const preCreatedInstance = { value: 'test' };
        container.registerInstance('config', preCreatedInstance);

        // Act
        const resolved = container.resolve<{ value: string }>('config');

        // Assert
        expect(resolved).toBe(preCreatedInstance); // Exact same instance
    });

    // ============================================
    // Error Handling Tests
    // ============================================

    it('4. throws when resolving unregistered service', () => {
        // Act & Assert
        expect(() => container.resolve('nonexistent')).toThrow(
            /Service 'nonexistent' is not registered/
        );
    });

    it('5. throws with helpful error showing available services', () => {
        // Arrange
        container.registerSingleton('service1', () => ({}));
        container.registerSingleton('service2', () => ({}));

        // Act & Assert
        expect(() => container.resolve('wrong')).toThrow(/service1, service2/);
    });

    it('6. detects circular dependencies', () => {
        // Arrange: A -> B -> A
        container.registerSingleton('serviceA', () => {
            return container.resolve('serviceB'); // Depends on B
        });

        container.registerSingleton('serviceB', () => {
            return container.resolve('serviceA'); // Depends on A (circular!)
        });

        // Act & Assert
        expect(() => container.resolve('serviceA')).toThrow(/Circular dependency/);
    });

    // ============================================
    // Dependency Resolution Tests
    // ============================================

    it('7. can resolve nested dependencies', () => {
        // Arrange: C -> B -> A
        container.registerSingleton('serviceA', () => ({ name: 'A' }));

        container.registerSingleton('serviceB', () => {
            const a = container.resolve<{ name: string }>('serviceA');
            return { name: 'B', dependency: a };
        });

        container.registerSingleton('serviceC', () => {
            const b = container.resolve<{ name: string; dependency: any }>('serviceB');
            return { name: 'C', dependency: b };
        });

        // Act
        const c = container.resolve<any>('serviceC');

        // Assert
        expect(c.name).toBe('C');
        expect(c.dependency.name).toBe('B');
        expect(c.dependency.dependency.name).toBe('A');
    });

    // ============================================
    // Lifecycle Tests
    // ============================================

    it('8. can override registration', () => {
        // Arrange
        container.registerSingleton('service', () => ({ version: 1 }));
        const first = container.resolve<{ version: number }>('service');

        // Act: Override with new factory
        container.registerSingleton('service', () => ({ version: 2 }));
        const second = container.resolve<{ version: number }>('service');

        // Assert
        expect(first.version).toBe(1);
        expect(second.version).toBe(2);
        expect(first).not.toBe(second); // Different instances (override cleared cache)
    });

    it('9. can clear container', () => {
        // Arrange
        container.registerSingleton('service1', () => ({}));
        container.registerSingleton('service2', () => ({}));
        expect(container.has('service1')).toBe(true);

        // Act
        container.clear();

        // Assert
        expect(container.has('service1')).toBe(false);
        expect(container.has('service2')).toBe(false);
        expect(() => container.resolve('service1')).toThrow();
    });

    // ============================================
    // Utility Tests
    // ============================================

    it('10. has() returns correct registration status', () => {
        // Arrange
        container.registerSingleton('exists', () => ({}));

        // Act & Assert
        expect(container.has('exists')).toBe(true);
        expect(container.has('does-not-exist')).toBe(false);
    });

    it('11. getRegisteredKeys() returns all service keys', () => {
        // Arrange
        container.registerSingleton('service1', () => ({}));
        container.registerTransient('service2', () => ({}));
        container.registerInstance('service3', {});

        // Act
        const keys = container.getRegisteredKeys();

        // Assert
        expect(keys).toHaveLength(3);
        expect(keys).toContain('service1');
        expect(keys).toContain('service2');
        expect(keys).toContain('service3');
    });

    // ============================================
    // Async Tests
    // ============================================

    it('12. works with async factory functions', async () => {
        // Arrange
        container.registerSingleton('asyncService', () => {
            return Promise.resolve({ data: 'loaded' });
        });

        // Act
        const service = container.resolve<Promise<{ data: string }>>('asyncService');
        const resolved = await service;

        // Assert
        expect(resolved.data).toBe('loaded');
    });
});
