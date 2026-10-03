/**
 * @file UploadFromDeviceDialog.tsx
 * @description Blocking confirm after sign-in when Guest rows are not in the account.
 */

import React from 'react';

import { Dialog } from '@/ui-system/components/primitives/Dialog';

export interface UploadFromDeviceDialogProps {
  open: boolean;
  email: string | null;
  pendingCount: number;
  pendingGroupCount?: number;
  pendingGroupItemCount?: number;
  isUploading: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

const actionButtonStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 44,
  fontFamily: 'var(--sans)',
  fontSize: 'var(--step--1)',
  padding: '10px 12px',
  cursor: 'pointer',
  boxSizing: 'border-box',
  background: 'transparent',
};

export function UploadFromDeviceDialog({
  open,
  email,
  pendingCount,
  pendingGroupCount,
  pendingGroupItemCount,
  isUploading,
  error,
  onClose,
  onConfirm,
}: UploadFromDeviceDialogProps): React.ReactElement {
  const account = email ?? 'this account';
  const gCount = pendingGroupCount ?? 0;
  const iCount = pendingGroupItemCount ?? 0;

  let message: string;
  if (pendingCount > 0 && gCount > 0) {
    const hNoun = pendingCount === 1 ? 'highlight' : 'highlights';
    const gNoun = gCount === 1 ? 'group' : 'groups';
    const iNoun = iCount === 1 ? 'item' : 'items';
    message = `This device has ${pendingCount} guest ${hNoun} and ${gCount} ${gNoun} (${iCount} ${iNoun}) not in ${account}. Add them to this account?`;
  } else if (gCount > 0) {
    const gNoun = gCount === 1 ? 'group' : 'groups';
    const iNoun = iCount === 1 ? 'item' : 'items';
    message = `This device has ${gCount} guest ${gNoun} (${iCount} ${iNoun}) not in ${account}. Add them to this account?`;
  } else {
    const noun = pendingCount === 1 ? 'highlight' : 'highlights';
    message = `This device has ${pendingCount} guest ${noun} not in ${account}. Add them to this account?`;
  }

  const canConfirm = pendingCount > 0 || gCount > 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Upload from this device?"
      hideCloseButton={false}
      actions={
        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
          <button
            type="button"
            className="btn ghost"
            style={{ ...actionButtonStyle, border: '1px solid var(--rule)' }}
            onClick={onClose}
            disabled={isUploading}
            data-testid="device-upload-not-now"
          >
            Not now
          </button>
          <button
            type="button"
            className="btn"
            style={{
              ...actionButtonStyle,
              border: '1px solid var(--ink)',
              background: 'var(--ink)',
              color: 'var(--paper)',
            }}
            onClick={onConfirm}
            disabled={isUploading || !canConfirm}
            data-testid="device-upload-confirm"
          >
            {isUploading ? 'Uploading…' : 'Add'}
          </button>
        </div>
      }
    >
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--sans)',
          fontSize: 'var(--step-0)',
          color: 'var(--ink-2)',
          lineHeight: 1.45,
        }}
      >
        {message}
      </p>
      {error ? (
        <p
          style={{
            margin: '12px 0 0',
            fontFamily: 'var(--sans)',
            fontSize: 'var(--step--1)',
            color: 'var(--ink)',
          }}
        >
          {error}
        </p>
      ) : null}
    </Dialog>
  );
}
