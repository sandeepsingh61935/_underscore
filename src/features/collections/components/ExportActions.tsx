import { Download } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import {
  useHighlightExport,
  type ExportViewScope,
} from '@/features/collections/hooks/useHighlightExport';
import type { ExportFormat } from '@/shared/highlight-export';
import { BtnText } from '@/ui-system/components/primitives/BtnText';
import { Spinner } from '@/ui-system/components/primitives/Spinner';

export type { ExportViewScope };

export interface ExportActionsProps {
  scope: ExportViewScope;
  disabled?: boolean;
  highlightCount?: number;
  /**
   * `menu` — single Export text control.
   * `icon` — single Download icon control (space-saving for headers/toolbars).
   * `inline` — MD | XLSX chips (settings/dialogs).
   */
  variant?: 'menu' | 'inline' | 'icon';
}

const FORMATS: { id: ExportFormat; label: string; aria: string }[] = [
  { id: 'md', label: 'Markdown', aria: 'Markdown' },
  { id: 'xlsx', label: 'XLSX', aria: 'Spreadsheet' },
];

function scopeLabel(scope: ExportViewScope): string {
  switch (scope.kind) {
    case 'library':
      return 'library';
    case 'domain':
      return 'domain';
    case 'section':
      return 'section';
  }
}

export function ExportActions({
  scope,
  disabled = false,
  highlightCount,
  variant = 'menu',
}: ExportActionsProps): React.ReactElement | null {
  const hasHighlights = highlightCount === undefined || highlightCount > 0;
  const { exportFile, isBusy } = useHighlightExport(scope, {
    enabled: hasHighlights && !disabled,
  });
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

  if (!hasHighlights) {
    return null;
  }

  const label = scopeLabel(scope);
  const isDisabled = disabled || isBusy;

  if (variant === 'inline') {
    return (
      <div className="export-inline" data-testid="export-actions">
        {isBusy ? (
          <span
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            aria-live="polite"
            aria-busy="true"
          >
            <Spinner size="sm" />
          </span>
        ) : null}
        {FORMATS.map((format) => (
          <BtnText
            key={format.id}
            muted={isDisabled}
            disabled={isDisabled}
            aria-label={`Export ${label} as ${format.aria}`}
            onClick={() => {
              void exportFile(format.id);
            }}
          >
            {format.id === 'md' ? 'MD' : 'XLSX'}
          </BtnText>
        ))}
      </div>
    );
  }

  const isIcon = variant === 'icon';

  return (
    <div
      ref={ref}
      className="export-menu"
      data-testid="export-actions"
      style={{ position: 'relative', flexShrink: 0 }}
    >
      {isIcon ? (
        <button
          type="button"
          className="sr-icon"
          data-testid="export-menu-trigger"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`Export ${label}`}
          title={`Export ${label}`}
          disabled={isDisabled}
          onClick={() => setOpen((v) => !v)}
          style={{
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            opacity: isDisabled ? 0.4 : 1,
          }}
        >
          {isBusy ? <Spinner size="sm" /> : <Download size={16} aria-hidden="true" />}
        </button>
      ) : (
        <button
          type="button"
          className="u-mono"
          data-testid="export-menu-trigger"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`Export ${label}`}
          disabled={isDisabled}
          onClick={() => setOpen((v) => !v)}
          style={{
            all: 'unset',
            cursor: isDisabled ? 'default' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            minHeight: 32,
            padding: '0 10px',
            border: '1px solid var(--rule-soft)',
            borderRadius: 'var(--radius)',
            fontSize: 'var(--step--2)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: isDisabled ? 'var(--ink-4)' : 'var(--ink-2)',
            background: 'var(--paper)',
            boxSizing: 'border-box',
          }}
        >
          {isBusy ? <Spinner size="sm" /> : null}
          Export
          <span aria-hidden style={{ color: 'var(--ink-4)' }}>
            ▾
          </span>
        </button>
      )}
      {open && !isBusy ? (
        <div
          role="menu"
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            marginTop: 4,
            zIndex: 30,
            minWidth: 140,
            padding: 4,
            border: '1px solid var(--rule-soft)',
            borderRadius: 'var(--radius)',
            background: 'var(--paper)',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {FORMATS.map((format) => (
            <button
              key={format.id}
              type="button"
              role="menuitem"
              className="u-mono export-menu-item"
              onClick={() => {
                setOpen(false);
                void exportFile(format.id);
              }}
              style={{
                all: 'unset',
                cursor: 'pointer',
                display: 'block',
                width: '100%',
                boxSizing: 'border-box',
                padding: '8px 10px',
                borderRadius: 'var(--radius)',
                fontSize: 'var(--step--2)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--ink-2)',
                transition: 'background 120ms ease, color 120ms ease',
              }}
            >
              {format.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
