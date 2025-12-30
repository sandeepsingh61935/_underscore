import DiffMatchPatch from 'diff-match-patch';

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
 * Fuzzy selector for content-based matching using approximate string matching
 */
export interface FuzzySelector {
    /** Target text to find */
    text: string;

    /** Context before (for better matching) */
    textBefore: string;

    /** Context after (for better matching) */
    textAfter: string;

    /** Similarity threshold (0.0-1.0) */
    threshold: number;
}

/**
 * Multi-selector container with all restoration strategies
 * 
 * Implements the Strategy pattern for highlight restoration with 3 fallback tiers
 */
export interface MultiSelector {
    /** Primary XPath selector (fast, brittle) */
    xpath: XPathSelector;

    /** Secondary Position selector (medium reliability) */
    position: PositionSelector;

    /** Tertiary Fuzzy selector (slow, robust) */
    fuzzy: FuzzySelector;

    /** Content hash for verification */
    contentHash: string;

    /** Creation timestamp */
    createdAt: number;
}

/**
 * Multi-Selector Engine for robust highlight restoration
 * 
 * Implements a 3-tier restoration strategy (Strategy Pattern):
 * 1. XPath (fast, brittle to DOM changes)
 * 2. Position (medium speed, brittle to ads/dynamic content)
 * 3. Fuzzy text matching (slow, robust to content changes)
 * 
 * Architecture:
 * - Follows Single Responsibility Principle (SRP): Each selector type is independent
 * - Implements Strategy Pattern: Multiple restoration algorithms with fallback chain
 * - Uses Facade Pattern: Simple API (restore()) hides complex multi-tier logic
 * 
 * Quality Framework Compliance:
 * - SOLID: SRP, OCP (extensible with new selector types), LSP (Range contract)
 * - DRY: Reusable selector creation and verification logic
 * - Performance: Ordered by speed (fast->slow) for optimal UX
 */
export class MultiSelectorEngine {
    private logger: Console;
    private dmp: DiffMatchPatch;

    constructor(logger: Console = console) {
        this.logger = logger;
        this.dmp = new DiffMatchPatch();
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
     * Create a Fuzzy selector from a DOM Range
     * 
     * Uses larger context window (50 chars) for robust matching.
     * Employs diff-match-patch for approximate string matching.
     * 
     * @param range - The DOM Range to create selector for
     * @returns Fuzzy selector data
     */
    createFuzzySelector(range: Range): FuzzySelector {
        const text = range.toString();

        // Get larger context for fuzzy matching (50 chars before/after)
        const bodyText = document.body.textContent || '';
        const startOffset = this.getAbsoluteOffset(range.startContainer, range.startOffset);

        const textBefore = bodyText.substring(Math.max(0, startOffset - 50), startOffset);
        const textAfter = bodyText.substring(
            startOffset + text.length,
            startOffset + text.length + 50
        );

        return {
            text,
            textBefore,
            textAfter,
            threshold: 0.8, // 80% similarity required for context match
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
     * Try to restore a highlight using XPath selector (Tier 1 - Fast)
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

            this.logger.info('✅ XPath restoration successful', selector.xpath);
            return range;

        } catch (error) {
            this.logger.error('XPath restoration error:', error);
            return null;
        }
    }

    /**
     * Try to restore a highlight using Position selector (Tier 2 - Medium)
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

            this.logger.info('✅ Position restoration successful');
            return range;

        } catch (error) {
            this.logger.error('Position restoration error:', error);
            return null;
        }
    }

    /**
     * Try to restore a highlight using fuzzy text matching (Tier 3 - Slow but Robust)
     * 
     * Uses diff-match-patch library for approximate string matching.
     * Most CPU-intensive but handles content changes gracefully.
     * 
     * @param selector - Fuzzy selector data
     * @returns Restored Range, or null if matching failed
     */
    async tryFuzzyMatch(selector: FuzzySelector): Promise<Range | null> {
        try {
            const bodyText = document.body.textContent || '';

            // Use diff-match-patch for fuzzy matching
            const matchIndex = this.dmp.match_main(
                bodyText,
                selector.text,
                0 // Start searching from beginning
            );

            if (matchIndex === -1) {
                this.logger.warn('Fuzzy match failed: text not found in document');
                return null;
            }

            // Verify context similarity using Levenshtein distance
            const foundBefore = bodyText.substring(
                Math.max(0, matchIndex - 50),
                matchIndex
            );
            const foundAfter = bodyText.substring(
                matchIndex + selector.text.length,
                matchIndex + selector.text.length + 50
            );

            // Calculate similarity scores (0.0 to 1.0)
            const beforeSimilarity = this.calculateSimilarity(selector.textBefore, foundBefore);
            const afterSimilarity = this.calculateSimilarity(selector.textAfter, foundAfter);
            const avgSimilarity = (beforeSimilarity + afterSimilarity) / 2;

            if (avgSimilarity < selector.threshold) {
                this.logger.warn('Fuzzy match failed: context similarity too low', {
                    required: selector.threshold,
                    actual: avgSimilarity.toFixed(3),
                    beforeSim: beforeSimilarity.toFixed(3),
                    afterSim: afterSimilarity.toFixed(3),
                });
                return null;
            }

            // Create range from the matched position
            const range = this.createRangeFromOffset(
                matchIndex,
                matchIndex + selector.text.length
            );

            if (!range) {
                this.logger.warn('Fuzzy match failed: could not create range from offset');
                return null;
            }

            this.logger.info('✅ Fuzzy match successful', {
                similarity: avgSimilarity.toFixed(3),
                offset: matchIndex,
            });
            return range;

        } catch (error) {
            this.logger.error('Fuzzy match error:', error);
            return null;
        }
    }

    /**
     * Calculate similarity between two strings using Levenshtein distance
     * 
     * Returns a score from 0.0 (completely different) to 1.0 (identical).
     * Uses diff-match-patch's optimized Levenshtein algorithm.
     * 
     * @param str1 - First string
     * @param str2 - Second string
     * @returns Similarity score (0.0 - 1.0)
     */
    private calculateSimilarity(str1: string, str2: string): number {
        if (str1 === str2) return 1.0;
        if (str1.length === 0 || str2.length === 0) return 0.0;

        // Generate diffs
        const diffs = this.dmp.diff_main(str1, str2);

        // Clean up semantically for better results
        this.dmp.diff_cleanupSemantic(diffs);

        // Calculate Levenshtein distance (number of edits needed)
        const distance = this.dmp.diff_levenshtein(diffs);
        const maxLength = Math.max(str1.length, str2.length);

        // Convert distance to similarity (inverse)
        return 1.0 - (distance / maxLength);
    }

    /**
     * Create a DOM Range from absolute character offsets
     * 
     * Walks the document tree to find the text nodes at the specified positions.
     * 
     * @param startOffset - Absolute start offset from document start
     * @param endOffset - Absolute end offset from document start
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
            this.logger.error('Could not find DOM nodes for offsets', {
                startOffset,
                endOffset,
                foundStart: !!startNode,
                foundEnd: !!endNode,
            });
            return null;
        }

        try {
            const range = document.createRange();
            range.setStart(startNode, startNodeOffset);
            range.setEnd(endNode, endNodeOffset);
            return range;
        } catch (error) {
            this.logger.error('Failed to create range from nodes:', error);
            return null;
        }
    }

    /**
     * Create a multi-selector from a Range with all 3 restoration tiers
     * 
     * Implements the Facade pattern: Simple API hiding complex multi-tier creation.
     * 
     * @param range - DOM Range to create selectors for
     * @returns Multi-selector data with all 3 tiers
     */
    createSelectors(range: Range): MultiSelector {
        const xpath = this.createXPathSelector(range);
        const position = this.createPositionSelector(range);
        const fuzzy = this.createFuzzySelector(range);

        // Simple content hash for quick verification
        const contentHash = this.simpleHash(xpath.text);

        return {
            xpath,
            position,
            fuzzy,
            contentHash,
            createdAt: Date.now(),
        };
    }

    /**
     * Simple hash function for content verification
     * 
     * Uses basic string hashing for quick content comparison.
     * Not cryptographically secure - only for verification purposes.
     * 
     * @param text - Text to hash
     * @returns Hash string (base-36)
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
     * Restore a highlight using the 3-tier restoration strategy
     * 
     * Implements the Strategy pattern with fallback chain:
     * 1. Try XPath (fast, exact match)
     * 2. Try Position (medium, offset-based)
     * 3. Try Fuzzy (slow, approximate matching)
     * 
     * Returns on first successful restoration for optimal performance.
     * 
     * @param selector - Multi-selector data
     * @returns Restored Range, or null if all strategies failed
     */
    async restore(selector: MultiSelector): Promise<Range | null> {
        // Tier 1: Try XPath (fastest - exact node location)
        const xpathRange = await this.tryXPath(selector.xpath);
        if (xpathRange) {
            return xpathRange;
        }

        // Tier 2: Try Position (medium - absolute offsets)
        const positionRange = await this.tryPosition(selector.position);
        if (positionRange) {
            return positionRange;
        }

        // Tier 3: Try Fuzzy (slowest but most robust - approximate matching)
        const fuzzyRange = await this.tryFuzzyMatch(selector.fuzzy);
        if (fuzzyRange) {
            return fuzzyRange;
        }

        // All strategies failed
        this.logger.error('❌ All restoration strategies failed', {
            text: selector.xpath.text.substring(0, 50) + '...',
            hash: selector.contentHash,
        });
        return null;
    }
}

/**
 * Singleton instance (Singleton pattern)
 */
let instance: MultiSelectorEngine | null = null;

/**
 * Get the Multi-Selector Engine instance
 * 
 * Implements Singleton pattern to ensure single instance across application.
 * 
 * @returns MultiSelectorEngine instance
 */
export function getMultiSelectorEngine(): MultiSelectorEngine {
    if (!instance) {
        instance = new MultiSelectorEngine();
    }
    return instance;
}
