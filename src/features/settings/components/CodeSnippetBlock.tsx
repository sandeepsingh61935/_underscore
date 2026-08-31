import React, { useCallback, useId, useState } from 'react';

const srOnlyStyle: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

export interface CodeSnippetBlockProps {
  label: string;
  code: string;
}

export function CodeSnippetBlock({
  label,
  code,
}: CodeSnippetBlockProps): React.ReactElement {
  const [copied, setCopied] = useState(false);
  const copyId = useId();

  const copy = useCallback((): void => {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  return (
    <div style={{ marginTop: 6 }}>
      <div
        className="u-mono"
        style={{
          fontSize: 'var(--step--2)',
          color: 'var(--ink-3)',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          position: 'relative',
          border: '1px solid var(--rule-soft)',
          background: 'var(--paper)',
        }}
      >
        <pre
          className="u-mono"
          style={{
            margin: 0,
            padding: '8px 10px',
            fontSize: 'var(--step--2)',
            color: 'var(--ink-2)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflowX: 'auto',
          }}
        >
          {code}
        </pre>
        <button
          type="button"
          className="u-caps"
          aria-describedby={copyId}
          onClick={copy}
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            padding: '4px 8px',
            fontSize: 'var(--step--2)',
            border: '1px solid var(--rule)',
            background: 'var(--paper-2)',
            color: 'var(--ink-2)',
            cursor: 'pointer',
            minHeight: 28,
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <span id={copyId} style={srOnlyStyle} aria-live="polite">
        {copied ? `${label} copied to clipboard` : ''}
      </span>
    </div>
  );
}
