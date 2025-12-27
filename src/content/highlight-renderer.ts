/**
 * @file highlight-renderer.ts
 * @description Renders annotations using Shadow DOM isolation
 * Supports: underscore, highlight, and box modes
 */

import { EventBus } from '@/shared/utils/event-bus';
import { EventName, createEvent, HighlightRemovedEvent } from '@/shared/types/events';
import { LoggerFactory } from '@/shared/utils/logger';
import type { ILogger } from '@/shared/utils/logger';
import type { Highlight } from './highlight-store';
import { serializeRange, type SerializedRange } from '@/shared/utils/range-serializer';
import { rgbToHex } from '@/shared/utils/color-utils';
import type { AnnotationType } from '@/shared/types/annotation';
import { MD3_COLORS } from '@/shared/types/annotation';

/**
 * Extended Highlight with serialized range for storage
 */
export interface HighlightWithRange extends Highlight {
    range: SerializedRange;
}

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
    private themeObserver: MutationObserver | null = null;

    constructor(private readonly eventBus: EventBus) {
        this.logger = LoggerFactory.getLogger('HighlightRenderer');
        this.setupEventListeners();
        this.setupThemeObserver();
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
     * Set up theme change observer
     * Watches for class/style changes on <html> and <body> that indicate theme changes
     */
    private setupThemeObserver(): void {
        // Watch for theme changes on html and body elements
        this.themeObserver = new MutationObserver(() => {
            this.handleThemeChange();
        });

        // Observe class and style changes on html and body
        const config = { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] };

        this.themeObserver.observe(document.documentElement, config);
        this.themeObserver.observe(document.body, config);

        this.logger.debug('Theme observer initialized');
    }

    /**
     * Handle theme changes - update all highlight colors
     */
    private handleThemeChange(): void {
        this.logger.debug('Theme change detected, updating all highlights');

        for (const [id, element] of this.highlightElements) {
            const originalColor = element.dataset.originalColor;
            if (!originalColor) continue;

            // Detect new background color
            const backgroundColor = this.getBackgroundColorFromElement(element);
            const adjustedColor = this.getContrastColor(originalColor, backgroundColor);

            // Update underline color
            this.updateUnderlineColor(element, adjustedColor);

            this.logger.debug('Updated highlight color', { id, originalColor, adjustedColor });
        }
    }

    /**
     * Get background color of element
     */
    private getBackgroundColorFromElement(element: Element): string {
        let currentElement: Element | null = element;

        while (currentElement && currentElement !== document.body) {
            const bg = window.getComputedStyle(currentElement).backgroundColor;

            if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
                const match = bg.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)$/);
                if (match) {
                    const r = parseInt(match[1]);
                    const g = parseInt(match[2]);
                    const b = parseInt(match[3]);
                    return rgbToHex(r, g, b);
                }
            }

            currentElement = currentElement.parentElement;
        }

        return '#FFFFFF';
    }

    /**
     * Update underline color of existing highlight
     */
    private updateUnderlineColor(element: HTMLElement, color: string): void {
        const shadowRoot = element.shadowRoot;
        if (!shadowRoot) return;

        const style = shadowRoot.querySelector('style');
        if (!style) return;

        style.textContent = this.getHighlightStyles(color);
    }

    /**
     * Create annotation from selection
     * @param selection - The text selection
     * @param color - Annotation color
     * @param type - Annotation type (underscore, highlight, or box)
     */
    createHighlight(selection: Selection, color: string, type: AnnotationType = 'underscore'): Highlight {
        const id = this.generateId();
        const text = selection.toString().trim();
        const range = selection.getRangeAt(0);

        // Detect background color and adjust for contrast
        const backgroundColor = this.getBackgroundColor(range);
        const adjustedColor = this.getContrastColor(color, backgroundColor);

        // Create highlight element
        const highlightElement = this.createHighlightElement(id, adjustedColor);

        // Wrap range with highlight
        try {
            // Try simple approach first
            range.surroundContents(highlightElement);
        } catch (error) {
            // Fallback for complex ranges (spanning multiple elements)
            this.logger.debug('Using complex range handling');

            // Extract contents and wrap manually
            const contents = range.extractContents();
            highlightElement.appendChild(contents);
            range.insertNode(highlightElement);
        }

        // Store element reference
        this.highlightElements.set(id, highlightElement);

        // Serialize range BEFORE wrapping modifies the DOM
        const serializedRange = serializeRange(range);

        const highlightWithRange: HighlightWithRange = {
            id,
            text,
            color: color, // Store ORIGINAL color (not adjusted)
            element: highlightElement,
            createdAt: new Date(),
            range: serializedRange,
        };

        // Emit creation event with range for storage
        this.eventBus.emit(EventName.HIGHLIGHT_CREATED, createEvent({
            type: EventName.HIGHLIGHT_CREATED,
            highlight: {
                id,
                text,
                color: adjustedColor,
            },
            range: serializedRange, // Include for storage
        }));

        this.logger.info('Highlight created', {
            id,
            textLength: text.length,
            originalColor: color,
            adjustedColor,
            backgroundColor,
            xpath: serializedRange.xpath,
        });

        return highlightWithRange;
    }

    /**
     * Detects the background color of the element containing the selection.
     * @param range The selection range.
     * @returns The computed background color as a string (e.g., "rgb(255, 255, 255)").
     */
    private getBackgroundColor(range: Range): string {
        const commonAncestor = range.commonAncestorContainer;
        let element: Element | null = null;

        if (commonAncestor.nodeType === Node.ELEMENT_NODE) {
            element = commonAncestor as Element;
        } else if (commonAncestor.parentNode && commonAncestor.parentNode.nodeType === Node.ELEMENT_NODE) {
            element = commonAncestor.parentNode as Element;
        } else {
            // Fallback to body if no suitable element found
            element = document.body;
        }

        return getComputedStyle(element).backgroundColor;
    }

    /**
     * Adjusts the highlight color for better contrast against the background.
     * This is a simplified implementation. A more robust solution would involve
     * converting colors to luminance and calculating contrast ratios.
     * @param originalColor The user-selected highlight color.
     * @param backgroundColor The detected background color.
     * @returns An adjusted color string.
     */
    private getContrastColor(originalColor: string, backgroundColor: string): string {
        // Simple luminance calculation for background
        const bgRgb = this.parseColorToRgb(backgroundColor);
        if (!bgRgb) return originalColor; // Fallback if background color can't be parsed

        const bgLuminance = (0.2126 * bgRgb.r + 0.7152 * bgRgb.g + 0.0722 * bgRgb.b) / 255;

        // Simple luminance calculation for original highlight color
        const originalRgb = this.parseColorToRgb(originalColor);
        if (!originalRgb) return originalColor;

        const originalLuminance = (0.2126 * originalRgb.r + 0.7152 * originalRgb.g + 0.0722 * originalRgb.b) / 255;

        // Calculate contrast ratio (WCAG 2.0 formula)
        const contrastRatio = (Math.max(bgLuminance, originalLuminance) + 0.05) / (Math.min(bgLuminance, originalLuminance) + 0.05);

        // If contrast is too low, try to adjust.
        // This is a very basic adjustment. For a real-world scenario,
        // you might want to shift hue, saturation, or pick from a palette.
        const MIN_CONTRAST = 3.0; // WCAG AA for large text, or AAA for normal text

        if (contrastRatio < MIN_CONTRAST) {
            // If background is dark, make highlight lighter (e.g., yellow)
            // If background is light, make highlight darker (e.g., purple)
            if (bgLuminance < 0.5) { // Dark background
                return '#FFFF00'; // Bright yellow
            } else { // Light background
                return '#800080'; // Purple
            }
        }

        return originalColor; // No adjustment needed
    }

    /**
     * Parses a CSS color string (rgb, rgba, hex) into an RGB object.
     * @param colorString The CSS color string.
     * @returns An object with r, g, b properties, or null if parsing fails.
     */
    private parseColorToRgb(colorString: string): { r: number; g: number; b: number } | null {
        // Handle RGB/RGBA
        const rgbMatch = colorString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/) || colorString.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/);
        if (rgbMatch) {
            return {
                r: parseInt(rgbMatch[1], 10),
                g: parseInt(rgbMatch[2], 10),
                b: parseInt(rgbMatch[3], 10),
            };
        }

        // Handle Hex
        const hexMatch = colorString.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
        if (hexMatch) {
            let hex = hexMatch[1];
            if (hex.length === 3) {
                hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
            }
            return {
                r: parseInt(hex.substring(0, 2), 16),
                g: parseInt(hex.substring(2, 4), 16),
                b: parseInt(hex.substring(4, 6), 16),
            };
        }

        // Fallback for named colors or other formats (requires a more comprehensive parser)
        // For simplicity, we'll return null for unhandled formats.
        return null;
    }

    /**
     * Create highlight element with Shadow DOM
     */
    private createHighlightElement(id: string, color: string): HTMLElement {
        const span = document.createElement('span');
        span.className = 'underscore-highlight';
        span.dataset['id'] = id;
        span.dataset['color'] = color;
        span.dataset['originalColor'] = color; // Store original for theme updates

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
