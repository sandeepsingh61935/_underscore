/**
 * Library list sort — boxed (legacy) or quiet mono text (ledger chrome).
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
  /** @deprecated Prefer variant="text" for section/domain chrome */
  fullWidth?: boolean;
  /** text = mono Newest ▾ (no slab); boxed = bordered control */
  variant?: 'text' | 'boxed';
};

export function LibrarySortControl({
  value,
  onChange,
  fullWidth = false,
  variant,
}: LibrarySortControlProps): React.ReactElement {
  const mode = variant ?? (fullWidth ? 'boxed' : 'text');
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

  const label = LIBRARY_SORT_LABELS[value];
  const isText = mode === 'text';

  return (
    <div
      ref={ref}
      data-testid="library-sort"
      style={{ position: 'relative', width: isText ? undefined : '100%' }}
    >
      <button
        type="button"
        className="u-mono"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Sort by ${label}`}
        onClick={() => setOpen((v) => !v)}
        style={{
          all: 'unset',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          justifyContent: isText ? undefined : 'space-between',
          width: isText ? undefined : '100%',
          boxSizing: 'border-box',
          minHeight: isText ? 28 : 32,
          padding: isText ? '0 2px' : '0 10px',
          border: isText ? 'none' : '1px solid var(--rule-soft)',
          fontSize: 'var(--step--2)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--ink-3)',
          background: 'transparent',
        }}
      >
        <span>{label}</span>
        <span aria-hidden style={{ color: 'var(--ink-4)' }}>
          ▾
        </span>
      </button>
      {open ? (
        <div
          role="menu"
          style={{
            position: 'absolute',
            left: 0,
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
