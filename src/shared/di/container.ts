/**
 * @file container.ts
 * @description Lightweight IoC (Inversion of Control) container for dependency injection
 *
 * Provides service registration and resolution with lifecycle management.
 * Supports singleton and transient lifetimes.
 *
 * @example
 * ```typescript
 * const container = new Container();
 *
 * // Register singleton (shared instance)
 * container.registerSingleton('logger', () => new Logger());
 *
 * // Register transient (new instance each time)
 * container.registerTransient('request', () => new Request());
 *
 * // Register existing instance
 * container.registerInstance('config', { apiKey: 'xyz' });
 *
 * // Resolve service
 * const logger = container.resolve<Logger>('logger');
 * ```
 */

/**
 * Service factory function that creates service instances
 */
export type ServiceFactory<T> = () => T;

/**
 * Service lifecycle options
 * - singleton: One instance shared across all resolutions
 * - transient: New instance created for each resolution
 */
export type ServiceLifecycle = 'singleton' | 'transient';

/**
 * Internal service registration metadata
 */
interface ServiceRegistration<T> {
    /** Factory function to create service instances */
    factory: ServiceFactory<T>;
    /** Lifecycle management strategy */
    lifecycle: ServiceLifecycle;
    /** Cached instance (only for singletons) */
    instance?: T;
}

/**
 * Lightweight dependency injection container
 *
 * Features:
 * - Singleton and transient lifecycle management
 * - Circular dependency detection
 * - Type-safe service resolution
 * - Explicit error messages
 *
 * @remarks
 * This container does NOT support automatic constructor injection.
 * All dependencies must be manually resolved in factory functions.
 */
export class Container {
    /** Service registry */
    private services = new Map<string, ServiceRegistration<unknown>>();

    /** Track services currently being resolved (for circular dependency detection) */
    private resolving = new Set<string>();

    /**
     * Register a singleton service
     *
     * Singleton services are instantiated once and reused across all resolutions.
     *
     * @template T - Service type
     * @param key - Unique service identifier
     * @param factory - Function that creates the service instance
     *
     * @example
     * ```typescript
     * container.registerSingleton('logger', () => new Logger());
     * const logger1 = container.resolve<Logger>('logger');
     * const logger2 = container.resolve<Logger>('logger');
     * // logger1 === logger2 (same instance)
     * ```
     */
    registerSingleton<T>(key: string, factory: ServiceFactory<T>): void {
        this.services.set(key, {
            factory,
            lifecycle: 'singleton',
        });
    }

    /**
     * Register a transient service
     *
     * Transient services are instantiated fresh on each resolution.
     *
     * @template T - Service type
     * @param key - Unique service identifier
     * @param factory - Function that creates the service instance
     *
     * @example
     * ```typescript
     * container.registerTransient('request', () => new Request());
     * const req1 = container.resolve<Request>('request');
     * const req2 = container.resolve<Request>('request');
     * // req1 !== req2 (different instances)
     * ```
     */
    registerTransient<T>(key: string, factory: ServiceFactory<T>): void {
        this.services.set(key, {
            factory,
            lifecycle: 'transient',
        });
    }

    /**
     * Register an existing instance
     *
     * Useful for registering pre-configured objects or primitives.
     *
     * @template T - Service type
     * @param key - Unique service identifier
     * @param instance - Pre-created service instance
     *
     * @example
     * ```typescript
     * const config = { apiKey: 'xyz' };
     * container.registerInstance('config', config);
     * ```
     */
    registerInstance<T>(key: string, instance: T): void {
        this.services.set(key, {
            factory: () => instance,
            lifecycle: 'singleton',
            instance, // Already created
        });
    }

    /**
     * Resolve a service by key
     *
     * @template T - Expected service type
     * @param key - Service identifier
     * @returns Resolved service instance
     * @throws {Error} If service is not registered
     * @throws {Error} If circular dependency detected
     *
     * @example
     * ```typescript
     * const logger = container.resolve<Logger>('logger');
     * ```
     */
    resolve<T>(key: string): T {
        const registration = this.services.get(key);

        if (!registration) {
            throw new Error(
                `Service '${key}' is not registered. ` +
                `Available services: ${Array.from(this.services.keys()).join(', ')}`
            );
        }

        // Detect circular dependencies
        if (this.resolving.has(key)) {
            const resolvingChain = Array.from(this.resolving).join(' -> ');
            throw new Error(
                `Circular dependency detected: ${resolvingChain} -> ${key}`
            );
        }

        // Singleton: Return cached instance if exists
        if (registration.lifecycle === 'singleton' && registration.instance) {
            return registration.instance as T;
        }

        // Mark as resolving
        this.resolving.add(key);

        try {
            // Create instance
            const instance = registration.factory();

            // Cache for singletons
            if (registration.lifecycle === 'singleton') {
                registration.instance = instance;
            }

            return instance as T;
        } finally {
            // Always clean up resolving state
            this.resolving.delete(key);
        }
    }

    /**
     * Check if a service is registered
     *
     * @param key - Service identifier
     * @returns True if service is registered
     */
    has(key: string): boolean {
        return this.services.has(key);
    }

    /**
     * Clear all service registrations
     *
     * @remarks
     * This does NOT destroy singleton instances - they will be garbage collected
     * when all references are released.
     */
    clear(): void {
        this.services.clear();
        this.resolving.clear();
    }

    /**
     * Get all registered service keys
     *
     * @returns Array of service identifiers
     */
    getRegisteredKeys(): string[] {
        return Array.from(this.services.keys());
    }
}
