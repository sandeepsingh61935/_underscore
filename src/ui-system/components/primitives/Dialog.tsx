/**
 * V2 Dialog — modal overlay for popup + web.
 * Pure inline styles (no Tailwind). Portals to document.body so it covers PopupShell.
 */

import { X } from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  hideCloseButton?: boolean;
  className?: string;
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 9998,
  background: 'color-mix(in srgb, var(--ink) 32%, transparent)',
};

const centerStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  boxSizing: 'border-box',
  pointerEvents: 'none',
};

const panelStyle: React.CSSProperties = {
  pointerEvents: 'auto',
  width: '100%',
  maxWidth: 340,
  maxHeight: 'min(520px, 88vh)',
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--paper)',
  color: 'var(--ink)',
  border: '1px solid var(--rule)',
  boxSizing: 'border-box',
};

export function Dialog({
  open,
  onClose,
  title,
  children,
  actions,
  hideCloseButton = false,
}: DialogProps): React.ReactNode {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && open) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !dialogRef.current) return;
    const focusable = dialogRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0] as HTMLElement | undefined;
    const last = focusable[focusable.length - 1] as HTMLElement | undefined;
    const handleTab = (e: KeyboardEvent): void => {
      if (e.key !== 'Tab' || !first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleTab);
    first?.focus();
    return () => document.removeEventListener('keydown', handleTab);
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <>
      <div style={overlayStyle} onClick={onClose} aria-hidden="true" />
      <div style={centerStyle}>
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'dialog-title' : undefined}
          style={panelStyle}
          onClick={(e) => e.stopPropagation()}
        >
          {(title || !hideCloseButton) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
                padding: '16px 16px 0',
                flexShrink: 0,
              }}
            >
              {title && (
                <h2
                  id="dialog-title"
                  className="u-serif"
                  style={{
                    margin: 0,
                    flex: 1,
                    fontSize: 'var(--step-1)',
                    lineHeight: 1.3,
                    letterSpacing: '-0.01em',
                    color: 'var(--ink)',
                  }}
                >
                  {title}
                </h2>
              )}
              {!hideCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close dialog"
                  data-testid="dialog-close"
                  style={{
                    flexShrink: 0,
                    width: 44,
                    height: 44,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--ink-3)',
                    cursor: 'pointer',
                    padding: 0,
                    borderRadius: 'var(--radius)',
                  }}
                >
                  <X size={20} strokeWidth={1.75} />
                </button>
              )}
            </div>
          )}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px 16px 16px',
              color: 'var(--ink-2)',
              fontSize: 'var(--step-0)',
              minHeight: 0,
            }}
          >
            {children}
          </div>
          {actions && (
            <div
              style={{
                display: 'flex',
                alignItems: 'stretch',
                gap: 8,
                padding: '12px 16px 16px',
                borderTop: '1px solid var(--rule-soft)',
                flexShrink: 0,
              }}
            >
              {actions}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}

Dialog.displayName = 'Dialog';
