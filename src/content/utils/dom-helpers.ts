/**
 * DOM helper utilities for annotations
 */

/** Block-level HTML elements */
const BLOCK_ELEMENTS = new Set([
    'P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'LI', 'TD', 'TH', 'ARTICLE', 'SECTION', 'HEADER',
    'FOOTER', 'ASIDE', 'BLOCKQUOTE', 'PRE', 'NAV', 'MAIN'
]);

/**
 * Find nearest block-level parent element of a node
 */
function findBlockParent(node: Node): Element | null {
    let current: Node | null = node;

    while (current && current !== document.body) {
        if (current.nodeType === Node.ELEMENT_NODE) {
            const element = current as Element;
            if (BLOCK_ELEMENTS.has(element.tagName)) {
                return element;
            }
        }
        current = current.parentNode;
    }

    return null;
}

/**
 * Check if a range spans multiple block-level elements
 * @param range - The range to check
 * @returns true if range crosses block boundaries
 */
export function spansMultipleBlocks(range: Range): boolean {
    const startBlock = findBlockParent(range.startContainer);
    const endBlock = findBlockParent(range.endContainer);

    // Different block parents means crossing boundaries
    return startBlock !== endBlock;
}
