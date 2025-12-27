/**
 * @file highlight-renderer.ts
 * @description Renders highlights using Shadow DOM isolation
 */

import { EventBus } from '@/shared/utils/event-bus';
import { EventName, createEvent, HighlightRemovedEvent } from '@/shared/types/events';
import { LoggerFactory } from '@/shared/utils/logger';
import type { ILogger } from '@/shared/utils/logger';
import type { Highlight } from './highlight-store';

/**
 * Renders highlights using Shadow DOM for style isolation
 * 
 * Features:
 * - Shadow DOM isolation (no CSS conflicts)
 * - Design token integration
 * - Fade-in animations
 * - Click-to-remove interaction
 * 
 * @example
 * ```typescript
 * const renderer = new HighlightRenderer(eventBus);
 * const highlight = renderer.createHighlight(selection, '#FFEB3B');
 * ```
 */
export class HighlightRenderer {
    private logger: ILogger;
    private highlightElements = new Map<string, HTMLElement>();

    constructor(private readonly eventBus: EventBus) {
        this.logger = LoggerFactory.getLogger('HighlightRenderer');
        this.setupEventListeners();
    }

    /**
     * Set up event listeners
     */
    private setupEventListeners(): void {
        this.eventBus.on<HighlightRemovedEvent>(
            EventName.HIGHLIGHT_REMOVED,
            (event) => {
                this.removeHighlight(event.highlightId);
            }
        );
    }

    /**
     * Create highlight from selection
     */
    createHighlight(selection: Selection, color: string): Highlight {
        const id = this.generateId();
        const text = selection.toString().trim();
        const range = selection.getRangeAt(0);

        // Create highlight element
        const highlightElement = this.createHighlightElement(id, color);

        // Wrap range with highlight
        try {
            range.surroundContents(highlightElement);
        } catch (error) {
            // Fallback for complex ranges (spanning multiple elements)
            this.logger.warn('Complex range, using fallback', error as Error);
            // TODO: Implement advanced range handling for complex selections
            throw new Error('Complex selections not yet supported');
        }

        // Store element reference
        this.highlightElements.set(id, highlightElement);

        const highlight: Highlight = {
            id,
            text,
            color,
            element: highlightElement,
            createdAt: new Date(),
        };

        // Emit creation event
        this.eventBus.emit(EventName.HIGHLIGHT_CREATED, createEvent({
            type: EventName.HIGHLIGHT_CREATED,
            highlight: {
                id,
                text,
                color,
            },
        }));

        this.logger.info('Highlight created', { id, textLength: text.length });

        return highlight;
    }

    /**
     * Create highlight element with Shadow DOM
     */
    private createHighlightElement(id: string, color: string): HTMLElement {
        const span = document.createElement('span');
        span.className = 'underscore-highlight';
        span.dataset.id = id;
        span.dataset.color = color;

        // Create Shadow DOM
        const shadow = span.attachShadow({ mode: 'closed' });

        // Add styles
        const style = document.createElement('style');
        style.textContent = this.getHighlightStyles(color);
        shadow.appendChild(style);

        // Add slot for original content
        const slot = document.createElement('slot');
        shadow.appendChild(slot);

        // Add click listener for removal
        span.addEventListener('click', (e) => {
            e.stopPropagation();
            this.eventBus.emit(EventName.HIGHLIGHT_CLICKED, createEvent({
                type: EventName.HIGHLIGHT_CLICKED,
                highlightId: id,
            }));
            // Also emit removal event
            this.eventBus.emit(EventName.HIGHLIGHT_REMOVED, createEvent({
                type: EventName.HIGHLIGHT_REMOVED,
                highlightId: id,
            }));
        });

        return span;
    }

    /**
     * Get styles for highlight element
     */
    private getHighlightStyles(color: string): string {
        return `
      :host {
        text-decoration: underline;
        text-decoration-color: ${color};
        text-decoration-thickness: 2px;
        text-underline-offset: 2px;
        cursor: pointer;
        transition: all 0.2s ease;
        animation: fadeIn 0.2s ease;
      }

      :host(:hover) {
        text-decoration-thickness: 3px;
        text-shadow: 0 0 8px ${color};
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `;
    }

    /**
     * Remove highlight from DOM
     */
    removeHighlight(id: string): void {
        const element = this.highlightElements.get(id);

        if (!element) {
            this.logger.warn('Attempted to remove non-existent highlight', { id });
            return;
        }

        // Fade out animation
        element.style.transition = 'opacity 0.2s ease';
        element.style.opacity = '0';

        // Remove after animation
        setTimeout(() => {
            // Unwrap content
            const parent = element.parentNode;
            if (parent) {
                while (element.firstChild) {
                    parent.insertBefore(element.firstChild, element);
                }
                parent.removeChild(element);
            }

            this.highlightElements.delete(id);
            this.logger.debug('Highlight removed', { id });
        }, 200);
    }

    /**
     * Remove all highlights
     */
    clearAll(): void {
        const ids = Array.from(this.highlightElements.keys());

        for (const id of ids) {
            this.removeHighlight(id);
        }

        this.logger.info('All highlights cleared');
    }

    /**
     * Generate unique ID
     */
    private generateId(): string {
        return `highlight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get highlight count
     */
    count(): number {
        return this.highlightElements.size;
    }
}
