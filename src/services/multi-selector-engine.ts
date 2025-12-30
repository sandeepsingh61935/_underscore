import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';

/**
 * XPath selector data for precise DOM node targeting
 */
export interface XPathSelector {
    /** XPath expression to locate the highlighted element */
    xpath: string;

    /** Start offset within the text node */
    startOffset: number;

    /** End offset within the text node */
    endOffset: number;

    /** Highlighted text content */
    text: string;

    /** Text before the highlight (for verification) */
    textBefore: string;

    /** Text after the highlight (for verification) */
    textAfter: string;
}

/**
 * Multi-selector container with all restoration strategies
 */
export interface MultiSelector {
    /** Primary XPath selector (fast, brittle) */
    xpath: XPathSelector;

    /** Content hash for verification */
    contentHash: string;

    /** Creation timestamp */
    createdAt: number;
}

/**
 * Multi-Selector Engine for robust highlight restoration
 * 
 * Implements a 3-tier restoration strategy:
 * 1. XPath (fast, brittle to DOM changes)
 * 2. Position (medium speed, brittle to ads/dynamic content)
 * 3. Fuzzy text matching (slow, robust to content changes)
 * 
 * Phase 1 (Task 1.2): XPath selector only
 * Future: Position and fuzzy matching
 */
export class MultiSelectorEngine {
    private logger: Console;

    constructor(logger: Console = console) {
        this.logger = logger;
    }

    /**
     * Create an XPath selector from a DOM Range
     * 
     * @param range - The DOM Range to create selector for
     * @returns XPath selector data
     */
    createXPathSelector(range: Range): XPathSelector {
        const startContainer = range.startContainer;
        const endContainer = range.endContainer;

        // Get the text content
        const text = range.toString();

        // Get context (30 chars before/after for verification)
        const textBefore = this.getTextBefore(startContainer, range.startOffset, 30);
        const textAfter = this.getTextAfter(endContainer, range.endOffset, 30);

        // Generate XPath to the common ancestor
        const commonAncestor = range.commonAncestorContainer;
        const xpath = this.getXPath(commonAncestor);

        return {
            xpath,
            startOffset: range.startOffset,
            endOffset: range.endOffset,
            text,
            textBefore,
            textAfter,
        };
    }

    /**
     * Get XPath expression for a DOM node
     * 
     * Generates a unique XPath that can locate this node in the document.
     * Format: /html/body/div[2]/article[1]/p[5]/text()[1]
     * 
     * @param node - The DOM node to generate XPath for
     * @returns XPath expression string
     */
    private getXPath(node: Node): string {
        const parts: string[] = [];
        let currentNode: Node | null = node;

        while (currentNode && currentNode.nodeType !== Node.DOCUMENT_NODE) {
            const part = this.getNodePosition(currentNode);
            if (part) {
                parts.unshift(part);
            }
            currentNode = currentNode.parentNode;
        }

        return '/' + parts.join('/');
    }

    /**
     * Get the position-based identifier for a node
     * 
     * @param node - The node to identify
     * @returns Position string like "div[2]" or "text()[1]"
     */
    private getNodePosition(node: Node): string | null {
        if (node.nodeType === Node.TEXT_NODE) {
            // For text nodes, count which text node it is among siblings
            let index = 1;
            let sibling = node.previousSibling;

            while (sibling) {
                if (sibling.nodeType === Node.TEXT_NODE) {
                    index++;
                }
                sibling = sibling.previousSibling;
            }

            return `text()[${index}]`;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            const tagName = element.tagName.toLowerCase();

            // Count siblings with same tag name
            let index = 1;
            let sibling = node.previousSibling;

            while (sibling) {
                if (sibling.nodeType === Node.ELEMENT_NODE) {
                    const siblingElement = sibling as Element;
                    if (siblingElement.tagName.toLowerCase() === tagName) {
                        index++;
                    }
                }
                sibling = sibling.previousSibling;
            }

            return `${tagName}[${index}]`;
        }

        return null;
    }

    /**
     * Get text before a position in a text node
     * 
     * @param node - Text node containing the position
     * @param offset - Character offset in the text node
     * @param length - Number of characters to extract
     * @returns Text before the offset
     */
    private getTextBefore(node: Node, offset: number, length: number): string {
        if (node.nodeType !== Node.TEXT_NODE) {
            return '';
        }

        const textContent = node.textContent || '';
        const start = Math.max(0, offset - length);
        return textContent.substring(start, offset);
    }

    /**
     * Get text after a position in a text node
     * 
     * @param node - Text node containing the position
     * @param offset - Character offset in the text node
     * @param length - Number of characters to extract
     * @returns Text after the offset
     */
    private getTextAfter(node: Node, offset: number, length: number): string {
        if (node.nodeType !== Node.TEXT_NODE) {
            return '';
        }

        const textContent = node.textContent || '';
        return textContent.substring(offset, offset + length);
    }

    /**
     * Try to restore a highlight using XPath selector
     * 
     * @param selector - XPath selector data
     * @returns Restored Range, or null if restoration failed
     */
    async tryXPath(selector: XPathSelector): Promise<Range | null> {
        try {
            // Evaluate XPath to find the node
            const result = document.evaluate(
                selector.xpath,
                document,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
            );

            const node = result.singleNodeValue;

            if (!node) {
                this.logger.warn('XPath selector failed: node not found', selector.xpath);
                return null;
            }

            // Verify the text content matches
            const textContent = node.textContent || '';

            // Check if our text exists at the expected position
            const extractedText = textContent.substring(
                selector.startOffset,
                selector.endOffset
            );

            if (extractedText !== selector.text) {
                this.logger.warn('XPath selector failed: text mismatch', {
                    expected: selector.text,
                    actual: extractedText,
                });
                return null;
            }

            // Verify context (text before/after)
            const actualTextBefore = textContent.substring(
                Math.max(0, selector.startOffset - 30),
                selector.startOffset
            );

            const actualTextAfter = textContent.substring(
                selector.endOffset,
                selector.endOffset + 30
            );

            if (actualTextBefore !== selector.textBefore || actualTextAfter !== selector.textAfter) {
                this.logger.warn('XPath selector context mismatch (DOM may have changed)', {
                    expectedBefore: selector.textBefore,
                    actualBefore: actualTextBefore,
                    expectedAfter: selector.textAfter,
                    actualAfter: actualTextAfter,
                });
                // Continue anyway - text content matches even if context differs slightly
            }

            // Create a Range for the restored selection
            const range = document.createRange();
            range.setStart(node, selector.startOffset);
            range.setEnd(node, selector.endOffset);

            this.logger.info('XPath restoration successful', selector.xpath);
            return range;

        } catch (error) {
            this.logger.error('XPath restoration error:', error);
            return null;
        }
    }

    /**
     * Create a multi-selector from a Range (Phase 1: XPath only)
     * 
     * @param range - DOM Range to create selectors for
     * @returns Multi-selector data
     */
    createSelectors(range: Range): MultiSelector {
        const xpath = this.createXPathSelector(range);

        // Simple content hash (Phase 1)
        const contentHash = this.simpleHash(xpath.text);

        return {
            xpath,
            contentHash,
            createdAt: Date.now(),
        };
    }

    /**
     * Simple hash function for content verification
     * 
     * @param text - Text to hash
     * @returns Hash string
     */
    private simpleHash(text: string): string {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    /**
     * Restore a highlight using the multi-selector (Phase 1: XPath only)
     * 
     * @param selector - Multi-selector data
     * @returns Restored Range, or null if all strategies failed
     */
    async restore(selector: MultiSelector): Promise<Range | null> {
        // Phase 1: Try XPath only
        const xpathRange = await this.tryXPath(selector.xpath);

        if (xpathRange) {
            return xpathRange;
        }

        // Phase 2 & 3 (position, fuzzy) will be added in Tasks 1.3, 1.4
        this.logger.warn('All restoration strategies failed');
        return null;
    }
}

/**
 * Singleton instance
 */
let instance: MultiSelectorEngine | null = null;

/**
 * Get the Multi-Selector Engine instance
 */
export function getMultiSelectorEngine(): MultiSelectorEngine {
    if (!instance) {
        instance = new MultiSelectorEngine();
    }
    return instance;
}
