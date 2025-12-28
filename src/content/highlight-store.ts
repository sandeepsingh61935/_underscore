/**
 * @file highlight-store.ts
 * @description In-memory storage for highlights in Sprint Mode
 */

import { EventBus } from '@/shared/utils/event-bus';
import { EventName, HighlightCreatedEvent, HighlightRemovedEvent } from '@/shared/types/events';
import { LoggerFactory } from '@/shared/utils/logger';
import type { ILogger } from '@/shared/utils/logger';
import type { AnnotationType } from '@/shared/types/annotation';

/**
 * Highlight data structure
 */
export interface Highlight {
    id: string;
    text: string;
    color: string;
    type: AnnotationType;  // Store type for undo/redo
    element: HTMLElement;
    createdAt: Date;
}

/**
 * In-memory storage for highlights (Sprint Mode - ephemeral)
 * 
 * Features:
 * - Map-based storage (fast lookups)
 * - Event-driven updates
 * - CRUD operations
 * 
 * @example
 * ```typescript
 * const store = new HighlightStore(eventBus);
 * 
 * // Highlights are added/removed via events
 * eventBus.emit(EventName.HIGHLIGHT_CREATED, { highlight: {...} });
 * 
 * // Query
 * const all = store.getAll();
 * const count = store.count();
 * ```
 */
export class HighlightStore {
    private highlights = new Map<string, Highlight>();
    private logger: ILogger;

    constructor(private readonly eventBus: EventBus) {
        this.logger = LoggerFactory.getLogger('HighlightStore');
        this.setupEventListeners();
    }

    /**
     * Set up event listeners
     */
    private setupEventListeners(): void {
        // Listen for highlight creation
        this.eventBus.on<HighlightCreatedEvent>(
            EventName.HIGHLIGHT_CREATED,
            (event) => {
                this.add({
                    id: event.highlight.id,
                    text: event.highlight.text,
                    color: event.highlight.color,
                    type: 'underscore',  // Default type
                    element: null as any, // Will be set by renderer
                    createdAt: event.timestamp,
                });
            }
        );

        // Listen for highlight removal
        this.eventBus.on<HighlightRemovedEvent>(
            EventName.HIGHLIGHT_REMOVED,
            (event) => {
                this.remove(event.highlightId);
            }
        );

        this.logger.info('HighlightStore event listeners registered');
    }

    /**
     * Add highlight to storage
     */
    add(highlight: Highlight): void {
        this.highlights.set(highlight.id, highlight);
        this.logger.debug('Highlight added', { id: highlight.id, count: this.count() });
    }

    /**
     * Add highlight from HighlightData (Custom Highlight API format)
     * Works with both legacy Highlight and new HighlightData formats
     */
    addFromData(data: {
        id: string;
        text: string;
        color: string;
        type?: AnnotationType;
        range?: any;
        createdAt?: Date;
        element?: HTMLElement;
    }): void {
        const highlight: Highlight = {
            id: data.id,
            text: data.text,
            color: data.color,
            type: data.type || 'underscore',
            element: data.element || (null as any),  // Not needed for Custom Highlight API
            createdAt: data.createdAt || new Date(),
        };
        this.add(highlight);
    }

    /**
     * Remove highlight by ID
     */
    remove(id: string): boolean {
        const existed = this.highlights.delete(id);

        if (existed) {
            this.logger.debug('Highlight removed', { id, count: this.count() });
        } else {
            this.logger.warn('Attempted to remove non-existent highlight', { id });
        }

        return existed;
    }

    /**
     * Get highlight by ID
     */
    get(id: string): Highlight | undefined {
        return this.highlights.get(id);
    }

    /**
     * Get all highlights
     */
    getAll(): Highlight[] {
        return Array.from(this.highlights.values());
    }

    /**
     * Get highlight count
     */
    count(): number {
        return this.highlights.size;
    }

    /**
     * Clear all highlights
     */
    clear(): void {
        const count = this.count();
        this.highlights.clear();

        this.logger.info('All highlights cleared', { clearedCount: count });

        // Emit cleared event
        this.eventBus.emit(EventName.HIGHLIGHTS_CLEARED, {
            type: EventName.HIGHLIGHTS_CLEARED,
            count,
            timestamp: new Date(),
        });
    }

    /**
     * Check if highlight exists
     */
    has(id: string): boolean {
        return this.highlights.has(id);
    }

    /**
     * Get highlights for a specific color
     */
    getByColor(color: string): Highlight[] {
        return this.getAll().filter(h => h.color === color);
    }
}
