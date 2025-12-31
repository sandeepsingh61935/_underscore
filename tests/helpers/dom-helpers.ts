/**
 * @file dom-helpers.ts
 * @description DOM testing utilities for creating mock selections and ranges
 */

/**
 * Create a mock DOM Range
 * Useful for testing highlight creation without real DOM
 */
export function createMockRange(
    startContainer: Node,
    startOffset: number,
    endContainer: Node,
    endOffset: number
): Range {
    const range = document.createRange();
    range.setStart(startContainer, startOffset);
    range.setEnd(endContainer, endOffset);
    return range;
}

/**
 * Create a mock Selection with a single range
 * Simulates user text selection
 */
export function createMockSelection(text: string): Selection {
    // Create container element
    const container = document.createElement('p');
    container.textContent = text;
    document.body.appendChild(container);

    // Create range
    const range = document.createRange();
    const textNode = container.firstChild!;
    range.setStart(textNode, 0);
    range.setEnd(textNode, text.length);

    // Create selection
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);

    return selection;
}

/**
 * Create a text node for testing
 */
export function createTextNode(text: string): Text {
    return document.createTextNode(text);
}

/**
 * Create a simple paragraph element with text
 */
export function createParagraph(text: string): HTMLParagraphElement {
    const p = document.createElement('p');
    p.textContent = text;
    return p;
}

/**
 * Clean up DOM after tests
 */
export function cleanupDOM(): void {
    document.body.innerHTML = '';
    const selection = window.getSelection();
    if (selection) {
        selection.removeAllRanges();
    }
}

/**
 * Create a div container for testing
 */
export function createContainer(id?: string): HTMLDivElement {
    const div = document.createElement('div');
    if (id) {
        div.id = id;
    }
    document.body.appendChild(div);
    return div;
}

/**
 * Simulate a user selection in the document
 * Returns the selection and the created element
 */
export function simulateUserSelection(
    text: string,
    start: number = 0,
    end?: number
): { selection: Selection; element: HTMLElement } {
    const element = createParagraph(text);
    document.body.appendChild(element);

    const textNode = element.firstChild!;
    const range = document.createRange();
    range.setStart(textNode, start);
    range.setEnd(textNode, end ?? text.length);

    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);

    return { selection, element };
}
