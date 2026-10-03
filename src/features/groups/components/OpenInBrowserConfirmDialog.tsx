/**
 * @file OpenInBrowserConfirmDialog.tsx
 * @description Confirmation dialog for opening more than 15 tabs in the browser (Phase 3 Task 3.4).
 */

import React from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/ui-system/components/primitives/AlertDialog';

export interface OpenInBrowserConfirmDialogProps {
  open: boolean;
  tabCount: number;
  isConfirming?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function OpenInBrowserConfirmDialog({
  open,
  tabCount,
  isConfirming = false,
  onClose,
  onConfirm,
}: OpenInBrowserConfirmDialogProps): React.ReactElement {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <AlertDialogContent data-testid="open-in-browser-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Open {tabCount} tabs?</AlertDialogTitle>
          <AlertDialogDescription>
            Opening {tabCount} tabs might slow down your browser. Open anyway?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <button
              type="button"
              data-testid="open-in-browser-cancel"
              onClick={onClose}
              style={{
                minHeight: '44px',
                padding: '0 16px',
                border: '1px solid var(--rule)',
                borderRadius: 'var(--radius)',
                background: 'var(--paper)',
                color: 'var(--ink)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <button
              type="button"
              data-testid="open-in-browser-confirm"
              disabled={isConfirming}
              onClick={onConfirm}
              style={{
                minHeight: '44px',
                padding: '0 16px',
                border: 'none',
                borderRadius: 'var(--radius)',
                background: 'var(--accent)',
                color: 'var(--accent-ink)',
                cursor: isConfirming ? 'wait' : 'pointer',
                opacity: isConfirming ? 0.4 : 1,
              }}
            >
              {isConfirming ? 'Opening…' : `Open ${tabCount} tabs`}
            </button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
