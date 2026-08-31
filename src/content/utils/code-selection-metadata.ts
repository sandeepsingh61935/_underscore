/**
 * Detect whether a DOM selection is primarily from a code block (pre/code)
 * so the library can render code chrome without mutating stored text with fences.
 *
 * Pure fence wrapping lives in `@/shared/utils/highlight-presentation` so shared
 * code never depends on this content module.
 */

export interface CodeSelectionMeta {
  sourceKind: 'code';
  language?: string;
}

const LANG_CLASS_RE = /(?:^|\s)(?:language|lang)-([a-zA-Z0-9_+#.-]+)/;

/**
 * Best-effort language from pre/code class or data attributes.
 */
export function extractCodeLanguage(el: Element): string | undefined {
  const dataLang =
    el.getAttribute('data-lang') ||
    el.getAttribute('data-language') ||
    el.closest('[data-lang], [data-language]')?.getAttribute('data-lang') ||
    el.closest('[data-lang], [data-language]')?.getAttribute('data-language');
  if (dataLang?.trim()) return dataLang.trim().toLowerCase();

  const className = el.className?.toString?.() ?? '';
  const m = className.match(LANG_CLASS_RE);
  if (m?.[1]) return m[1].toLowerCase();

  // Parent often holds language-* on <code>
  const code = el.matches('code') ? el : el.querySelector('code');
  if (code && code !== el) {
    const inner = extractCodeLanguage(code);
    if (inner) return inner;
  }

  return undefined;
}

/**
 * If the range lives inside pre/code, return metadata for code presentation.
 * Does not alter selected text (anchors stay unfenced).
 */
export function detectCodeSelectionMetadata(range: Range): CodeSelectionMeta | undefined {
  try {
    const node = range.commonAncestorContainer;
    const el =
      node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
    if (!el) return undefined;

    const codeHost = el.closest('pre, code');
    if (!codeHost) return undefined;

    // Require non-trivial selection inside the host
    if (!range.toString().trim()) return undefined;

    const language = extractCodeLanguage(codeHost);
    return language ? { sourceKind: 'code', language } : { sourceKind: 'code' };
  } catch {
    return undefined;
  }
}
