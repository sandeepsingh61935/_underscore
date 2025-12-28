/**
 * @file highlight-styles.ts
 * @description CSS styles for Custom Highlight API
 * 
 * Uses ::highlight() pseudo-element for zero-DOM rendering
 */

import type { AnnotationType } from '@/shared/types/annotation';

/**
 * CSS Custom Properties for dynamic colors
 */
const CSS_VARS = {
    color: '--underscore-hl-color',
};

/**
 * Generate CSS for all highlight modes
 */
function generateHighlightCSS(): string {
    return `
        /* Underscore Mode - wavy underline */
        ::highlight(underscore) {
            text-decoration: underline wavy;
            text-decoration-color: var(${CSS_VARS.color}, #FF5722);
            text-underline-offset: 3px;
            text-decoration-thickness: 2px;
        }
        
        /* Highlight Mode - background color */
        ::highlight(highlight) {
            background-color: var(${CSS_VARS.color}, #FFEB3B);
            color: inherit;
        }
        
        /* Box Mode - outline (NO layout impact!) */
        ::highlight(box) {
            outline: 2px solid var(${CSS_VARS.color}, #2196F3);
            outline-offset: 1px;
        }
    `;
}

/**
 * Inject highlight styles into document head
 * Called once on content script initialization
 */
export function injectHighlightStyles(): void {
    // Check if already injected
    if (document.getElementById('underscore-highlight-styles')) {
        return;
    }

    const style = document.createElement('style');
    style.id = 'underscore-highlight-styles';
    style.textContent = generateHighlightCSS();
    document.head.appendChild(style);
}

/**
 * Get the CSS highlight name for a given mode and id
 */
export function getHighlightName(mode: AnnotationType, _id: string): string {
    // For now, use mode as group name (all same-mode highlights share style)
    // The Highlight object itself is unique per id
    return mode;
}

/**
 * Set highlight color via CSS custom property
 */
export function setHighlightColor(color: string): void {
    document.documentElement.style.setProperty(CSS_VARS.color, color);
}
