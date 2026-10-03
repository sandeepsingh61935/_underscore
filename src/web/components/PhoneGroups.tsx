/**
 * @file PhoneGroups.tsx
 * @description Read-only Groups list section for handheld (phone/tablet)
 * clients. Rows show swatch + name + count + a compact state label:
 * bound groups show `Live in <Browser>` (e.g. "Live in Chrome") or
 * "Closed" when a device link exists without a live browser; manual
 * groups (never linked) show NO state line per GroupStateLine semantics.
 *
 * ADR-031: consume-only — zero edit controls render here (no New, Rename,
 * Delete, Add, Remove, or move). Web-only: no `chrome.*` access.
 */

import React, { useState } from 'react';

import { GROUPS_GUEST_COPY } from '@/features/groups/components/GroupEmptyState';
import { NewGroupDialog } from '@/features/groups/components/NewGroupDialog';
import type { GroupColor, PageGroup } from '@/shared/types/page-group';
import { ColorSwatch } from '@/ui-system/components/primitives/ColorSwatch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui-system/components/primitives/DropdownMenu';
import { WebGroupDeleteDialog } from '@/web/components/groups/WebGroupDeleteDialog';

function browserLabel(browser: NonNullable<PageGroup['boundBrowser']>): string {
  switch (browser) {
    case 'firefox':
      return 'Firefox';
    case 'edge':
      return 'Edge';
    case 'chrome':
      return 'Chrome';
  }
}

/**
 * Compact handheld state label. Manual groups (no binding at all) return
 * null — the name and swatch are signal enough.
 */
export function phoneGroupStateLabel(group: PageGroup): string | null {
  if (group.boundBrowser !== null) {
    return `Live in ${browserLabel(group.boundBrowser)}`;
  }
  if (group.boundDeviceId !== null) {
    return 'Closed';
  }
  return null;
}

export interface PhoneGroupsProps {
  groups: PageGroup[];
  itemCountOf: (groupId: string) => number;
  onOpenGroup: (groupId: string) => void;
  /** Guests see the guest line and no data (desktop rail parity). */
  isGuest?: boolean;
  onCreateGroup?: (name: string, color: GroupColor) => Promise<any>;
  onRenameGroup?: (id: string, name: string) => Promise<any>;
  onRecolorGroup?: (id: string, color: GroupColor) => Promise<any>;
  onDeleteGroup?: (id: string) => Promise<any>;
  onOpenImport?: () => void;
}

export function PhoneGroups({
  groups,
  itemCountOf,
  onOpenGroup,
  isGuest = false,
  onCreateGroup,
  onRenameGroup,
  onRecolorGroup,
  onDeleteGroup,
  onOpenImport,
}: PhoneGroupsProps): React.ReactElement {
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<PageGroup | null>(null);
  const [colorTarget, setColorTarget] = useState<PageGroup | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PageGroup | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManage = !isGuest && Boolean(onRenameGroup || onRecolorGroup || onDeleteGroup);

  const handleCreate = async (name: string, color: GroupColor) => {
    if (!onCreateGroup) return;
    setIsSubmitting(true);
    try {
      await onCreateGroup(name, color);
      setNewGroupOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRename = async (name: string) => {
    if (!renameTarget || !onRenameGroup) return;
    setIsSubmitting(true);
    try {
      await onRenameGroup(renameTarget.id, name);
      setRenameTarget(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecolor = async (_name: string, color: GroupColor) => {
    if (!colorTarget || !onRecolorGroup) return;
    setIsSubmitting(true);
    try {
      await onRecolorGroup(colorTarget.id, color);
      setColorTarget(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !onDeleteGroup) return;
    setIsSubmitting(true);
    try {
      await onDeleteGroup(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section aria-label="Groups" data-od-id="phone-groups-section">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <p className="u-kicker" style={{ margin: 0, color: 'var(--ink-3)' }}>
          Groups
        </p>
        {!isGuest && onCreateGroup && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {onOpenImport && (
              <button
                type="button"
                data-testid="phone-groups-import-button"
                onClick={onOpenImport}
                style={{
                  minHeight: '36px',
                  padding: '0 10px',
                  border: '1px solid var(--rule-soft)',
                  borderRadius: 'var(--radius)',
                  background: 'var(--paper)',
                  color: 'var(--ink)',
                  fontSize: 'var(--step--1)',
                  fontFamily: 'var(--sans)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                Import
              </button>
            )}
            <button
              type="button"
              data-testid="phone-groups-new-button"
              onClick={() => setNewGroupOpen(true)}
              style={{
                minHeight: '36px',
                padding: '0 10px',
                border: '1px solid var(--rule-soft)',
                borderRadius: 'var(--radius)',
                background: 'var(--paper)',
                color: 'var(--ink)',
                fontSize: 'var(--step--1)',
                fontFamily: 'var(--sans)',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              + New
            </button>
          </div>
        )}
      </div>
      {isGuest ? (
        <p
          data-testid="phone-groups-guest-copy"
          style={{
            margin: '0 0 8px',
            fontSize: 'var(--step-0)',
            color: 'var(--ink-2)',
            lineHeight: 1.5,
          }}
        >
          {GROUPS_GUEST_COPY}
        </p>
      ) : groups.length === 0 ? (
        <p
          data-testid="phone-groups-empty"
          style={{
            margin: '0 0 8px',
            fontSize: 'var(--step-0)',
            color: 'var(--ink-3)',
            lineHeight: 1.5,
          }}
        >
          Group pages and domains you&apos;re working across.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {groups.map((group) => {
            const count = itemCountOf(group.id);
            const stateLabel = phoneGroupStateLabel(group);
            return (
              <div
                key={group.id}
                className="domain-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <button
                  type="button"
                  className="domain-main"
                  data-od-id={`phone-group-${group.id}`}
                  data-testid={`phone-group-row-${group.id}`}
                  onClick={() => onOpenGroup(group.id)}
                  aria-label={`${group.name}, ${count} items${stateLabel ? `, ${stateLabel}` : ''}`}
                  style={{
                    minHeight: '44px',
                    padding: '10px 12px 10px 16px',
                    flex: 1,
                    minWidth: 0,
                    textAlign: 'left',
                  }}
                >
                  <div style={{ marginTop: stateLabel ? 2 : 0, flexShrink: 0 }}>
                    <ColorSwatch color={group.color} size="sm" variant="solid" />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      className="title"
                      style={{
                        fontSize: '15px',
                        fontWeight: 500,
                        color: 'var(--ink)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {group.name}
                    </div>
                    {stateLabel ? (
                      <div
                        className="u-sans"
                        data-testid={`phone-group-state-${group.id}`}
                        style={{
                          fontSize: 'var(--step--1)',
                          color: 'var(--ink-3)',
                          lineHeight: 1.4,
                          marginTop: 2,
                        }}
                      >
                        {stateLabel}
                      </div>
                    ) : null}
                  </div>
                  <span
                    className="u-serif"
                    aria-label={`${count} items`}
                    style={{
                      fontSize: 'var(--step-0)',
                      fontStyle: 'italic',
                      color: 'var(--ink-3)',
                      flexShrink: 0,
                    }}
                  >
                    {count}
                  </span>
                </button>
                {canManage && (
                  <div style={{ paddingRight: 8, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label={`Actions for ${group.name}`}
                          data-testid={`phone-group-menu-${group.id}`}
                          style={{
                            minWidth: 44,
                            minHeight: '44px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--ink-3)',
                            cursor: 'pointer',
                            fontSize: 'var(--step-1)',
                            borderRadius: 'var(--radius)',
                          }}
                        >
                          <span aria-hidden="true">⋯</span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onRenameGroup && (
                          <DropdownMenuItem onSelect={() => setRenameTarget(group)}>
                            Rename
                          </DropdownMenuItem>
                        )}
                        {onRecolorGroup && (
                          <DropdownMenuItem onSelect={() => setColorTarget(group)}>
                            Change color
                          </DropdownMenuItem>
                        )}
                        {onDeleteGroup && (
                          <DropdownMenuItem
                            className="u-destructive"
                            onSelect={() => setDeleteTarget(group)}
                          >
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <NewGroupDialog
        open={newGroupOpen}
        title="New group"
        confirmLabel="Create group"
        isConfirming={isSubmitting}
        onClose={() => {
          if (!isSubmitting) setNewGroupOpen(false);
        }}
        onConfirm={(name, color) => {
          void handleCreate(name, color);
        }}
      />

      <NewGroupDialog
        open={Boolean(renameTarget)}
        title="Rename group"
        confirmLabel="Save"
        initialName={renameTarget?.name}
        initialColor={renameTarget?.color}
        isConfirming={isSubmitting}
        onClose={() => {
          if (!isSubmitting) setRenameTarget(null);
        }}
        onConfirm={(name) => {
          void handleRename(name);
        }}
      />

      <NewGroupDialog
        open={Boolean(colorTarget)}
        title="Change color"
        confirmLabel="Save"
        initialName={colorTarget?.name}
        initialColor={colorTarget?.color}
        colorOnly
        isConfirming={isSubmitting}
        onClose={() => {
          if (!isSubmitting) setColorTarget(null);
        }}
        onConfirm={(_name, color) => {
          void handleRecolor(_name, color);
        }}
      />

      <WebGroupDeleteDialog
        open={Boolean(deleteTarget)}
        groupName={deleteTarget?.name ?? ''}
        itemCount={deleteTarget ? itemCountOf(deleteTarget.id) : 0}
        isConfirming={isSubmitting}
        onClose={() => {
          if (!isSubmitting) setDeleteTarget(null);
        }}
        onConfirm={() => {
          void handleDelete();
        }}
      />
    </section>
  );
}
