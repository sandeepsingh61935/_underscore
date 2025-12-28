/**
 * @file highlight-styles.ts
 * @description CSS styles for Custom Highlight API
 * 
 * Uses ::highlight() pseudo-element for zero-DOM rendering
 */

import type { AnnotationType } from '@/shared/types/annotation';

/**
 * Get the CSS highlight name for a given mode and id
 * CRITICAL: Must be unique per highlight to avoid collisions
 */
export function getHighlightName(mode: AnnotationType, id: string): string {
    return `${mode}-${id}`;
}

/**
 * Inject dynamic CSS rule for a specific highlight
 */
export function injectHighlightCSS(mode: AnnotationType, id: string, color: string): void {
    const highlightName = getHighlightName(mode, id);
    const styleId = `hl-style-${id}`;

    // Remove existing style if present
    const existing = document.getElementById(styleId);
    if (existing) {
        existing.remove();
    }

    // Create style element
    const style = document.createElement('style');
    style.id = styleId;

    // Generate CSS based on mode
    let css = '';
    switch (mode) {
        case 'underscore':
            css = `::highlight(${highlightName}) {
                text-decoration: underline solid;
                text-decoration-color: ${color};
                text-underline-offset: 3px;
                text-decoration-thickness: 2px;
            }`;
            break;
        case 'highlight':
            css = `::highlight(${highlightName}) {
                background-color: ${color};
                color: inherit;
            }`;
            break;
        case 'box':
            css = `::highlight(${highlightName}) {
                outline: 2px solid ${color};
                outline-offset: 1px;
            }`;
            break;
    }

    style.textContent = css;
    document.head.appendChild(style);
}

/**
 * Remove CSS for a specific highlight
 */
export function removeHighlightCSS(id: string): void {
    const styleId = `hl-style-${id}`;
    const style = document.getElementById(styleId);
    if (style) {
        style.remove();
    }
}
