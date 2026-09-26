/**
 * @file text-quote-finder.ts
 * @description Find TextQuoteSelector in document and create Range
 *
 * Pattern: Chain of Responsibility (multiple search strategies)
 * Algorithm: Exact match → prefix filter → suffix filter
 */

import type { TextQuoteSelector } from '@/shared/schemas/highlight-schema';

const UNICODE_SPACE_RE = /[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g;

function normalizeForMatch(s: string): string {
  return s
    .replace(UNICODE_SPACE_RE, ' ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\t\n\r ]+/g, ' ')
    .trim();
}

function buildNormalizedWithMap(raw: string): {
  norm: string;
  normToRaw: number[];
} {
  const intermediate = raw
    .replace(UNICODE_SPACE_RE, ' ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');
  let norm = '';
  const normToRaw: number[] = [];
  let inWs = false;
  let wsStart = -1;
  for (let i = 0; i < intermediate.length; i++) {
    const ch = intermediate[i]!;
    const isWs =
      ch === ' ' ||
      ch === '\t' ||
      ch === '\n' ||
      ch === '\r' ||
      ch === '\f' ||
      ch === '\v';
    if (isWs) {
      if (!inWs) {
        wsStart = i;
        inWs = true;
      }
    } else {
      if (inWs) {
        if (norm.length > 0) {
          norm += ' ';
          normToRaw.push(wsStart);
        }
        inWs = false;
      }
      norm += ch;
      normToRaw.push(i);
    }
  }
  // trailing whitespace is trimmed (not emitted)
  return { norm, normToRaw };
}

/**
 * Find TextQuoteSelector in document and create Range
 *
 * Algorithm (from Hypothesis):
 * 1. Find all occurrences of exact text (collapsed whitespace + quote equivalence)
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
   * Find all exact text matches in document using collapsed whitespace
   * and quote equivalence, mapping normalized indices back to raw DOM offsets.
   */
  private findExactMatches(exact: string, root: Node): Range[] {
    const normExact = normalizeForMatch(exact);
    if (!normExact) return [];
    const textNodes: Text[] = [];
    let raw = '';
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let node: Text | null;
    while ((node = walker.nextNode() as Text)) {
      textNodes.push(node);
      raw += node.textContent || '';
    }
    if (!raw) return [];
    const { norm: normRaw, normToRaw } = buildNormalizedWithMap(raw);
    if (!normRaw) return [];
    const ranges: Range[] = [];
    let searchIndex = 0;
    while ((searchIndex = normRaw.indexOf(normExact, searchIndex)) !== -1) {
      const rawStart = normToRaw[searchIndex]!;
      const endNormIdx = searchIndex + normExact.length;
      const rawEnd = endNormIdx < normToRaw.length ? normToRaw[endNormIdx]! : raw.length;
      const start = this.mapTextIndexToNode(textNodes, rawStart);
      const end = this.mapTextIndexToNode(textNodes, rawEnd);
      if (start && end) {
        try {
          const range = document.createRange();
          range.setStart(start.node, start.offset);
          range.setEnd(end.node, end.offset);
          ranges.push(range);
        } catch (e) {
          console.warn('Failed to create range from collapsed search', e);
        }
      }
      searchIndex += 1;
    }
    return ranges;
  }

  private mapTextIndexToNode(
    nodes: Text[],
    targetIndex: number
  ): { node: Text; offset: number } | null {
    let currentIndex = 0;
    for (const node of nodes) {
      const nodeLength = node.length;
      const nodeEnd = currentIndex + nodeLength;
      if (targetIndex < nodeEnd) {
        return { node, offset: targetIndex - currentIndex };
      }
      if (targetIndex === nodeEnd) {
        // Prefer start of next node over end of current when at boundary
        const next = nodes[nodes.indexOf(node) + 1];
        if (next) return { node: next, offset: 0 };
        return { node, offset: nodeLength };
      }
      currentIndex = nodeEnd;
    }
    return null;
  }

  /**
   * Filter matches by prefix context (normalized)
   */
  private filterByPrefix(ranges: Range[], prefix: string): Range[] {
    const normPrefix = normalizeForMatch(prefix);
    return ranges.filter((range) => {
      const textBefore = this.getTextBefore(range);
      return normalizeForMatch(textBefore).endsWith(normPrefix);
    });
  }

  /**
   * Filter matches by suffix context (normalized)
   */
  private filterBySuffix(ranges: Range[], suffix: string): Range[] {
    const normSuffix = normalizeForMatch(suffix);
    return ranges.filter((range) => {
      const textAfter = this.getTextAfter(range);
      return normalizeForMatch(textAfter).startsWith(normSuffix);
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
