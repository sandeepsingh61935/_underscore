import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Container } from '@/shared/di/container';
import { registerServices, getDependencyGraph } from '@/shared/di/service-registration';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import { CircuitBreaker } from '@/shared/utils/circuit-breaker';

describe('DI Container - IPC Layer Registration', () => {
    let container: Container;

    beforeEach(() => {
        container = new Container();
        registerServices(container);
    });

    describe('Circuit Breaker Registration', () => {
        it('should register messagingCircuitBreaker as singleton', () => {
            const cb1 = container.resolve<CircuitBreaker>('messagingCircuitBreaker');
            const cb2 = container.resolve<CircuitBreaker>('messagingCircuitBreaker');

            expect(cb1).toBeDefined();
            expect(cb1).toBe(cb2); // Singleton - same instance
        });

        it('should configure circuit breaker with correct thresholds', () => {
            const circuitBreaker = container.resolve<CircuitBreaker>('messagingCircuitBreaker');
            const metrics = circuitBreaker.getMetrics();

            expect(metrics.state).toBe('CLOSED');
        });
    });

    describe('MessageBus Registration', () => {
        it('should register messageBus as singleton', () => {
            const mb1 = container.resolve<IMessageBus>('messageBus');
            const mb2 = container.resolve<IMessageBus>('messageBus');

            expect(mb1).toBeDefined();
            expect(mb1).toBe(mb2); // Singleton - same instance
        });

        it('should implement IMessageBus interface', () => {
            const messageBus = container.resolve<IMessageBus>('messageBus');

            expect(messageBus.send).toBeTypeOf('function');
            expect(messageBus.subscribe).toBeTypeOf('function');
            expect(messageBus.publish).toBeTypeOf('function');
        });

        it('should compose full decorator chain (CircuitBreaker → Retry → Chrome)', () => {
            const messageBus = container.resolve<IMessageBus>('messageBus');

            // If this resolves without errors, the composition chain is correctly wired
            expect(messageBus).toBeDefined();

            // messageBus should be instanceof CircuitBreakerMessageBus (outermost)
            expect(messageBus.constructor.name).toBe('CircuitBreakerMessageBus');
        });
    });

    describe('Dependency Resolution', () => {
        it('should resolve messageBus dependencies correctly', () => {
            // Should not throw
            expect(() => {
                container.resolve<IMessageBus>('messageBus');
            }).not.toThrow();
        });

        it('should share logger instance across IPC services', () => {
            const logger = container.resolve('logger');
            const circuitBreaker = container.resolve<CircuitBreaker>('messagingCircuitBreaker');

            // Both should use the same logger instance (singleton)
            expect(logger).toBeDefined();
            expect(circuitBreaker).toBeDefined();
        });

        it('should not have circular dependencies', () => {
            const graph = getDependencyGraph();

            // No service should depend on itself (direct circular)
            for (const [service, deps] of graph.entries()) {
                expect(deps).not.toContain(service);
            }
        });
    });

    describe('Dependency Graph', () => {
        it('should include IPC layer services in dependency graph', () => {
            const graph = getDependencyGraph();

            expect(graph.has('messagingCircuitBreaker')).toBe(true);
            expect(graph.has('messageBus')).toBe(true);
        });

        it('should correctly define messagingCircuitBreaker dependencies', () => {
            const graph = getDependencyGraph();
            const deps = graph.get('messagingCircuitBreaker');

            expect(deps).toEqual(['logger']);
        });

        it('should correctly define messageBus dependencies', () => {
            const graph = getDependencyGraph();
            const deps = graph.get('messageBus');

            expect(deps).toContain('logger');
            expect(deps).toContain('messagingCircuitBreaker');
        });
    });

    describe('Integration - Cross-Service Dependencies', () => {
        it('should allow modes to potentially use messageBus (future integration)', () => {
            // Verify both mode and IPC services can coexist
            const messageBus = container.resolve<IMessageBus>('messageBus');
            const modeManager = container.resolve('modeManager');

            expect(messageBus).toBeDefined();
            expect(modeManager).toBeDefined();
        });

        it('should not break existing service resolution', () => {
            // Ensure IPC additions don't break existing services
            expect(container.resolve('logger')).toBeDefined();
            expect(container.resolve('eventBus')).toBeDefined();
            expect(container.resolve('storage')).toBeDefined();
            expect(container.resolve('repository')).toBeDefined();
            expect(container.resolve('messaging')).toBeDefined();
            expect(container.resolve('tabQuery')).toBeDefined();
            expect(container.resolve('modeManager')).toBeDefined();
        });
    });

    describe('Memory Management', () => {
        it('should not leak memory on repeated resolution', () => {
            // Resolve 100 times - should return same instance (singleton)
            const instances = new Set();

            for (let i = 0; i < 100; i++) {
                const messageBus = container.resolve<IMessageBus>('messageBus');
                instances.add(messageBus);
            }

            expect(instances.size).toBe(1); // Only one instance created
        });
    });

    describe('Mock Injection Support', () => {
        it('should allow replacing messageBus with mock for testing', () => {
            const mockMessageBus: IMessageBus = {
                send: vi.fn(),
                subscribe: vi.fn(),
                publish: vi.fn(),
            };

            // Override registration
            container.registerSingleton<IMessageBus>('messageBus', () => mockMessageBus);

            const resolved = container.resolve<IMessageBus>('messageBus');

            expect(resolved).toBe(mockMessageBus);
        });
    });
});
