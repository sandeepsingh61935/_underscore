/**
 * @file event-validator.test.ts
 * @description Unit tests for EventValidator
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventValidator } from '@/background/events/event-validator';
import type { SyncEvent } from '@/background/events/interfaces/i-event-store';
import { SyncEventType } from '@/background/events/interfaces/i-event-store';
import type { ILogger } from '@/shared/interfaces/i-logger';

const createMockLogger = (): ILogger => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setLevel: vi.fn(),
    getLevel: vi.fn(() => 1 as any),
});

const createValidEvent = (): SyncEvent => ({
    id: crypto.randomUUID(),
    type: SyncEventType.HIGHLIGHT_CREATED,
    payload: { id: 'test', text: 'test' },
    timestamp: Date.now(),
    deviceId: 'device-1',
    vectorClock: { 'device-1': 1 },
    checksum: 'a'.repeat(64),
    userId: 'user-123',
});

describe('EventValidator', () => {
    let validator: EventValidator;
    let logger: ILogger;

    beforeEach(() => {
        logger = createMockLogger();
        validator = new EventValidator(logger);
    });

    describe('Valid Events', () => {
        it('should pass validation for valid event', () => {
            const event = createValidEvent();

            expect(() => validator.validate(event)).not.toThrow();
            expect(logger.debug).toHaveBeenCalledWith('Event validation passed', {
                id: event.id,
                type: event.type,
            });
        });
    });

    describe('Invalid Structure', () => {
        it('should throw on missing event ID', () => {
            const event = createValidEvent();
            // @ts-expect-error Testing validation
            delete event.id;

            expect(() => validator.validate(event)).toThrow(
                'Event ID must be a non-empty string'
            );
        });

        it('should throw on invalid event type', () => {
            const event = createValidEvent();
            // @ts-expect-error Testing validation
            event.type = 123;

            expect(() => validator.validate(event)).toThrow(
                'Event type must be a non-empty string'
            );
        });
    });

    describe('Invalid Payload', () => {
        it('should throw when payload is missing', () => {
            const event = createValidEvent();
            // @ts-expect-error Testing validation
            event.payload = null;

            expect(() => validator.validate(event)).toThrow('Event payload is required');
        });

        it('should throw on future timestamp', () => {
            const event = createValidEvent();
            event.timestamp = Date.now() + 120000; // 2 minutes in future

            expect(() => validator.validate(event)).toThrow(
                'Event timestamp cannot be in the future'
            );
        });
    });
});
