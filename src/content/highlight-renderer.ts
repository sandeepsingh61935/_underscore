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

        // Detect background color and adjust for contrast
        const backgroundColor = this.getBackgroundColor(range);
        const adjustedColor = this.getContrastColor(color, backgroundColor);

        // Create highlight element
        const highlightElement = this.createHighlightElement(id, adjustedColor);

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
            color: adjustedColor, // Store adjusted color
            element: highlightElement,
            createdAt: new Date(),
        };

        // Emit creation event
        this.eventBus.emit(EventName.HIGHLIGHT_CREATED, createEvent({
            type: EventName.HIGHLIGHT_CREATED,
            highlight: {
                id,
                text,
                color: adjustedColor,
            },
        }));

        this.logger.info('Highlight created', {
            id,
            textLength: text.length,
            originalColor: color,
            adjustedColor,
            backgroundColor,
        });

        return highlight;
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
   * Get background color of range
   */
    private getBackgroundColor(range: Range): string {
        const container = range.commonAncestorContainer;
        const element = container.nodeType === Node.ELEMENT_NODE
            ? container as Element
            : container.parentElement;

        if (!element) return '#FFFFFF';

        let currentElement: Element | null = element;

        while (currentElement && currentElement !== document.body) {
            const bg = window.getComputedStyle(currentElement).backgroundColor;

            // Check if background is not transparent
            if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
                // Convert rgba to hex
                const match = bg.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)$/);
                if (match) {
                    const r = parseInt(match[1]);
                    const g = parseInt(match[2]);
                    const b = parseInt(match[3]);
                    return this.rgbToHex(r, g, b);
                }
            }

            currentElement = currentElement.parentElement;
        }

        return '#FFFFFF'; // Default to white
    }

    /**
     * Get contrast-adjusted color
     */
    private getContrastColor(color: string, backgroundColor: string): string {
        const bgIsDark = this.isDarkColor(backgroundColor);

        if (bgIsDark) {
            // Dark background - lighten significantly
            return this.lightenColor(color, 40);
        } else {
            // Light background - darken slightly
            return this.darkenColor(color, 10);
        }
    }

    /**
     * Check if color is dark (luminance < 0.5)
     */
    private isDarkColor(hex: string): boolean {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return false;

        const luminance = this.getLuminance(rgb.r, rgb.g, rgb.b);
        return luminance < 0.5;
    }

    /**
     * Calculate relative luminance
     */
    private getLuminance(r: number, g: number, b: number): number {
        const [rs, gs, bs] = [r, g, b].map((c) => {
            const val = c / 255;
            return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    }

    /**
     * Convert hex to RGB
     */
    private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16),
            }
            : null;
    }

    /**
     * Convert RGB to hex
     */
    private rgbToHex(r: number, g: number, b: number): string {
        return '#' + [r, g, b].map((x) => {
            const hex = Math.round(x).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }

    /**
     * Lighten color
     */
    private lightenColor(hex: string, percent: number): string {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return hex;

        const amount = percent / 100;
        const r = Math.min(255, rgb.r + (255 - rgb.r) * amount);
        const g = Math.min(255, rgb.g + (255 - rgb.g) * amount);
        const b = Math.min(255, rgb.b + (255 - rgb.b) * amount);

        return this.rgbToHex(r, g, b);
    }

    /**
     * Darken color
     */
    private darkenColor(hex: string, percent: number): string {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return hex;

        const amount = 1 - percent / 100;
        const r = Math.max(0, rgb.r * amount);
        const g = Math.max(0, rgb.g * amount);
        const b = Math.max(0, rgb.b * amount);

        return this.rgbToHex(r, g, b);
    }

    /**
     * Get highlight count
     */
    count(): number {
        return this.highlightElements.size;
    }
}
