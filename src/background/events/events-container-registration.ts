/**
 * @file events-container-registration.ts
 * @description DI container registration for event sourcing layer
 * @architecture Dependency Injection - centralized service registration
 */

import type { Container } from '@/background/di/container';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { IEventStore } from '@/background/events/interfaces/i-event-store';
import type { IEventPublisher } from '@/background/events/interfaces/i-event-publisher';
import type { IInputSanitizer } from '@/background/events/interfaces/i-input-sanitizer';
import { EventStore } from '@/background/events/event-store';
import { EventPublisher } from '@/background/events/event-publisher';
import { EventReplayer } from '@/background/events/event-replayer';
import { InputSanitizer } from '@/background/events/input-sanitizer';
import { EventValidator } from '@/background/events/event-validator';

/**
 * Register event sourcing components in DI container
 * 
 * Registered services:
 * - 'eventStore' → EventStore (IndexedDB-based append-only log)
 * - 'eventPublisher' → EventPublisher (Observer pattern pub/sub)
 * - 'eventReplayer' → EventReplayer (state reconstruction)
 * - 'inputSanitizer' → InputSanitizer (XSS protection with DOMPurify)
 * - 'eventValidator' → EventValidator (event structure validation)
 * 
 * Dependencies required:
 * - 'logger' → ILogger
 * 
 * @example
 * ```typescript
 * const container = new Container();
 * 
 * // Register logger first
 * container.registerSingleton('logger', () => new Logger());
 * 
 * // Register event sourcing components
 * registerEventComponents(container);
 * 
 * // Resolve
 * const eventStore = container.resolve<IEventStore>('eventStore');
 * ```
 */
export function registerEventComponents(container: Container): void {
    // ==================== Event Store ====================

    /**
     * EventStore (core event sourcing component)
     * IndexedDB-based append-only event log
     * 
     * Features:
     * - Append-only pattern (immutable events)
     * - SHA-256 checksum validation
     * - Chronological ordering (CRITICAL)
     * - Efficient querying with indexes
     */
    container.registerSingleton<IEventStore>('eventStore', () => {
        const logger = container.resolve<ILogger>('logger');
        return new EventStore(logger);
    });

    // ==================== Event Publisher ====================

    /**
     * EventPublisher (event-driven architecture)
     * Observer pattern for pub/sub
     * 
     * Features:
     * - Multiple subscribers per event type
     * - Error isolation (one subscriber error doesn't break others)
     * - Support for sync and async handlers
     */
    container.registerSingleton<IEventPublisher>('eventPublisher', () => {
        const logger = container.resolve<ILogger>('logger');
        return new EventPublisher(logger);
    });

    // ==================== Event Replayer ====================

    /**
     * EventReplayer (state reconstruction)
     * Rebuilds current state from event log
     * 
     * Features:
     * - Full replay from event log
     * - Incremental replay from checkpoint
     * - Handles CREATED, UPDATED, DELETED events
     */
    container.registerSingleton('eventReplayer', () => {
        const logger = container.resolve<ILogger>('logger');
        return new EventReplayer(logger);
    });

    // ==================== Input Sanitizer ====================

    /**
     * InputSanitizer (CRITICAL - XSS protection)
     * Uses DOMPurify to sanitize all user-generated content
     * 
     * Features:
     * - Strip all HTML tags from text
     * - Allow only safe HTML tags (b, i, em, strong, mark)
     * - Block dangerous URL protocols (javascript:, data:)
     * 
     * Refs: docs/06-security/threat-model.md#T1
     */
    container.registerSingleton<IInputSanitizer>('inputSanitizer', () => {
        const logger = container.resolve<ILogger>('logger');
        return new InputSanitizer(logger);
    });

    // ==================== Event Validator ====================

    /**
     * EventValidator (event structure validation)
     * Validates event structure and required fields
     * 
     * Features:
     * - Validate required fields
     * - Check field types
     * - Validate timestamp is not in future
     */
    container.registerSingleton('eventValidator', () => {
        const logger = container.resolve<ILogger>('logger');
        return new EventValidator(logger);
    });
}
