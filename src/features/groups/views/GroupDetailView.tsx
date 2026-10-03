/**
 * @file GroupDetailView.tsx
 * @description Popup body for a single page group: header (swatch, name,
 * state line, Rename/Color/Delete menu), domain rows expandable to resolved
 * pages, page rows with move/remove menus, then the existing highlight list
 * filtered to the group's resolved pages (resolveGroupPages + LibraryHighlightTile).
 * Body-only — PopupShell owns chrome. Moves announce via an aria-live region.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { browser } from 'wxt/browser';

import { LibraryHighlightTile } from '@/features/collections/components/LibraryHighlightTile';
import { useUserTags } from '@/features/collections/hooks/useUserTags';
import type { OpenedHighlight } from '@/features/collections/opened-highlight';
import { useGroup } from '@/features/groups/hooks/useGroup';
import { useGroupHighlights } from '@/features/groups/hooks/useGroupHighlights';
import { useGroupMutations } from '@/features/groups/hooks/useGroupMutations';
import type { GroupColor, PageGroupItem } from '@/shared/types/page-group';
import { resolveGroupPages } from '@/shared/utils/group-membership';
import { normalizePageUrl } from '@/shared/utils/normalize-page-url';
import { Button } from '@/ui-system/components/primitives';
import { ColorSwatch } from '@/ui-system/components/primitives/ColorSwatch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui-system/components/primitives/DropdownMenu';
import { useModeFeature } from '@/ui-system/hooks/useModeFeature';

import { DeleteGroupDialog } from '../components/DeleteGroupDialog';
import { DomainItemRow } from '../components/DomainItemRow';
import { GroupItemRow, type ItemMoveTarget } from '../components/GroupItemRow';
import { GroupStateLine } from '../components/GroupStateLine';
import { NewGroupDialog } from '../components/NewGroupDialog';
import { OpenInBrowserConfirmDialog } from '../components/OpenInBrowserConfirmDialog';

export interface GroupDetailViewProps {
  groupId: string;
  isAuthenticated?: boolean;
  onDeleted?: () => void;
  onOpenHighlight?: (highlight: OpenedHighlight) => void;
}

export function GroupDetailView({
  groupId,
  isAuthenticated = false,
  onDeleted,
  onOpenHighlight,
}: GroupDetailViewProps): React.ReactElement {
  const { group, items, isLoading } = useGroup(groupId);
  const mutations = useGroupMutations();
  const tagsGate = useModeFeature('tags', isAuthenticated);
  const { tagNames: labelSuggestions } = useUserTags(isAuthenticated);

  const [renameOpen, setRenameOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [expandedHighlightId, setExpandedHighlightId] = useState<string | null>(null);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTabCount, setConfirmTabCount] = useState(0);

  useEffect(() => {
    browser?.storage?.local
      ?.get('underscore_device_id')
      .then((res: any) => {
        if (res?.underscore_device_id) {
          setCurrentDeviceId(res.underscore_device_id);
        }
      })
      .catch(() => {});
  }, []);

  const isClosed = group?.boundDeviceId === null;
  const isBoundToThisDevice = Boolean(
    group?.boundDeviceId &&
      ((currentDeviceId && group.boundDeviceId === currentDeviceId) ||
        (!currentDeviceId && group.boundDeviceLabel === 'this device'))
  );
  const isLinkedElsewhere = Boolean(group?.boundDeviceId && !isBoundToThisDevice);
  const showOpenInBrowser = Boolean(group && (isClosed || isLinkedElsewhere));

  const handleOpenInBrowser = async (force = false): Promise<void> => {
    setIsOpening(true);
    try {
      const result = await mutations.openInBrowser?.(groupId, force);
      if (!result) return;
      if (!result.success) {
        toast.error(result.error || 'Failed to open in browser');
        return;
      }
      if (result.data?.needsConfirm) {
        setConfirmTabCount(result.data.tabCount ?? 0);
        setConfirmOpen(true);
        return;
      }
      if (result.data?.ok) {
        setConfirmOpen(false);
        toast('Opened in browser');
      } else if (result.data?.error) {
        toast.error(result.data.error);
      }
    } catch {
      toast.error('Failed to open in browser');
    } finally {
      setIsOpening(false);
    }
  };

  const liveItems = useMemo(() => items.filter((i) => i.deletedAt === null), [items]);
  const domainItems = useMemo(() => liveItems.filter((i) => i.kind === 'domain'), [liveItems]);
  const pageItems = useMemo(() => liveItems.filter((i) => i.kind === 'page'), [liveItems]);

  const { highlights } = useGroupHighlights(liveItems, isAuthenticated);

  const knownPages = useMemo(
    () =>
      highlights.map((h) => ({
        urlNormalized: h.url,
        title: h.text.slice(0, 120),
        faviconUrl: null,
      })),
    [highlights]
  );
  const resolved = useMemo(() => resolveGroupPages(liveItems, knownPages), [liveItems, knownPages]);
  const resolvedSet = useMemo(
    () => new Set(resolved.map((p) => normalizePageUrl(p.urlNormalized))),
    [resolved]
  );
  const groupHighlights = useMemo(
    () => highlights.filter((h) => resolvedSet.has(normalizePageUrl(h.url))),
    [highlights, resolvedSet]
  );

  const highlightCountByUrl = useMemo(() => {
    const map = new Map<string, number>();
    for (const h of highlights) {
      const key = normalizePageUrl(h.url);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [highlights]);

  const pagesByRule = useMemo(() => {
    const map = new Map<string, typeof resolved>();
    for (const rule of domainItems) {
      map.set(
        rule.id,
        resolved.filter((p) => p.source === `via:${rule.hostname.trim().toLowerCase()}`)
      );
    }
    return map;
  }, [domainItems, resolved]);

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  const visiblePageItems = useMemo(
    () =>
      pageItems.filter(
        (item) => (highlightCountByUrl.get(normalizePageUrl(item.urlNormalized)) ?? 0) > 0
      ),
    [pageItems, highlightCountByUrl]
  );

  const allSelectableKeys = useMemo(() => {
    const keys: string[] = [];
    for (const rule of domainItems) {
      const matched = pagesByRule.get(rule.id) ?? [];
      for (const p of matched) {
        keys.push(`domainPage:${rule.id}:${p.urlNormalized}`);
      }
    }
    for (const p of visiblePageItems) {
      keys.push(p.id);
    }
    return keys;
  }, [domainItems, pagesByRule, visiblePageItems]);

  const toggleSelectAll = (): void => {
    if (selectedItemIds.size === allSelectableKeys.length) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(allSelectableKeys));
    }
  };

  const handleBatchDelete = async (): Promise<void> => {
    if (selectedItemIds.size === 0) return;
    setIsBatchDeleting(true);
    try {
      let count = 0;
      const domainRuleIdsToRemove = new Set<string>();

      for (const key of selectedItemIds) {
        if (key.startsWith('domainPage:')) {
          const [, domainRuleId] = key.split(':');
          domainRuleIdsToRemove.add(domainRuleId);
        } else {
          const res = await mutations.removeItem(groupId, key);
          if (res.success) count++;
        }
      }

      for (const ruleId of domainRuleIdsToRemove) {
        const res = await mutations.removeItem(groupId, ruleId);
        if (res.success) count++;
      }

      toast(`Deleted ${count} ${count === 1 ? 'page' : 'pages'} from "${group?.name ?? 'group'}"`);
      setSelectedItemIds(new Set());
      setIsSelectMode(false);
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const handleMove = async (item: PageGroupItem, to: ItemMoveTarget): Promise<void> => {
    const result = await mutations.moveItem(groupId, item.id, to);
    if (!result.success) {
      toast.error(result.error || 'Could not move item');
      return;
    }
    const label = item.kind === 'page' ? (item.title ?? item.urlNormalized) : item.hostname;
    setAnnouncement(`${label} moved ${to === 'top' ? 'to top' : to === 'up' ? 'up' : 'down'}`);
  };

  const handleRemove = async (item: PageGroupItem): Promise<void> => {
    const result = await mutations.removeItem(groupId, item.id);
    if (!result.success) {
      toast.error(result.error || 'Could not remove item');
      return;
    }
    const label = item.kind === 'page' ? (item.title ?? item.urlNormalized) : item.hostname;
    setAnnouncement(`${label} removed from ${group?.name ?? 'group'}`);
    toast(`Removed from ${group?.name ?? 'group'}`, {
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => {
          void mutations.restoreItem(groupId, item.id).catch(() => {});
        },
      },
    });
  };

  const handleRename = async (name: string): Promise<void> => {
    setIsSaving(true);
    try {
      const result = await mutations.renameGroup(groupId, name);
      if (!result.success) {
        toast.error(result.error || 'Could not rename group');
        return;
      }
      setRenameOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecolor = async (_name: string, color: GroupColor): Promise<void> => {
    setIsSaving(true);
    try {
      const result = await mutations.recolorGroup(groupId, color);
      if (!result.success) {
        toast.error(result.error || 'Could not change color');
        return;
      }
      setColorOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (closeTabs?: boolean): Promise<void> => {
    setIsDeleting(true);
    try {
      const result = await mutations.deleteGroup(groupId, closeTabs);
      if (!result.success) {
        toast.error(result.error || 'Could not delete group');
        return;
      }
      setDeleteOpen(false);
      const name = group?.name ?? 'group';
      toast(`Deleted "${name}"`, {
        duration: 5000,
        action: {
          label: 'Undo',
          onClick: () => {
            void mutations.restoreGroup(groupId).catch(() => {});
          },
        },
      });
      onDeleted?.();
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading || !group) {
    return (
      <div
        data-testid="group-detail-view"
        style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}
      >
        <div style={{ padding: '8px 0' }}>
          {[0, 1, 2, 3].map((i) => (
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
      </div>
    );
  }

  return (
    <div
      data-testid="group-detail-view"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          padding: '6px 16px 10px',
          flexShrink: 0,
        }}
      >
        <div style={{ marginTop: 6, flexShrink: 0 }}>
          <ColorSwatch color={group.color} size="md" variant="solid" />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2
            className="u-serif"
            data-testid="group-detail-name"
            style={{ margin: 0, fontSize: 'var(--step-2)', color: 'var(--ink)', lineHeight: 1.25 }}
          >
            {group.name}
          </h2>
          <GroupStateLine group={group} />
        </div>
        {showOpenInBrowser && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-testid="group-open-in-browser-button"
            disabled={isOpening}
            onClick={() => void handleOpenInBrowser(false)}
            style={{
              fontSize: 'var(--step--1)',
              fontFamily: 'var(--sans)',
              color: 'var(--ink-2)',
              border: '1px solid var(--rule-soft)',
              borderRadius: 'var(--radius)',
              padding: '0 8px',
              minHeight: 28,
              alignSelf: 'center',
            }}
          >
            {isOpening ? 'Opening…' : 'Open in browser'}
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Options for ${group.name}`}
              data-testid="group-detail-menu-button"
              style={{
                minWidth: 32,
                minHeight: '32px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--rule-soft)',
                background: 'transparent',
                color: 'var(--ink-2)',
                cursor: 'pointer',
                fontSize: 'var(--step-0)',
                borderRadius: 'var(--radius)',
                padding: '0 6px',
                alignSelf: 'center',
              }}
            >
              <span aria-hidden="true">⋯</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setRenameOpen(true)}>Rename group</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setColorOpen(true)}>Change color</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setDeleteOpen(true)}>Delete group</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="list-scroll" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {liveItems.length === 0 ? (
          <p
            className="u-sans"
            data-testid="group-detail-empty-items"
            style={{ margin: 0, padding: '12px 16px', fontSize: 'var(--step-0)', color: 'var(--ink-2)', lineHeight: 1.5 }}
          >
            No pages yet. Add pages from Home with the group chip.
          </p>
        ) : (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 16px 4px',
              }}
            >
              <p className="u-kicker" style={{ margin: 0, color: 'var(--ink-3)' }}>
                PAGES & SITES ({allSelectableKeys.length})
              </p>
              <button
                type="button"
                data-testid="group-detail-select-toggle"
                onClick={() => {
                  setIsSelectMode(!isSelectMode);
                  setSelectedItemIds(new Set());
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--accent)',
                  fontSize: 'var(--step--1)',
                  fontFamily: 'var(--sans)',
                  fontWeight: 500,
                  padding: '2px 6px',
                }}
              >
                {isSelectMode ? 'Cancel' : 'Select'}
              </button>
            </div>

            {isSelectMode ? (
              <div
                data-testid="group-detail-batch-bar"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  padding: '6px 16px',
                  background: 'var(--paper-2)',
                  borderBottom: '1px solid var(--rule-soft)',
                }}
              >
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    fontSize: 'var(--step--1)',
                    color: 'var(--ink)',
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    data-testid="group-detail-select-all-checkbox"
                    checked={
                      allSelectableKeys.length > 0 &&
                      selectedItemIds.size === allSelectableKeys.length
                    }
                    onChange={toggleSelectAll}
                    style={{
                      width: 14,
                      height: 14,
                      cursor: 'pointer',
                      accentColor: 'var(--accent)',
                    }}
                  />
                  <span>Select all</span>
                </label>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 'var(--step--1)',
                      color: 'var(--ink-3)',
                      fontFamily: 'var(--mono)',
                    }}
                  >
                    {selectedItemIds.size} selected
                  </span>
                  <button
                    type="button"
                    data-testid="group-detail-batch-delete-btn"
                    disabled={selectedItemIds.size === 0 || isBatchDeleting}
                    onClick={() => void handleBatchDelete()}
                    style={{
                      padding: '2px 8px',
                      fontSize: 'var(--step--1)',
                      fontWeight: 500,
                      borderRadius: 'var(--radius)',
                      border: 'none',
                      background:
                        selectedItemIds.size === 0
                          ? 'var(--paper-3)'
                          : 'var(--ttl-expired, #b91c1c)',
                      color: selectedItemIds.size === 0 ? 'var(--ink-3)' : '#fff',
                      cursor:
                        selectedItemIds.size === 0 || isBatchDeleting
                          ? 'not-allowed'
                          : 'pointer',
                    }}
                  >
                    {isBatchDeleting ? 'Deleting…' : `Delete (${selectedItemIds.size})`}
                  </button>
                  <button
                    type="button"
                    data-testid="group-detail-batch-cancel-btn"
                    onClick={() => {
                      setIsSelectMode(false);
                      setSelectedItemIds(new Set());
                    }}
                    style={{
                      padding: '2px 6px',
                      fontSize: 'var(--step--1)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--ink-2)',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {domainItems.map((item) => (
              <DomainItemRow
                key={item.id}
                item={item}
                matchedPages={pagesByRule.get(item.id) ?? []}
                highlightCount={(() => {
                  const pages = pagesByRule.get(item.id) ?? [];
                  return pages.reduce(
                    (acc, p) => acc + (highlightCountByUrl.get(normalizePageUrl(p.urlNormalized)) ?? 0),
                    0
                  );
                })()}
                highlightCountForUrl={(url) => highlightCountByUrl.get(normalizePageUrl(url)) ?? 0}
                onMove={(to) => {
                  void handleMove(item, to);
                }}
                onRemove={() => {
                  void handleRemove(item);
                }}
                isSelectMode={isSelectMode}
                isPageSelected={(url) => selectedItemIds.has(`domainPage:${item.id}:${url}`)}
                onTogglePageSelect={(url) => {
                  const key = `domainPage:${item.id}:${url}`;
                  setSelectedItemIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(key)) next.delete(key);
                    else next.add(key);
                    return next;
                  });
                }}
                onStartSelectMode={() => setIsSelectMode(true)}
                onRemovePage={() => {
                  void handleRemove(item);
                }}
              />
            ))}
            {visiblePageItems.map((item) => (
              <GroupItemRow
                key={item.id}
                item={item}
                highlightCount={highlightCountByUrl.get(normalizePageUrl(item.urlNormalized)) ?? 0}
                onMove={(to) => {
                  void handleMove(item, to);
                }}
                onRemove={() => {
                  void handleRemove(item);
                }}
                isSelectMode={isSelectMode}
                isSelected={selectedItemIds.has(item.id)}
                onToggleSelect={() => {
                  setSelectedItemIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(item.id)) next.delete(item.id);
                    else next.add(item.id);
                    return next;
                  });
                }}
                onStartSelectMode={() => setIsSelectMode(true)}
              />
            ))}
          </>
        )}

        <div style={{ borderTop: '1px solid var(--rule-soft)', width: '100%', marginTop: 8 }} />
        <p className="u-kicker" style={{ margin: 0, padding: '12px 16px 4px', color: 'var(--ink-3)' }}>
          HIGHLIGHTS
        </p>
        {groupHighlights.length === 0 ? (
          <p
            className="u-sans"
            data-testid="group-detail-empty-highlights"
            style={{ margin: 0, padding: '0 16px 12px', fontSize: 'var(--step-0)', color: 'var(--ink-3)' }}
          >
            No highlights on these pages yet.
          </p>
        ) : (
          groupHighlights.map((h) => (
            <LibraryHighlightTile
              key={h.id}
              onOpenDetail={() =>
                onOpenHighlight?.({
                  id: h.id,
                  text: h.text,
                  domain: h.domain,
                  path: h.path,
                  url: h.url,
                  notes: h.notes,
                  tags: h.tags,
                })
              }
              highlight={{
                id: h.id,
                text: h.text,
                domain: h.domain,
                path: h.path,
                url: h.url,
                sourceKind: h.sourceKind,
                language: h.language,
                presentation: h.presentation,
                notes: h.notes,
                tags: h.tags,
              }}
              allowMarginalia={tagsGate.allowed}
              isExpanded={expandedHighlightId === h.id}
              onToggleExpand={() => {
                setExpandedHighlightId((prev) => (prev === h.id ? null : h.id));
              }}
              suggestions={labelSuggestions}
            />
          ))
        )}
      </div>

      <div aria-live="polite" data-testid="group-move-announcement" className="u-sans" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>
        {announcement}
      </div>

      <NewGroupDialog
        open={renameOpen}
        title="Rename group"
        confirmLabel="Rename"
        initialName={group.name}
        initialColor={group.color}
        isConfirming={isSaving}
        onClose={() => setRenameOpen(false)}
        onConfirm={(name) => {
          void handleRename(name);
        }}
      />
      <NewGroupDialog
        open={colorOpen}
        title="Group color"
        confirmLabel="Save color"
        initialName={group.name}
        initialColor={group.color}
        colorOnly
        isConfirming={isSaving}
        onClose={() => setColorOpen(false)}
        onConfirm={(name, color) => {
          void handleRecolor(name, color);
        }}
      />
      <DeleteGroupDialog
        open={deleteOpen}
        groupName={group.name}
        itemCount={liveItems.length}
        isLiveOnThisDevice={isBoundToThisDevice}
        isConfirming={isDeleting}
        onClose={() => setDeleteOpen(false)}
        onConfirm={(closeTabs) => {
          void handleDelete(closeTabs);
        }}
      />
      <OpenInBrowserConfirmDialog
        open={confirmOpen}
        tabCount={confirmTabCount}
        isConfirming={isOpening}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          void handleOpenInBrowser(true);
        }}
      />
    </div>
  );
}
