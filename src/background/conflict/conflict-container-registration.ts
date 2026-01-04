/**
 * @file conflict-container-registration.ts
 * @description DI container registration for conflict resolution components
 */

import type { Container } from '../../shared/di/container';
import type { ILogger } from '../../shared/utils/logger';
import type { IEventBus } from '../../shared/interfaces/i-event-bus';
import type { IVectorClockManager } from './interfaces/i-vector-clock-manager';
import type { IConflictDetector } from './interfaces/i-conflict-detector';
import type { IConflictResolver } from './interfaces/i-conflict-resolver';

import { VectorClockManager } from './vector-clock-manager';
import { ConflictDetector } from './conflict-detector';
import { ConflictResolver } from './conflict-resolver';

/**
 * Register conflict resolution components in DI container
 * 
 * Registered services:
 * - 'vectorClockManager'
 * - 'conflictDetector'
 * - 'conflictResolver'
 * 
 * Dependencies required:
 * - 'logger'
 * - 'eventBus'
 */
export function registerConflictComponents(container: Container): void {
    // ==================== VectorClockManager ====================
    container.registerSingleton<IVectorClockManager>('vectorClockManager', () => {
        const logger = container.resolve<ILogger>('logger');
        return new VectorClockManager(logger);
    });

    // ==================== ConflictDetector ====================
    container.registerSingleton<IConflictDetector>('conflictDetector', () => {
        const clockManager = container.resolve<IVectorClockManager>('vectorClockManager');
        const logger = container.resolve<ILogger>('logger');
        return new ConflictDetector(clockManager, logger);
    });

    // ==================== ConflictResolver ====================
    container.registerSingleton<IConflictResolver>('conflictResolver', () => {
        const clockManager = container.resolve<IVectorClockManager>('vectorClockManager');
        const eventBus = container.resolve<IEventBus>('eventBus');
        const logger = container.resolve<ILogger>('logger');
        return new ConflictResolver(clockManager, eventBus, logger);
    });
}
