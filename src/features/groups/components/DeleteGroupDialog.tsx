/**
 * @file DeleteGroupDialog.tsx
 * @description Delete confirmation for a page group. Copy reflects the
 * group's live state: item count drives the message. Highlights always stay
 * in the Library. (Live-tab "tabs stay open" copy + close-tabs checkbox
 * arrive with browser sync in Phase 3.)
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

export interface DeleteGroupDialogProps {
  open: boolean;
  groupName: string;
  itemCount: number;
  isLiveOnThisDevice?: boolean;
  isConfirming?: boolean;
  onClose: () => void;
  onConfirm: (closeTabs?: boolean) => void;
}

export function deleteGroupDialogCopy(groupName: string, itemCount: number): {
  title: string;
  message: string;
} {
  const title = `Delete "${groupName}"?`;
  const message =
    itemCount === 0
      ? 'This removes the empty group. Your highlights stay in the Library.'
      : itemCount === 1
        ? 'This removes the group and its 1 item. Your highlights stay in the Library.'
        : `This removes the group and its ${itemCount} items. Your highlights stay in the Library.`;
  return { title, message };
}

export function DeleteGroupDialog({
  open,
  groupName,
  itemCount,
  isLiveOnThisDevice = false,
  isConfirming = false,
  onClose,
  onConfirm,
}: DeleteGroupDialogProps): React.ReactElement {
  const [closeTabs, setCloseTabs] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setCloseTabs(false);
    }
  }, [open]);

  const copy = deleteGroupDialogCopy(groupName, itemCount);
  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <AlertDialogContent data-testid="delete-group-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {copy.message}
            {isLiveOnThisDevice && (
              <span style={{ display: 'block', marginTop: 10 }}>
                <span
                  style={{
                    display: 'block',
                    marginBottom: 8,
                    color: 'var(--ink-2)',
                  }}
                >
                  Its {itemCount} tabs stay open and are ungrouped.
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
                    data-testid="delete-group-close-tabs"
                    checked={closeTabs}
                    onChange={(e) => setCloseTabs(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  Also close the tabs
                </label>
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <button
              type="button"
              data-testid="delete-group-cancel"
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
              data-testid="delete-group-confirm"
              disabled={isConfirming}
              onClick={() => onConfirm(isLiveOnThisDevice ? closeTabs : undefined)}
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
