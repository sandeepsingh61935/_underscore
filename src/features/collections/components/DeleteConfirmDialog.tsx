import React from 'react';

import { Dialog } from '@/ui-system/components/primitives/Dialog';

export interface DeleteConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: () => void;
  isConfirming?: boolean;
  /** Optional export actions rendered below the warning (e.g. before bulk delete). */
  exportFooter?: React.ReactNode;
}

const actionButtonBase: React.CSSProperties = {
  flex: 1,
  minHeight: 44,
  font: 'var(--sans)',
  fontSize: 'var(--step--1)',
  padding: '10px 12px',
  cursor: 'pointer',
  boxSizing: 'border-box',
};

/** Single-step destructive confirm (V2 Dialog). */
export function DeleteConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete permanently',
  onClose,
  onConfirm,
  isConfirming = false,
  exportFooter,
}: DeleteConfirmDialogProps): React.ReactElement {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      hideCloseButton
      actions={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isConfirming}
            style={{
              ...actionButtonBase,
              border: '1px solid var(--rule)',
              background: 'var(--paper)',
              color: 'var(--ink)',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            style={{
              ...actionButtonBase,
              border: '1px solid var(--accent)',
              background: 'var(--accent)',
              color: 'var(--paper)',
              cursor: isConfirming ? 'wait' : 'pointer',
            }}
          >
            {isConfirming ? 'Deleting…' : confirmLabel}
          </button>
        </>
      }
    >
      <p
        style={{
          font: 'var(--sans)',
          fontSize: 'var(--step--1)',
          lineHeight: 1.45,
          color: 'var(--ink-2)',
          margin: 0,
        }}
      >
        {message}
      </p>
      {exportFooter && (
        <div
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: '1px solid var(--rule-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <span className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)' }}>
            Export first
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {exportFooter}
          </div>
        </div>
      )}
    </Dialog>
  );
}
