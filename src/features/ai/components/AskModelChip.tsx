/**
 * Ask composer model chip (Layer B).
 * Switch among configured models; Manage → Settings Models & providers.
 * Presentational — surfaces supply options + handlers.
 */

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';

import type { AskModelOption } from '@/shared/llm/ask-model-options';
import type { ProviderName } from '@/shared/interfaces/i-llm-service';

export interface AskModelChipProps {
  options: ReadonlyArray<AskModelOption>;
  activeProvider: ProviderName | null;
  /** Label on the chip when a model is selected. */
  activeLabel: string;
  onSelect: (provider: ProviderName) => void;
  onManage: () => void;
  /** When no models: primary CTA text. */
  emptyCta?: string;
  manageLabel?: string;
  disabled?: boolean;
  /** Optional select failure message (parent-owned). */
  selectError?: string | null;
  /** Optional test / OD ids. */
  testId?: string;
}

export function AskModelChip({
  options,
  activeProvider,
  activeLabel,
  onSelect,
  onManage,
  emptyCta = 'Add provider',
  manageLabel = 'Manage',
  disabled = false,
  selectError = null,
  testId = 'ask-model-chip',
}: AskModelChipProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const hasOptions = options.length > 0;

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent): void => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const handleToggle = (): void => {
    if (disabled) return;
    if (!hasOptions) {
      onManage();
      return;
    }
    setOpen((v) => !v);
  };

  const handleSelect = (provider: ProviderName): void => {
    onSelect(provider);
    close();
  };

  const chipText = hasOptions ? activeLabel : 'No model';

  const triggerStyle: React.CSSProperties = {
    all: 'unset',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
    maxWidth: '100%',
    fontFamily: 'var(--mono)',
    fontSize: 'var(--step--2)',
    letterSpacing: '0.06em',
    color: 'var(--ink-3)',
    opacity: disabled ? 0.55 : 1,
    boxSizing: 'border-box',
  };

  return (
    <div
      ref={rootRef}
      className="ask-model-chip"
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 4,
      }}
      data-testid={testId}
      data-od-id="ask-model-chip"
    >
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          className="ask-model-chip-trigger u-mono"
          aria-haspopup={hasOptions ? 'listbox' : undefined}
          aria-expanded={hasOptions ? open : undefined}
          aria-controls={hasOptions && open ? listId : undefined}
          disabled={disabled}
          onClick={handleToggle}
          data-testid={`${testId}-trigger`}
          data-od-id="ask-model-trigger"
          style={triggerStyle}
        >
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 220,
            }}
          >
            Model · {chipText}
          </span>
          {hasOptions ? (
            <span aria-hidden="true" style={{ color: 'var(--ink-4)', fontSize: 10 }}>
              {open ? '▴' : '▾'}
            </span>
          ) : null}
        </button>

        {!hasOptions ? (
          <button
            type="button"
            className="btn-text u-mono"
            onClick={onManage}
            disabled={disabled}
            data-testid={`${testId}-empty-cta`}
            data-od-id="ask-model-settings"
            style={{
              all: 'unset',
              cursor: disabled ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--mono)',
              fontSize: 'var(--step--2)',
              letterSpacing: '0.06em',
              color: 'var(--accent)',
              minHeight: 44,
              boxSizing: 'border-box',
            }}
          >
            {emptyCta}
          </button>
        ) : null}
      </div>

      {selectError ? (
        <p
          className="u-mono"
          role="alert"
          data-testid={`${testId}-error`}
          data-od-id="ask-model-error"
          style={{
            margin: 0,
            fontSize: 'var(--step--2)',
            color: 'var(--ink-2)',
            letterSpacing: '0.04em',
          }}
        >
          {selectError}
        </p>
      ) : null}

      {open && hasOptions ? (
        <div
          id={listId}
          role="listbox"
          aria-label="Configured models"
          className="ask-model-menu"
          data-testid={`${testId}-menu`}
          data-od-id="ask-model-menu"
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            marginBottom: 6,
            minWidth: 200,
            maxWidth: 280,
            maxHeight: 220,
            overflowY: 'auto',
            background: 'var(--paper)',
            border: '1px solid var(--rule)',
            zIndex: 40,
            boxSizing: 'border-box',
          }}
        >
          {options.map((opt) => {
            const selected = opt.provider === activeProvider;
            return (
              <button
                key={opt.provider}
                type="button"
                role="option"
                aria-selected={selected}
                data-testid={`${testId}-option-${opt.provider}`}
                onClick={() => handleSelect(opt.provider)}
                style={{
                  all: 'unset',
                  boxSizing: 'border-box',
                  display: 'block',
                  width: '100%',
                  cursor: 'pointer',
                  padding: '10px 12px',
                  minHeight: 44,
                  background: selected ? 'var(--paper-2)' : 'transparent',
                  borderBottom: '1px solid var(--rule-soft)',
                }}
              >
                <div
                  style={{
                    fontSize: 'var(--step--1)',
                    color: 'var(--ink)',
                    fontWeight: selected ? 600 : 500,
                  }}
                >
                  {opt.providerLabel}
                </div>
                <div
                  className="u-mono"
                  style={{
                    fontSize: 'var(--step--2)',
                    color: 'var(--ink-3)',
                    marginTop: 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {opt.modelLabel}
                </div>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              close();
              onManage();
            }}
            data-testid={`${testId}-manage`}
            data-od-id="ask-model-settings"
            style={{
              all: 'unset',
              boxSizing: 'border-box',
              display: 'block',
              width: '100%',
              cursor: 'pointer',
              padding: '10px 12px',
              minHeight: 44,
              fontFamily: 'var(--mono)',
              fontSize: 'var(--step--2)',
              letterSpacing: '0.06em',
              color: 'var(--accent)',
            }}
          >
            {manageLabel} → Models &amp; providers
          </button>
        </div>
      ) : null}
    </div>
  );
}
