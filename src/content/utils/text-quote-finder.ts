/**
 * @file text-quote-finder.ts
 * @description Find TextQuoteSelector in document and create Range
 *
 * Pattern: Chain of Responsibility (multiple search strategies)
 * Algorithm: Exact match → prefix filter → suffix filter
 */

import type { TextQuoteSelector } from '@/shared/schemas/highlight-schema';

/**
 * Find TextQuoteSelector in document and create Range
 *
 * Algorithm (from Hypothesis):
 * 1. Find all occurrences of exact text
 * 2. If 1 match: return it
 * 3. If multiple: filter by prefix match
 * 4. If still multiple: filter by suffix match
 * 5. Return best match
 *
 * Pattern: Chain of Responsibility
 */
export class TextQuoteFinder {
  /**
   * Find selector in document
   */
  find(selector: TextQuoteSelector, root: Node = document.body): Range | null {
    // Step 1: Find all exact matches
    const matches = this.findExactMatches(selector.exact, root);

    if (matches.length === 0) {
      return null; // Not found
    }

    if (matches.length === 1) {
      return matches[0] ?? null; // Unique match!
    }

    // Step 2: Disambiguate with prefix
    let candidates = matches;
    if (selector.prefix) {
      candidates = this.filterByPrefix(candidates, selector.prefix);
      if (candidates.length === 1) {
        return candidates[0] ?? null;
      }
    }

    // Step 3: Disambiguate with suffix
    if (selector.suffix && candidates.length > 1) {
      candidates = this.filterBySuffix(candidates, selector.suffix);
    }

    // Return best match (or first if still ambiguous)
    return candidates[0] || null;
  }

  /**
   * Find all exact text matches in document
   */
  private findExactMatches(exact: string, root: Node): Range[] {
    const ranges: Range[] = [];
    const textNodes: Text[] = [];
    let fullText = '';

    // 1. Build Virtual Text Map
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let node: Text | null;
    while ((node = walker.nextNode() as Text)) {
      textNodes.push(node);
      fullText += node.textContent || '';
    }

    if (!fullText) return [];

    // 2. Search in concatenated text
    let searchIndex = 0;
    while ((searchIndex = fullText.indexOf(exact, searchIndex)) !== -1) {
      // 3. Map global searchIndex to (StartNode, StartOffset)
      const start = this.mapTextIndexToNode(textNodes, searchIndex);
      // 4. Map global searchIndex + length to (EndNode, EndOffset)
      const end = this.mapTextIndexToNode(textNodes, searchIndex + exact.length);

      if (start && end) {
        try {
          const range = document.createRange();
          range.setStart(start.node, start.offset);
          range.setEnd(end.node, end.offset);
          ranges.push(range);
        } catch (e) {
          console.warn('Failed to create range from global search', e);
        }
      }

      // Advance to avoid infinite loop (allow overlaps? usually simple +1)
      searchIndex += 1;
    }

    return ranges;
  }

  /**
   * Map global text index to specific Text node and offset
   */
  private mapTextIndexToNode(
    nodes: Text[],
    targetIndex: number
  ): { node: Text; offset: number } | null {
    let currentIndex = 0;

    for (const node of nodes) {
      const nodeLength = node.length; // Text node length
      const nodeEnd = currentIndex + nodeLength;

      // Check if target falls within this node (inclusive)
      // Note: We prioritize "End of Node A" over "Start of Node B" for consistency
      // except when targetIndex is 0 (handled by loop start)
      if (targetIndex <= nodeEnd) {
        return { node, offset: targetIndex - currentIndex };
      }

      currentIndex = nodeEnd;
    }
    return null;
  }

  /**
   * Filter matches by prefix context
   */
  private filterByPrefix(ranges: Range[], prefix: string): Range[] {
    return ranges.filter((range) => {
      const textBefore = this.getTextBefore(range);
      return textBefore.endsWith(prefix);
    });
  }

  /**
   * Filter matches by suffix context
   */
  private filterBySuffix(ranges: Range[], suffix: string): Range[] {
    return ranges.filter((range) => {
      const textAfter = this.getTextAfter(range);
      return textAfter.startsWith(suffix);
    });
  }

  /**
   * Get text before range position
   */
  private getTextBefore(range: Range): string {
    const { startContainer, startOffset } = range;

    let text = '';

    // Get text in start node before offset
    if (startContainer.nodeType === Node.TEXT_NODE) {
      const textNode = startContainer as Text;
      text = (textNode.textContent || '').slice(0, startOffset);
    }

    // Walk backward through siblings
    let node: Node | null = startContainer.previousSibling;
    while (node && text.length < 64) {
      // Match prefix max length
      if (node.nodeType === Node.TEXT_NODE) {
        text = (node.textContent || '') + text;
      }
      node = node.previousSibling;
    }

    // Return last 64 chars max
    return text.slice(-64);
  }

  /**
   * Get text after range position
   */
  private getTextAfter(range: Range): string {
    const { endContainer, endOffset } = range;

    let text = '';

    // Get text in end node after offset
    if (endContainer.nodeType === Node.TEXT_NODE) {
      const textNode = endContainer as Text;
      text = (textNode.textContent || '').slice(endOffset);
    }

    // Walk forward through siblings
    let node: Node | null = endContainer.nextSibling;
    while (node && text.length < 64) {
      // Match suffix max length
      if (node.nodeType === Node.TEXT_NODE) {
        text = text + (node.textContent || '');
      }
      node = node.nextSibling;
    }

    // Return first 64 chars max
    return text.slice(0, 64);
  }
}

/**
 * Convenience function
 */
export function findTextQuoteSelector(
  selector: TextQuoteSelector,
  root?: Node
): Range | null {
  const finder = new TextQuoteFinder();
  return finder.find(selector, root);
}
