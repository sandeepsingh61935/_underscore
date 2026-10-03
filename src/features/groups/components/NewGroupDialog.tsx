/**
 * @file NewGroupDialog.tsx
 * @description Name-and-color dialog for creating (and renaming) a group.
 * Uses the ColorSwatchPicker radio group from Task 1.6. Names are 1–80
 * chars per the data contract.
 */

import React, { useEffect, useState } from 'react';

import type { GroupColor } from '@/shared/types/page-group';
import { ColorSwatchPicker } from '@/ui-system/components/primitives/ColorSwatch';
import { Dialog } from '@/ui-system/components/primitives/Dialog';
import { Input } from '@/ui-system/components/primitives/Input';

export interface NewGroupDialogProps {
  open: boolean;
  title?: string;
  confirmLabel?: string;
  initialName?: string;
  initialColor?: GroupColor;
  /** When true, only the color picker renders (detail header Color action). */
  colorOnly?: boolean;
  isConfirming?: boolean;
  onClose: () => void;
  onConfirm: (name: string, color: GroupColor) => void;
}

export function NewGroupDialog({
  open,
  title = 'New group',
  confirmLabel = 'Create group',
  initialName = '',
  initialColor = 'blue',
  colorOnly = false,
  isConfirming = false,
  onClose,
  onConfirm,
}: NewGroupDialogProps): React.ReactElement {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState<GroupColor>(initialColor);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setColor(initialColor);
    }
  }, [open, initialName, initialColor]);

  const trimmed = name.trim();
  const valid = colorOnly || (trimmed.length >= 1 && trimmed.length <= 80);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      actions={
        <>
          <button
            type="button"
            data-testid="new-group-cancel"
            onClick={onClose}
            style={{
              flex: 1,
              minHeight: '44px',
              padding: '0 16px',
              border: '1px solid var(--rule)',
              borderRadius: 'var(--radius)',
              background: 'var(--paper)',
              color: 'var(--ink)',
              fontSize: 'var(--step-0)',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="new-group-confirm"
            disabled={!valid || isConfirming}
            onClick={() => {
              if (valid && !isConfirming) onConfirm(trimmed, color);
            }}
            style={{
              flex: 1,
              minHeight: '44px',
              padding: '0 16px',
              border: 'none',
              borderRadius: 'var(--radius)',
              background: 'var(--accent)',
              color: 'var(--accent-ink)',
              fontSize: 'var(--step-0)',
              cursor: valid && !isConfirming ? 'pointer' : undefined,
              opacity: valid && !isConfirming ? 1 : 0.4,
            }}
          >
            {isConfirming ? 'Saving…' : confirmLabel}
          </button>
        </>
      }
    >
      {!colorOnly ? (
        <div style={{ marginBottom: 12 }}>
          <Input
            label="Group name"
            placeholder="Group name"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            aria-label="Group name"
            data-testid="new-group-name"
          />
        </div>
      ) : null}
      <ColorSwatchPicker value={color} onChange={setColor} />
    </Dialog>
  );
}
