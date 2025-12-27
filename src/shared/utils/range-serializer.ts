/**
 * @file range-serializer.ts
 * @description Serialize and deserialize DOM ranges for highlight persistence
 * 
 * Uses XPath + offsets for position, with text verification and fuzzy matching fallback.
 */

/**
 * Serialized range for storage
 */
export interface SerializedRange {
    /** XPath to the text node */
    xpath: string;
    /** Character offset within the start node */
    startOffset: number;
    /** Character offset within the end node */
    endOffset: number;
    /** The highlighted text (for verification) */
    text: string;
    /** Context before highlight (for fuzzy matching) */
    textBefore: string;
    /** Context after highlight (for fuzzy matching) */
    textAfter: string;
}

const CONTEXT_LENGTH = 50; // Characters of context to store

/**
 * Serialize a Range to a storable format
 */
export function serializeRange(range: Range): SerializedRange {
    const startContainer = range.startContainer;
    const endContainer = range.endContainer;

    // Get XPath for start container
    const xpath = getXPath(startContainer);

    // Get the highlighted text
    const text = range.toString();

    // Get surrounding context
    const textBefore = getTextBefore(range, CONTEXT_LENGTH);
    const textAfter = getTextAfter(range, CONTEXT_LENGTH);

    return {
        xpath,
        startOffset: range.startOffset,
        endOffset: range.endOffset,
        text,
        textBefore,
        textAfter
    };
}

/**
 * Deserialize a stored range back to a DOM Range
 * Returns null if the range cannot be restored
 */
export function deserializeRange(sr: SerializedRange): Range | null {
    // Strategy 1: Try exact XPath match
    const node = getNodeByXPath(sr.xpath);
    if (node) {
        const range = tryExactMatch(node, sr);
        if (range) return range;
    }

    // Strategy 2: Fuzzy text search with context
    const fuzzyRange = tryFuzzyMatch(sr);
    if (fuzzyRange) return fuzzyRange;

    // Could not restore
    return null;
}

/**
 * Try to restore range at exact XPath position
 */
function tryExactMatch(node: Node, sr: SerializedRange): Range | null {
    try {
        // Verify text content matches
        const textContent = node.textContent || '';
        const actualText = textContent.substring(sr.startOffset, sr.endOffset);

        if (actualText !== sr.text) {
            return null; // Text changed
        }

        // Create range
        const range = document.createRange();
        range.setStart(node, sr.startOffset);
        range.setEnd(node, sr.endOffset);
        return range;
    } catch {
        return null;
    }
}

/**
 * Try fuzzy matching using text and context
 */
function tryFuzzyMatch(sr: SerializedRange): Range | null {
    // Find all occurrences of the text
    const matches = findTextInDocument(sr.text);

    if (matches.length === 0) {
        return null;
    }

    if (matches.length === 1) {
        return matches[0];
    }

    // Multiple matches - use context to disambiguate
    for (const match of matches) {
        const before = getTextBefore(match, CONTEXT_LENGTH);
        const after = getTextAfter(match, CONTEXT_LENGTH);

        // Check if context matches (allow partial match)
        if (contextMatches(before, sr.textBefore) || contextMatches(after, sr.textAfter)) {
            return match;
        }
    }

    // Fall back to first match if no context match
    return matches[0];
}

/**
 * Check if context strings match (fuzzy)
 */
function contextMatches(actual: string, expected: string): boolean {
    if (!expected || !actual) return false;

    // Normalize whitespace
    const a = actual.replace(/\s+/g, ' ').trim();
    const e = expected.replace(/\s+/g, ' ').trim();

    // Check for substantial overlap (at least 50%)
    const minLength = Math.min(a.length, e.length);
    if (minLength < 10) return a === e;

    return a.includes(e.substring(0, minLength / 2)) ||
        e.includes(a.substring(0, minLength / 2));
}

/**
 * Generate XPath for a node
 */
export function getXPath(node: Node): string {
    const parts: string[] = [];
    let current: Node | null = node;

    while (current && current !== document.body && current !== document) {
        if (current.nodeType === Node.ELEMENT_NODE) {
            const el = current as Element;
            const index = getElementIndex(el);
            parts.unshift(`${el.tagName.toLowerCase()}[${index}]`);
        } else if (current.nodeType === Node.TEXT_NODE) {
            const index = getTextNodeIndex(current);
            parts.unshift(`text()[${index}]`);
        }
        current = current.parentNode;
    }

    return '/html/body/' + parts.join('/');
}

/**
 * Get element's index among siblings of same type
 */
function getElementIndex(el: Element): number {
    let index = 1;
    let sibling = el.previousElementSibling;

    while (sibling) {
        if (sibling.tagName === el.tagName) {
            index++;
        }
        sibling = sibling.previousElementSibling;
    }

    return index;
}

/**
 * Get text node's index among sibling text nodes
 */
function getTextNodeIndex(node: Node): number {
    let index = 1;
    let sibling = node.previousSibling;

    while (sibling) {
        if (sibling.nodeType === Node.TEXT_NODE) {
            index++;
        }
        sibling = sibling.previousSibling;
    }

    return index;
}

/**
 * Get node by XPath
 */
export function getNodeByXPath(xpath: string): Node | null {
    try {
        const result = document.evaluate(
            xpath,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
        );
        return result.singleNodeValue;
    } catch {
        return null;
    }
}

/**
 * Find all occurrences of text in document
 */
function findTextInDocument(text: string): Range[] {
    const ranges: Range[] = [];
    const treeWalker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null
    );

    let node: Text | null;
    while ((node = treeWalker.nextNode() as Text | null)) {
        const content = node.textContent || '';
        let index = 0;

        while ((index = content.indexOf(text, index)) !== -1) {
            const range = document.createRange();
            range.setStart(node, index);
            range.setEnd(node, index + text.length);
            ranges.push(range);
            index += text.length;
        }
    }

    return ranges;
}

/**
 * Get text before a range
 */
function getTextBefore(range: Range, length: number): string {
    try {
        const preRange = document.createRange();
        preRange.setStart(document.body, 0);
        preRange.setEnd(range.startContainer, range.startOffset);
        const text = preRange.toString();
        return text.slice(-length);
    } catch {
        return '';
    }
}

/**
 * Get text after a range
 */
function getTextAfter(range: Range, length: number): string {
    try {
        const postRange = document.createRange();
        postRange.setStart(range.endContainer, range.endOffset);
        postRange.setEnd(document.body, document.body.childNodes.length);
        const text = postRange.toString();
        return text.slice(0, length);
    } catch {
        return '';
    }
}
