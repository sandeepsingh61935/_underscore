/**
 * @file event-replayer.ts
 * @description Event Replayer for state reconstruction from event log
 * @author System Architect
 */

import type { SyncEvent, SyncEventType } from './interfaces/i-event-store';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type {
    HighlightCreatedPayload,
    HighlightUpdatedPayload,
    HighlightDeletedPayload,
} from './event-types';

/**
 * Event Replayer for reconstructing state from event log
 * 
 * Implements event sourcing pattern - rebuilds current state by replaying events.
 */
export class EventReplayer {
    private readonly logger: ILogger;

    constructor(logger: ILogger) {
        this.logger = logger;
    }

    /**
     * Replay events to reconstruct current state
     * 
     * @param events - Events in chronological order (CRITICAL)
     * @returns Map of entity ID to current state
     */
    async replay(events: SyncEvent[]): Promise<Map<string, HighlightDataV2>> {
        this.logger.debug('Replaying events', { count: events.length });

        const state = new Map<string, HighlightDataV2>();

        for (const event of events) {
            this.applyEvent(state, event);
        }

        this.logger.info('Event replay complete', {
            eventCount: events.length,
            entityCount: state.size,
        });

        return state;
    }

    /**
     * Replay events from a checkpoint
     * 
     * @param existingState - Current state map
     * @param newEvents - Events since checkpoint
     * @returns Updated state map
     */
    async replayFrom(
        existingState: Map<string, HighlightDataV2>,
        newEvents: SyncEvent[]
    ): Promise<Map<string, HighlightDataV2>> {
        this.logger.debug('Replaying from checkpoint', {
            existingCount: existingState.size,
            newEventCount: newEvents.length,
        });

        const state = new Map(existingState);

        for (const event of newEvents) {
            this.applyEvent(state, event);
        }

        return state;
    }

    /**
     * Apply single event to state
     * 
     * @param state - Current state map
     * @param event - Event to apply
     */
    applyEvent(state: Map<string, HighlightDataV2>, event: SyncEvent): void {
        try {
            switch (event.type) {
                case 'highlight.created':
                    this.applyCreated(state, event as SyncEvent<HighlightCreatedPayload>);
                    break;

                case 'highlight.updated':
                    this.applyUpdated(state, event as SyncEvent<HighlightUpdatedPayload>);
                    break;

                case 'highlight.deleted':
                    this.applyDeleted(state, event as SyncEvent<HighlightDeletedPayload>);
                    break;

                default:
                    this.logger.warn('Unknown event type', { type: event.type });
            }
        } catch (error) {
            this.logger.error('Failed to apply event', error as Error, {
                eventId: event.id,
                eventType: event.type,
            });
            // Continue processing other events
        }
    }

    /**
     * Apply CREATED event
     */
    private applyCreated(
        state: Map<string, HighlightDataV2>,
        event: SyncEvent<HighlightCreatedPayload>
    ): void {
        const { id, data } = event.payload;
        state.set(id, data);
        this.logger.debug('Applied CREATED event', { id });
    }

    /**
     * Apply UPDATED event
     */
    private applyUpdated(
        state: Map<string, HighlightDataV2>,
        event: SyncEvent<HighlightUpdatedPayload>
    ): void {
        const { id, changes } = event.payload;
        const existing = state.get(id);

        if (!existing) {
            this.logger.warn('UPDATE event for non-existent entity', { id });
            return;
        }

        // Merge changes into existing state
        const updated = { ...existing, ...changes };
        state.set(id, updated);
        this.logger.debug('Applied UPDATED event', { id });
    }

    /**
     * Apply DELETED event (soft delete)
     */
    private applyDeleted(
        state: Map<string, HighlightDataV2>,
        event: SyncEvent<HighlightDeletedPayload>
    ): void {
        const { id } = event.payload;
        state.delete(id);
        this.logger.debug('Applied DELETED event', { id });
    }
}
