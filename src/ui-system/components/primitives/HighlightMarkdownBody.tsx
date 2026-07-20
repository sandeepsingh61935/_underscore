/**
 * Wireframe: ui_kits/extension/v2/primitives.jsx (HighlightCard markdown body)
 * Renders highlight `text` as a restricted CommonMark-ish subset.
 * Code fences: mono panel + lang label + Copy (inner only).
 * @see docs/superpowers/specs/2026-07-14-highlight-markdown-body-design.md
 * @see docs/superpowers/specs/2026-07-14-highlight-tile-editor-density-prd.md
 */
import React, { useState } from 'react';
import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';

import {
  applyPresentationToDisplaySource,
  resolveHighlightPresentation,
  type HighlightPresentation,
} from '@/shared/utils/highlight-presentation';

export const HIGHLIGHT_MARKDOWN_ALLOWED_ELEMENTS = [
  'p',
  'br',
  'strong',
  'em',
  'code',
  'pre',
  'ul',
  'ol',
  'li',
  'a',
] as const;

/** Approximate height of ~4 serif lines at 14px / 1.5. */
export const HIGHLIGHT_QUOTE_CLAMP_PX = Math.round(4 * 14 * 1.5);

/** Content heuristic when layout metrics are unavailable (e.g. jsdom). */
export function estimateHighlightNeedsClamp(source: string): boolean {
  if (source.length > 220) return true;
  if (source.split('\n').length > 4) return true;
  if (source.split(/\n\n+/).filter((p) => p.trim().length > 0).length > 2) return true;
  return false;
}

function CodeBlockChrome({
  lang,
  code,
}: {
  lang: string;
  code: string;
}): React.ReactElement {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable in tests / restricted contexts.
    }
  };

  return (
    <div
      data-testid="highlight-code-chrome"
      style={{
        margin: 0,
        border: '1px solid var(--rule-soft)',
        borderRadius: 'var(--radius)',
        background: 'var(--paper-2)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '4px 8px',
          borderBottom: '1px solid var(--rule-soft)',
          background: 'var(--paper)',
        }}
      >
        <span
          className="u-mono"
          style={{
            fontSize: 9,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--ink-3)',
          }}
        >
          {lang || 'code'}
        </span>
        <button
          type="button"
          onClick={(e) => { void handleCopy(e); }}
          className="u-mono"
          aria-label="Copy code block"
          style={{
            all: 'unset',
            cursor: 'pointer',
            fontSize: 10,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            padding: '4px 2px',
            lineHeight: 1,
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre
        style={{
          margin: 0,
          padding: '8px 10px',
          fontFamily: 'var(--mono)',
          fontSize: 12,
          lineHeight: 1.45,
          whiteSpace: 'pre-wrap',
          overflowX: 'auto',
          color: 'var(--ink)',
        }}
      >
        <code className="u-mono" style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--ink)' }}>
          {code}
        </code>
      </pre>
    </div>
  );
}

function extractFenceLang(className: string | undefined): string {
  if (!className) return '';
  const match = /language-([\w+-]+)/.exec(className);
  return match?.[1] ?? '';
}

const markdownComponents: Components = {
  p: ({ children }) => (
    <p
      className="u-serif"
      style={{
        margin: 0,
        fontSize: 14,
        lineHeight: 1.5,
        color: 'var(--ink)',
      }}
    >
      {children}
    </p>
  ),
  strong: ({ children }) => (
    <strong style={{ fontWeight: 600, color: 'var(--ink)' }}>{children}</strong>
  ),
  em: ({ children }) => (
    <em style={{ fontStyle: 'italic', color: 'var(--ink)' }}>{children}</em>
  ),
  code: ({ className, children }) => {
    const isBlock = Boolean(className?.includes('language-')) || String(children).includes('\n');
    if (isBlock) {
      // Block code is rendered via `pre` → CodeBlockChrome; keep fallback plain.
      return (
        <code
          className="u-mono"
          style={{
            display: 'block',
            whiteSpace: 'pre-wrap',
            fontSize: 12,
            lineHeight: 1.45,
            color: 'var(--ink)',
          }}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        className="u-mono"
        style={{
          fontSize: '0.92em',
          padding: '0 3px',
          color: 'var(--ink)',
          background: 'var(--paper-2)',
          border: '1px solid var(--rule-soft)',
        }}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => {
    // react-markdown nests <code class="language-x"> inside <pre>
    let lang = '';
    let code = '';
    React.Children.forEach(children, (child) => {
      if (React.isValidElement<{ className?: string; children?: React.ReactNode }>(child)) {
        lang = extractFenceLang(child.props.className);
        const raw = child.props.children;
        code = String(Array.isArray(raw) ? raw.join('') : (raw ?? '')).replace(/\n$/, '');
      }
    });
    if (code.length > 0 || lang) {
      return <CodeBlockChrome lang={lang} code={code} />;
    }
    return (
      <pre
        style={{
          margin: 0,
          padding: '8px 10px',
          background: 'var(--paper-2)',
          border: '1px solid var(--rule-soft)',
          overflowX: 'auto',
        }}
      >
        {children}
      </pre>
    );
  },
  ul: ({ children }) => (
    <ul
      className="u-serif"
      style={{
        margin: 0,
        paddingLeft: 18,
        fontSize: 14,
        lineHeight: 1.5,
        color: 'var(--ink)',
      }}
    >
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol
      className="u-serif"
      style={{
        margin: 0,
        paddingLeft: 18,
        fontSize: 14,
        lineHeight: 1.5,
        color: 'var(--ink)',
      }}
    >
      {children}
    </ol>
  ),
  li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
  a: ({ href, children }) => {
    if (!href || !href.startsWith('https:')) {
      return <span style={{ color: 'var(--ink)' }}>{children}</span>;
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: 'var(--accent)', textDecoration: 'underline' }}
      >
        {children}
      </a>
    );
  },
};

export interface HighlightMarkdownBodyProps {
  source: string;
  /** When true, collapse tall content behind Show more / Show less. */
  clamp?: boolean;
  /**
   * Capture hint: page code block. Prefer `presentation` when set.
   */
  sourceKind?: 'code';
  language?: string;
  /** User presentation (app only; does not mutate quote text). */
  presentation?: HighlightPresentation | null;
}

export function HighlightMarkdownBody({
  source,
  clamp = false,
  sourceKind,
  language,
  presentation,
}: HighlightMarkdownBodyProps): React.ReactElement {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const measureRef = React.useRef<HTMLDivElement | null>(null);

  const resolved = resolveHighlightPresentation({
    sourceKind,
    language,
    presentation,
  });
  const displaySource = applyPresentationToDisplaySource(source, resolved);

  React.useLayoutEffect(() => {
    if (!clamp) {
      setOverflows(false);
      return;
    }
    const el = measureRef.current;
    if (!el) {
      setOverflows(estimateHighlightNeedsClamp(source));
      return;
    }
    const measured = el.scrollHeight > HIGHLIGHT_QUOTE_CLAMP_PX + 1;
    // jsdom often ignores max-height (scrollHeight === clientHeight); fall back to content size.
    const layoutUnreliable =
      el.scrollHeight <= el.clientHeight + 1 && estimateHighlightNeedsClamp(displaySource);
    setOverflows(measured || layoutUnreliable);
  }, [displaySource, clamp, expanded]);

  const showToggle = clamp && overflows;

  return (
    <div>
      <div
        ref={measureRef}
        className="highlight-md-body"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          ...(clamp && !expanded
            ? {
                maxHeight: HIGHLIGHT_QUOTE_CLAMP_PX,
                overflow: 'hidden',
              }
            : {}),
        }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkBreaks]}
          allowedElements={[...HIGHLIGHT_MARKDOWN_ALLOWED_ELEMENTS]}
          unwrapDisallowed
          components={markdownComponents}
        >
          {displaySource}
        </ReactMarkdown>
      </div>
      {showToggle && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          className="u-mono"
          aria-expanded={expanded}
          style={{
            all: 'unset',
            cursor: 'pointer',
            fontSize: 10,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            marginTop: 4,
            padding: '6px 0',
            lineHeight: 1,
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}
