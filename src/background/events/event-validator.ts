/**
 * @file event-validator.ts
 * @description Event Validator for validating event structure and payloads
 * @author System Architect
 */

import type { SyncEvent } from './interfaces/i-event-store';
import type { ILogger } from '@/shared/interfaces/i-logger';

/**
 * Event Validator
 * 
 * Validates event structure and payload schemas before processing.
 */
export class EventValidator {
    private readonly logger: ILogger;

    constructor(logger: ILogger) {
        this.logger = logger;
    }

    /**
     * Validate event structure
     * 
     * @param event - Event to validate
     * @throws {Error} If validation fails
     */
    validate(event: SyncEvent): void {
        // Validate required fields
        if (!event.id || typeof event.id !== 'string') {
            throw new Error('Event ID must be a non-empty string');
        }

        if (!event.type || typeof event.type !== 'string') {
            throw new Error('Event type must be a non-empty string');
        }

        if (event.payload === undefined || event.payload === null) {
            throw new Error('Event payload is required');
        }

        if (!event.timestamp || typeof event.timestamp !== 'number') {
            throw new Error('Event timestamp must be a number');
        }

        if (!event.deviceId || typeof event.deviceId !== 'string') {
            throw new Error('Event deviceId must be a non-empty string');
        }

        if (!event.vectorClock || typeof event.vectorClock !== 'object') {
            throw new Error('Event vectorClock must be an object');
        }

        if (!event.checksum || typeof event.checksum !== 'string') {
            throw new Error('Event checksum must be a non-empty string');
        }

        if (!event.userId || typeof event.userId !== 'string') {
            throw new Error('Event userId must be a non-empty string');
        }

        // Validate timestamp is not in future
        const now = Date.now();
        if (event.timestamp > now + 60000) {
            throw new Error('Event timestamp cannot be in the future');
        }

        this.logger.debug('Event validation passed', { id: event.id, type: event.type });
    }
}
