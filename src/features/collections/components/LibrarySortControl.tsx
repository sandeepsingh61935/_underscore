/**
 * Compact sort control for popup library lists (web parity keys).
 */
import React, { useEffect, useRef, useState } from 'react';

import {
  LIBRARY_SORT_KEYS,
  LIBRARY_SORT_LABELS,
  type LibrarySortKey,
} from '@/shared/library/library-sort';

export type LibrarySortControlProps = {
  value: LibrarySortKey;
  onChange: (next: LibrarySortKey) => void;
};

export function LibrarySortControl({
  value,
  onChange,
}: LibrarySortControlProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent): void => {
      const t = e.target as Node;
      if (ref.current && !ref.current.contains(t)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={ref} data-testid="library-sort" style={{ position: 'relative' }}>
      <button
        type="button"
        className="u-mono"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          all: 'unset',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          minHeight: 28,
          padding: '0 8px',
          border: '1px solid var(--rule-soft)',
          fontSize: 'var(--step--2)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--ink-2)',
          background: 'var(--paper)',
        }}
      >
        Sort: {LIBRARY_SORT_LABELS[value]}
      </button>
      {open ? (
        <div
          role="menu"
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            marginTop: 4,
            zIndex: 20,
            minWidth: 140,
            border: '1px solid var(--rule)',
            background: 'var(--paper)',
            boxShadow: '0 8px 24px color-mix(in srgb, var(--ink) 12%, transparent)',
          }}
        >
          {LIBRARY_SORT_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              role="menuitem"
              className="u-mono"
              onClick={() => {
                onChange(k);
                setOpen(false);
              }}
              style={{
                all: 'unset',
                cursor: 'pointer',
                display: 'block',
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px',
                fontSize: 'var(--step--2)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: k === value ? 'var(--accent)' : 'var(--ink-2)',
                background: k === value ? 'var(--paper-2)' : 'transparent',
              }}
            >
              {LIBRARY_SORT_LABELS[k]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
