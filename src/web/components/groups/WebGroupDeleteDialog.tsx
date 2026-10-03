/**
 * @file WebGroupDeleteDialog.tsx
 * @description Web delete confirmation for a page group, built on the
 * AlertDialog primitive. Copy matches the popup dialog
 * (`deleteGroupDialogCopy`): highlights stay in the Library. The web never
 * closes tabs, so there is no close-tabs affordance here.
 */

import React from 'react';

import { deleteGroupDialogCopy } from '@/features/groups/components/DeleteGroupDialog';
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

export interface WebGroupDeleteDialogProps {
  open: boolean;
  groupName: string;
  itemCount: number;
  isLiveOnThisDevice?: boolean;
  isConfirming?: boolean;
  onClose: () => void;
  onConfirm: (closeTabs?: boolean) => void;
}

export function WebGroupDeleteDialog({
  open,
  groupName,
  itemCount,
  isLiveOnThisDevice = false,
  isConfirming = false,
  onClose,
  onConfirm,
}: WebGroupDeleteDialogProps): React.ReactElement {
  const [closeTabs, setCloseTabs] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setCloseTabs(false);
    }
  }, [open]);

  const copy = deleteGroupDialogCopy(groupName, itemCount);
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <AlertDialogContent data-testid="web-group-delete-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {copy.message}
            {isLiveOnThisDevice ? (
              <span style={{ display: 'block', marginTop: 10 }}>
                <span
                  style={{
                    display: 'block',
                    marginBottom: 8,
                    color: 'var(--ink-2)',
                  }}
                >
                  Its {itemCount} tabs will stay open and become ungrouped.
                </span>
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    userSelect: 'none',
                    color: 'var(--ink)',
                  }}
                >
                  <input
                    type="checkbox"
                    data-testid="web-group-delete-close-tabs"
                    checked={closeTabs}
                    onChange={(e) => setCloseTabs(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  Also close these tabs in the browser
                </label>
              </span>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <button
              type="button"
              data-testid="web-group-delete-cancel"
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
              data-testid="web-group-delete-confirm"
              disabled={isConfirming}
              onClick={() => onConfirm(closeTabs)}
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
              {isConfirming ? 'Deleting…' : 'Delete group'}
            </button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
