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
 * Position selector data using absolute character offsets
 */
export interface PositionSelector {
    /** Absolute character offset from document start */
    startOffset: number;

    /** Absolute character offset from document end */
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

    /** Secondary Position selector (medium reliability) */
    position: PositionSelector;

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
 * Phase 2 (Task 1.3): XPath + Position selectors
 * Future: Fuzzy matching (Task 1.4)
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
     * Create a Position selector from a DOM Range
     * 
     * Uses absolute character offsets from document start.
     * More resilient than XPath to minor DOM changes.
     * 
     * @param range - The DOM Range to create selector for
     * @returns Position selector data
     */
    createPositionSelector(range: Range): PositionSelector {
        const text = range.toString();

        // Calculate absolute offset from document start
        const startOffset = this.getAbsoluteOffset(range.startContainer, range.startOffset);
        const endOffset = startOffset + text.length;

        // Get context
        const bodyText = document.body.textContent || '';
        const textBefore = bodyText.substring(Math.max(0, startOffset - 30), startOffset);
        const textAfter = bodyText.substring(endOffset, endOffset + 30);

        return {
            startOffset,
            endOffset,
            text,
            textBefore,
            textAfter,
        };
    }

    /**
     * Calculate absolute character offset from document start
     * 
     * @param node - The node containing the position
     * @param offset - Offset within the node
     * @returns Absolute character offset
     */
    private getAbsoluteOffset(node: Node, offset: number): number {
        let absoluteOffset = 0;

        // Walk the tree and count characters
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null
        );

        let currentNode: Node | null;
        while ((currentNode = walker.nextNode())) {
            if (currentNode === node) {
                // Found our node, add the offset within it
                return absoluteOffset + offset;
            }

            // Add the length of this text node
            absoluteOffset += (currentNode.textContent || '').length;
        }

        return absoluteOffset;
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
     * Try to restore a highlight using Position selector
     * 
     * @param selector - Position selector data
     * @returns Restored Range, or null if restoration failed
     */
    async tryPosition(selector: PositionSelector): Promise<Range | null> {
        try {
            const bodyText = document.body.textContent || '';

            // Get the text at the expected position
            const extractedText = bodyText.substring(
                selector.startOffset,
                selector.endOffset
            );

            // Verify text matches
            if (extractedText !== selector.text) {
                this.logger.warn('Position selector failed: text mismatch', {
                    expected: selector.text,
                    actual: extractedText,
                });
                return null;
            }

            // Verify context
            const actualTextBefore = bodyText.substring(
                Math.max(0, selector.startOffset - 30),
                selector.startOffset
            );
            const actualTextAfter = bodyText.substring(
                selector.endOffset,
                selector.endOffset + 30
            );

            if (actualTextBefore !== selector.textBefore || actualTextAfter !== selector.textAfter) {
                this.logger.warn('Position selector context mismatch');
                // Continue if text matches even with context differences
            }

            // Find the DOM nodes at this position
            const range = this.createRangeFromOffset(selector.startOffset, selector.endOffset);

            if (!range) {
                this.logger.warn('Position selector failed: could not create range');
                return null;
            }

            this.logger.info('Position restoration successful');
            return range;

        } catch (error) {
            this.logger.error('Position restoration error:', error);
            return null;
        }
    }

    /**
     * Create a DOM Range from absolute character offsets
     * 
     * @param startOffset - Absolute start offset
     * @param endOffset - Absolute end offset
     * @returns DOM Range, or null if failed
     */
    private createRangeFromOffset(startOffset: number, endOffset: number): Range | null {
        let currentOffset = 0;
        let startNode: Node | null = null;
        let startNodeOffset = 0;
        let endNode: Node | null = null;
        let endNodeOffset = 0;

        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null
        );

        let currentNode: Node | null;
        while ((currentNode = walker.nextNode())) {
            const nodeLength = (currentNode.textContent || '').length;

            // Check if start position is in this node
            if (!startNode && currentOffset + nodeLength >= startOffset) {
                startNode = currentNode;
                startNodeOffset = startOffset - currentOffset;
            }

            // Check if end position is in this node
            if (!endNode && currentOffset + nodeLength >= endOffset) {
                endNode = currentNode;
                endNodeOffset = endOffset - currentOffset;
                break; // Found both, can stop
            }

            currentOffset += nodeLength;
        }

        if (!startNode || !endNode) {
            return null;
        }

        try {
            const range = document.createRange();
            range.setStart(startNode, startNodeOffset);
            range.setEnd(endNode, endNodeOffset);
            return range;
        } catch (error) {
            this.logger.error('Failed to create range:', error);
            return null;
        }
    }

    /**
     * Create a multi-selector from a Range (Phase 2: XPath + Position)
     * 
     * @param range - DOM Range to create selectors for
     * @returns Multi-selector data
     */
    createSelectors(range: Range): MultiSelector {
        const xpath = this.createXPathSelector(range);
        const position = this.createPositionSelector(range);

        // Simple content hash
        const contentHash = this.simpleHash(xpath.text);

        return {
            xpath,
            position,
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
     * Restore a highlight using the multi-selector (Phase 2: XPath + Position)
     * 
     * @param selector - Multi-selector data
     * @returns Restored Range, or null if all strategies failed
     */
    async restore(selector: MultiSelector): Promise<Range | null> {
        // Tier 1: Try XPath (fast)
        const xpathRange = await this.tryXPath(selector.xpath);

        if (xpathRange) {
            return xpathRange;
        }

        // Tier 2: Try Position (medium)
        const positionRange = await this.tryPosition(selector.position);

        if (positionRange) {
            return positionRange;
        }

        // Tier 3: Fuzzy matching will be added in Task 1.4
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
