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
  className?: string;
  align?: 'left' | 'right';
};

export function LibrarySortControl({
  value,
  onChange,
  fullWidth = false,
  variant,
  className,
  align = 'left',
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
      className={className}
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
          gap: 6,
          justifyContent: isText ? undefined : 'space-between',
          width: isText ? undefined : '100%',
          boxSizing: 'border-box',
          minHeight: isText ? 28 : 32,
          padding: isText ? '2px 8px' : '0 10px',
          borderRadius: 'var(--r-sm, 6px)',
          border: isText ? '1px solid transparent' : '1px solid var(--rule-soft)',
          fontSize: 'var(--step--2)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--ink-3)',
          background: 'transparent',
          transition: 'all 0.15s ease',
        }}
      >
        <span>{label}</span>
        <span
          aria-hidden="true"
          style={{
            color: 'var(--ink-4)',
            display: 'inline-block',
            transition: 'transform 0.15s ease',
            transform: open ? 'rotate(180deg)' : 'none',
          }}
        >
          ▾
        </span>
      </button>
      {open ? (
        <div
          role="menu"
          style={{
            position: 'absolute',
            left: align === 'right' ? 'auto' : 0,
            right: align === 'right' ? 0 : 'auto',
            top: 'calc(100% + 4px)',
            zIndex: 20,
            minWidth: 150,
            maxWidth: 'calc(100vw - 32px)',
            padding: 4,
            border: '1px solid var(--rule-soft, var(--border))',
            borderRadius: 'var(--r-sm, 8px)',
            background: 'var(--paper)',
            boxShadow:
              'var(--shadow-md, 0 8px 24px color-mix(in srgb, var(--ink) 12%, transparent))',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                boxSizing: 'border-box',
                padding: '8px 10px',
                borderRadius: 'var(--r-sm, 6px)',
                fontSize: 'var(--step--2)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: k === value ? 'var(--ink)' : 'var(--ink-2)',
                fontWeight: k === value ? 600 : 400,
                background: k === value ? 'var(--paper-2)' : 'transparent',
                transition: 'background 0.12s ease, color 0.12s ease',
              }}
            >
              <span>{LIBRARY_SORT_LABELS[k]}</span>
              {k === value ? (
                <span
                  aria-hidden="true"
                  style={{
                    color: 'var(--accent)',
                    fontSize: '11px',
                    marginLeft: 8,
                  }}
                >
                  ✓
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
