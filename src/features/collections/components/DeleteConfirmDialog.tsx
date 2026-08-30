import React, { useEffect, useId, useMemo, useState } from 'react';

import type { ConfirmSeverity } from '@/shared/utils/confirm-dialog-copy';
import { Dialog } from '@/ui-system/components/primitives/Dialog';

export interface DeleteConfirmDialogProps {
  open: boolean;
  title: string;
  /** Primary warning (object + impact). */
  message: string;
  /** Secondary note under the warn line. */
  note?: string;
  /** Substrings of `message` to emphasize with <strong>. */
  strongNames?: string[];
  severity?: ConfirmSeverity;
  confirmLabel?: string;
  cancelLabel?: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  isConfirming?: boolean;
  /** Optional export actions rendered below the warning (e.g. before bulk delete). */
  exportFooter?: React.ReactNode;
  /**
   * When set, confirm stays disabled until the user types this exact string
   * (case-sensitive). Used for bulk library wipe.
   */
  confirmText?: string;
}

const actionButtonBase: React.CSSProperties = {
  flex: 1,
  minHeight: 44,
  fontFamily: 'var(--sans)',
  fontSize: 'var(--step--1)',
  padding: '10px 12px',
  cursor: 'pointer',
  boxSizing: 'border-box',
};

function emphasizeNames(message: string, strongNames: string[]): React.ReactNode {
  if (!strongNames.length) return message;

  const parts: React.ReactNode[] = [];
  let rest = message;
  strongNames.forEach((name, i) => {
    if (!name) return;
    const idx = rest.indexOf(name);
    if (idx === -1) return;
    if (idx > 0) parts.push(rest.slice(0, idx));
    parts.push(
      <strong
        key={`${name}-${i}`}
        style={{ fontWeight: 600, color: 'var(--ink)', wordBreak: 'break-word' }}
      >
        {name}
      </strong>,
    );
    rest = rest.slice(idx + name.length);
  });
  if (rest) parts.push(rest);
  return parts.length ? parts : message;
}

/** Single-step danger / caution confirm (V3 Dialog parity). */
export function DeleteConfirmDialog({
  open,
  title,
  message,
  note,
  strongNames = [],
  severity = 'danger',
  confirmLabel = 'Delete permanently',
  cancelLabel = 'Cancel',
  onClose,
  onConfirm,
  isConfirming = false,
  exportFooter,
  confirmText,
}: DeleteConfirmDialogProps): React.ReactElement {
  const isDanger = severity === 'danger';
  const defaultNote = isDanger ? 'This action cannot be undone.' : undefined;
  const resolvedNote = note ?? defaultNote;
  const challengeId = useId();
  const [challenge, setChallenge] = useState('');

  useEffect(() => {
    if (open) setChallenge('');
  }, [open, confirmText]);

  const challengeOk = !confirmText || challenge === confirmText;

  const warnNode = useMemo(
    () => emphasizeNames(message, strongNames),
    [message, strongNames],
  );

  const handleClose = (): void => {
    if (isConfirming) return;
    onClose();
  };

  const handleConfirm = (): void => {
    // Ignore re-entry while parent reports busy (double-click / late events).
    if (isConfirming || !challengeOk) return;
    void onConfirm();
  };

  const confirmStyle: React.CSSProperties = isDanger
    ? {
        ...actionButtonBase,
        border: '1px solid color-mix(in oklch, var(--ttl-expired) 45%, var(--rule))',
        background: 'var(--paper)',
        color: 'var(--ttl-expired)',
        fontWeight: 500,
        cursor: isConfirming ? 'wait' : 'pointer',
        opacity: isConfirming ? 0.5 : 1,
      }
    : {
        ...actionButtonBase,
        border: '1px solid var(--accent)',
        background: 'var(--accent)',
        color: 'var(--paper)',
        cursor: isConfirming ? 'wait' : 'pointer',
        opacity: isConfirming ? 0.5 : 1,
      };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={title}
      hideCloseButton
      actions={
        <>
          <button
            type="button"
            onClick={handleClose}
            disabled={isConfirming}
            data-testid="confirm-dialog-cancel"
            style={{
              ...actionButtonBase,
              border: '1px solid var(--rule)',
              background: 'var(--paper)',
              color: 'var(--ink)',
              opacity: isConfirming ? 0.5 : 1,
              cursor: isConfirming ? 'wait' : 'pointer',
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirming || !challengeOk}
            data-testid="confirm-dialog-confirm"
            data-severity={severity}
            style={{
              ...confirmStyle,
              opacity: isConfirming || !challengeOk ? 0.5 : 1,
              cursor: isConfirming ? 'wait' : challengeOk ? 'pointer' : 'not-allowed',
            }}
          >
            {isConfirming ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      <p
        data-testid="confirm-dialog-message"
        style={{
          fontFamily: 'var(--sans)',
          fontSize: 'var(--step--1)',
          lineHeight: 1.45,
          color: 'var(--ink-2)',
          margin: 0,
        }}
      >
        {warnNode}
      </p>
      {confirmText ? (
        <div
          data-testid="confirm-dialog-challenge-wrap"
          style={{ marginTop: 14 }}
        >
          <label
            htmlFor={challengeId}
            className="u-mono"
            style={{
              display: 'block',
              fontSize: 'var(--step--2)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--ink-3)',
              marginBottom: 6,
            }}
          >
            Type {confirmText} to confirm
          </label>
          <input
            id={challengeId}
            data-testid="confirm-dialog-challenge"
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={challenge}
            disabled={isConfirming}
            onChange={(e) => setChallenge(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && challengeOk && !isConfirming) {
                e.preventDefault();
                handleConfirm();
              }
            }}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              minHeight: 40,
              padding: '8px 10px',
              fontFamily: 'var(--mono)',
              fontSize: 'var(--step--1)',
              letterSpacing: '0.06em',
              color: 'var(--ink)',
              background: 'var(--paper-2)',
              border: '1px solid var(--rule-soft)',
              borderRadius: 6,
            }}
          />
        </div>
      ) : null}
      {resolvedNote ? (
        <p
          data-testid="confirm-dialog-note"
          className="u-mono"
          style={{
            margin: '8px 0 0',
            fontSize: 'var(--step--2)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: isDanger ? 'var(--ttl-expired)' : 'var(--ink-3)',
            lineHeight: 1.4,
          }}
        >
          {resolvedNote}
        </p>
      ) : null}
      {exportFooter ? (
        <div
          data-testid="confirm-dialog-export"
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
      ) : null}
    </Dialog>
  );
}
