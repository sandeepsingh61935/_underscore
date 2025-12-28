/**
 * @file text-quote-extractor.ts
 * @description Extract W3C TextQuoteSelector from browser Range
 * 
 * Pattern: Builder Pattern for flexible, configurable extraction
 * Algorithm: DOM tree walking for context extraction
 */

import type { TextQuoteSelector } from '@/shared/schemas/highlight-schema';
import { TextQuoteSelectorSchema } from '@/shared/schemas/highlight-schema';

/**
 * Configuration for selector extraction
 */
export interface SelectorConfig {
    prefixLength: number;
    suffixLength: number;
    exactMaxLength: number;
}

export const DEFAULT_SELECTOR_CONFIG: SelectorConfig = {
    prefixLength: 32,
    suffixLength: 32,
    exactMaxLength: 5000
};

/**
 * Extract TextQuoteSelector from Range
 * 
 * Pattern: Builder
 * Algorithm: DOM tree walking for context
 */
export class TextQuoteSelectorBuilder {
    constructor(private config: SelectorConfig = DEFAULT_SELECTOR_CONFIG) { }

    /**
     * Build selector from range
     * 
     * @throws {Error} If text too long or empty
     */
    build(range: Range): TextQuoteSelector {
        const exact = this.extractExact(range);
        const prefix = this.extractPrefix(range);
        const suffix = this.extractSuffix(range);

        const selector = {
            type: 'TextQuoteSelector' as const,
            exact,
            prefix,
            suffix
        };

        // Validate against schema (runtime safety)
        return TextQuoteSelectorSchema.parse(selector);
    }

    /**
     * Extract exact selected text
     */
    private extractExact(range: Range): string {
        const text = range.toString();

        if (!text) {
            throw new Error('Cannot extract selector from empty selection');
        }

        if (text.length > this.config.exactMaxLength) {
            throw new Error(
                `Selected text too long: ${text.length} > ${this.config.exactMaxLength}`
            );
        }

        return text;
    }

    /**
     * Extract prefix (text before selection)
     * 
     * Algorithm:
     * 1. Get text in start node before offset
     * 2. Walk backward through siblings
     * 3. Continue until we have enough chars
     */
    private extractPrefix(range: Range): string | undefined {
        const { startContainer, startOffset } = range;

        // Get text before selection in same node
        let prefix = '';
        if (startContainer.nodeType === Node.TEXT_NODE) {
            const textNode = startContainer as Text;
            prefix = (textNode.textContent || '').slice(0, startOffset);
        }

        // Walk backward through DOM to get more context
        let node: Node | null = startContainer;
        while (prefix.length < this.config.prefixLength && node) {
            const prevSibling = node.previousSibling;
            if (prevSibling?.nodeType === Node.TEXT_NODE) {
                const text = prevSibling.textContent || '';
                prefix = text + prefix;

                // Truncate if too long
                if (prefix.length > this.config.prefixLength) {
                    prefix = prefix.slice(-this.config.prefixLength);
                    break;
                }
            }
            node = prevSibling;
        }

        // Return last N characters
        const result = prefix.slice(-this.config.prefixLength);
        return result.length > 0 ? result : undefined;
    }

    /**
     * Extract suffix (text after selection)
     * 
     * Algorithm: Mirror of extractPrefix
     */
    private extractSuffix(range: Range): string | undefined {
        const { endContainer, endOffset } = range;

        // Get text after selection in same node
        let suffix = '';
        if (endContainer.nodeType === Node.TEXT_NODE) {
            const textNode = endContainer as Text;
            suffix = (textNode.textContent || '').slice(endOffset);
        }

        // Walk forward through DOM
        let node: Node | null = endContainer;
        while (suffix.length < this.config.suffixLength && node) {
            const nextSibling = node.nextSibling;
            if (nextSibling?.nodeType === Node.TEXT_NODE) {
                const text = nextSibling.textContent || '';
                suffix = suffix + text;

                // Truncate if too long
                if (suffix.length > this.config.suffixLength) {
                    suffix = suffix.slice(0, this.config.suffixLength);
                    break;
                }
            }
            node = nextSibling;
        }

        // Return first N characters
        const result = suffix.slice(0, this.config.suffixLength);
        return result.length > 0 ? result : undefined;
    }
}

/**
 * Convenience function
 */
export function extractTextQuoteSelector(
    range: Range,
    config?: SelectorConfig
): TextQuoteSelector {
    const builder = new TextQuoteSelectorBuilder(config);
    return builder.build(range);
}
