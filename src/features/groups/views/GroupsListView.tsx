/**
 * @file GroupsListView.tsx
 * @description Popup body for the Library "Groups" segment: swatch rows with
 * counts + state lines, a "New group" action (name-and-color dialog), the
 * PRD empty/guest copy, and delete-via-detail (rows open detail).
 * Body-only — PopupShell owns chrome.
 */

import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useGroupMutations } from '@/features/groups/hooks/useGroupMutations';
import { useGroups } from '@/features/groups/hooks/useGroups';
import type { GroupColor } from '@/shared/types/page-group';

import { DeleteGroupDialog } from '../components/DeleteGroupDialog';
import { GroupEmptyState } from '../components/GroupEmptyState';
import { GroupImportDialog } from '../components/GroupImportDialog';
import { GroupRow } from '../components/GroupRow';
import { NewGroupDialog } from '../components/NewGroupDialog';

export interface GroupsListViewProps {
  onGroupClick: (groupId: string) => void;
  isAuthenticated?: boolean;
  onSignIn?: () => void;
  onOpenSettings?: () => void;
}

export function GroupsListView({
  onGroupClick,
  isAuthenticated = false,
  onSignIn,
  onOpenSettings,
}: GroupsListViewProps): React.ReactElement {
  const { groups, items, isLoading } = useGroups();
  const mutations = useGroupMutations();
  const [newOpen, setNewOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [renameTarget, setRenameTarget] = useState<PageGroup | null>(null);
  const [colorTarget, setColorTarget] = useState<PageGroup | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PageGroup | null>(null);
  const [isActionPending, setIsActionPending] = useState(false);

  const liveGroups = useMemo(() => groups.filter((g) => g.deletedAt === null), [groups]);
  const countByGroup = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      if (item.deletedAt !== null) continue;
      map.set(item.groupId, (map.get(item.groupId) ?? 0) + 1);
    }
    return map;
  }, [items]);

  const handleCreate = async (name: string, color: GroupColor): Promise<void> => {
    setIsCreating(true);
    try {
      const result = await mutations.createGroup(name, color);
      if (!result.success) {
        toast.error(result.error || 'Could not create group');
        return;
      }
      setNewOpen(false);
      if (result.data.group) onGroupClick(result.data.group.id);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRename = async (name: string): Promise<void> => {
    if (!renameTarget) return;
    setIsActionPending(true);
    try {
      const result = await mutations.renameGroup(renameTarget.id, name);
      if (!result.success) {
        toast.error(result.error || 'Could not rename group');
        return;
      }
      setRenameTarget(null);
    } finally {
      setIsActionPending(false);
    }
  };

  const handleRecolor = async (_name: string, color: GroupColor): Promise<void> => {
    if (!colorTarget) return;
    setIsActionPending(true);
    try {
      const result = await mutations.recolorGroup(colorTarget.id, color);
      if (!result.success) {
        toast.error(result.error || 'Could not change color');
        return;
      }
      setColorTarget(null);
    } finally {
      setIsActionPending(false);
    }
  };

  const handleDelete = async (closeTabs?: boolean): Promise<void> => {
    if (!deleteTarget) return;
    setIsActionPending(true);
    try {
      const targetId = deleteTarget.id;
      const targetName = deleteTarget.name;
      const result = await mutations.deleteGroup(targetId, closeTabs);
      if (!result.success) {
        toast.error(result.error || 'Could not delete group');
        return;
      }
      setDeleteTarget(null);
      toast(`Deleted "${targetName}"`, {
        duration: 5000,
        action: {
          label: 'Undo',
          onClick: () => {
            void mutations.restoreGroup(targetId).catch(() => {});
          },
        },
      });
    } finally {
      setIsActionPending(false);
    }
  };

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}
      data-testid="groups-list-view"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '6px 16px 8px',
          flexShrink: 0,
        }}
      >
        <p className="u-kicker" style={{ margin: 0, color: 'var(--ink-3)' }}>
          GROUPS
        </p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            data-testid="groups-import-button"
            onClick={() => setImportOpen(true)}
            style={{
              minHeight: '32px',
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
              gap: 4,
              transition: 'background 120ms ease, border-color 120ms ease',
            }}
          >
            Import
          </button>
          <button
            type="button"
            data-testid="groups-new-button"
            onClick={() => setNewOpen(true)}
            style={{
              minHeight: '32px',
              padding: '0 12px',
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
              gap: 4,
              transition: 'background 120ms ease, border-color 120ms ease',
            }}
          >
            <span aria-hidden="true" style={{ fontSize: '13px', lineHeight: 1 }}>+</span>
            New group
          </button>
        </div>
      </div>
      <div className="list-scroll" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {isLoading ? (
          <div style={{ padding: '8px 0' }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  height: 56,
                  margin: '0 16px 8px',
                  border: '1px solid var(--rule-soft)',
                  background: 'var(--paper-2)',
                  opacity: 0.6,
                }}
              />
            ))}
          </div>
        ) : liveGroups.length === 0 ? (
          <GroupEmptyState
            isAuthenticated={isAuthenticated}
            onNewGroup={() => setNewOpen(true)}
            onSignIn={onSignIn}
            onOpenSettings={onOpenSettings}
          />
        ) : (
          liveGroups.map((group) => (
            <GroupRow
              key={group.id}
              group={group}
              itemCount={countByGroup.get(group.id) ?? 0}
              onOpen={() => onGroupClick(group.id)}
              onRename={() => setRenameTarget(group)}
              onRecolor={() => setColorTarget(group)}
              onDelete={() => setDeleteTarget(group)}
            />
          ))
        )}
      </div>
      <NewGroupDialog
        open={newOpen}
        isConfirming={isCreating}
        onClose={() => setNewOpen(false)}
        onConfirm={(name, color) => {
          void handleCreate(name, color);
        }}
      />
      <GroupImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
      />
      {renameTarget && (
        <NewGroupDialog
          open={Boolean(renameTarget)}
          title="Rename group"
          confirmLabel="Rename"
          initialName={renameTarget.name}
          initialColor={renameTarget.color}
          isConfirming={isActionPending}
          onClose={() => setRenameTarget(null)}
          onConfirm={(name) => {
            void handleRename(name);
          }}
        />
      )}
      {colorTarget && (
        <NewGroupDialog
          open={Boolean(colorTarget)}
          title="Group color"
          confirmLabel="Save color"
          initialName={colorTarget.name}
          initialColor={colorTarget.color}
          colorOnly
          isConfirming={isActionPending}
          onClose={() => setColorTarget(null)}
          onConfirm={(name, color) => {
            void handleRecolor(name, color);
          }}
        />
      )}
      {deleteTarget && (
        <DeleteGroupDialog
          open={Boolean(deleteTarget)}
          groupName={deleteTarget.name}
          itemCount={countByGroup.get(deleteTarget.id) ?? 0}
          isLiveOnThisDevice={Boolean(deleteTarget.boundDeviceId)}
          isConfirming={isActionPending}
          onClose={() => setDeleteTarget(null)}
          onConfirm={(closeTabs) => {
            void handleDelete(closeTabs);
          }}
        />
      )}
    </div>
  );
}
