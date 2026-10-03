/**
 * @file WebGroupHeader.tsx
 * @description Header for active page group inside `lib-main-head`.
 * Accommodates group color swatch, title, item count, "Open in browser"
 * (when extension installed — zero install references), group actions menu,
 * and dialogs.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { NewGroupDialog } from '@/features/groups/components/NewGroupDialog';
import { OpenInBrowserConfirmDialog } from '@/features/groups/components/OpenInBrowserConfirmDialog';
import type { GroupColor, PageGroup, PageGroupItem } from '@/shared/types/page-group';
import { Button } from '@/ui-system/components/primitives/Button';
import { ColorSwatch } from '@/ui-system/components/primitives/ColorSwatch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui-system/components/primitives/DropdownMenu';
import { useExtensionPresence } from '@/web/extension-presence-context';
import { trackEvent } from '@/web/lib/analytics';
import {
  focusTabGroup,
  getBrowserTabGroups,
  openGroupInBrowser,
} from '@/web/lib/extension-bridge';
import {
  copyGroupUrlsToClipboard,
  exportGroupHtmlBookmarks,
  exportGroupMarkdown,
} from '@/web/lib/webGroupExport';
import type { WebHighlight } from '@/web/hooks/useWebLibrary';
import type { WebGroupMutationResult } from '@/web/hooks/useWebGroups';

import { WebGroupDeleteDialog } from './WebGroupDeleteDialog';

function browserLabel(browser: PageGroup['boundBrowser']): string {
  switch (browser) {
    case 'firefox':
      return 'Firefox';
    case 'edge':
      return 'Edge';
    default:
      return 'Chrome';
  }
}

export interface WebGroupHeaderProps {
  group: PageGroup;
  items: PageGroupItem[];
  highlights?: WebHighlight[];
  onRename: (id: string, name: string) => Promise<WebGroupMutationResult>;
  onRecolor: (id: string, color: GroupColor) => Promise<WebGroupMutationResult>;
  onDelete: (id: string, closeTabs?: boolean) => Promise<WebGroupMutationResult>;
  onDeleted: () => void;
  downloadButton?: React.ReactNode;
}

export function WebGroupHeader({
  group,
  items,
  highlights = [],
  onRename,
  onRecolor,
  onDelete,
  onDeleted,
  downloadButton,
}: WebGroupHeaderProps): React.ReactElement {
  const [renameOpen, setRenameOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const presence = useExtensionPresence();
  const [isOpening, setIsOpening] = useState(false);
  const [isFocusing, setIsFocusing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTabCount, setConfirmTabCount] = useState(0);
  const [matchedBrowserGroup, setMatchedBrowserGroup] = useState<{
    id: number;
    tabCount: number;
  } | null>(null);

  const liveItems = useMemo(() => items.filter((i) => i.deletedAt === null), [items]);
  const pageItems = useMemo(() => liveItems.filter((i) => i.kind === 'page'), [liveItems]);

  useEffect(() => {
    let cancelled = false;
    if (presence === 'installed') {
      getBrowserTabGroups()
        .then((res) => {
          if (!cancelled && res.ok && res.groups) {
            const found = res.groups.find(
              (g) =>
                g.title.trim().toLowerCase() === group.name.trim().toLowerCase() &&
                g.color === group.color
            );
            if (found) {
              setMatchedBrowserGroup({ id: found.id, tabCount: found.tabCount });
            }
          }
        })
        .catch(() => {
          // ignore error
        });
    }
    return () => {
      cancelled = true;
    };
  }, [presence, group.name, group.color]);

  const isLive = Boolean(matchedBrowserGroup || group.boundBrowser !== null);
  const liveTabCount = matchedBrowserGroup?.tabCount ?? pageItems.length;

  const handleRename = async (name: string): Promise<void> => {
    setIsSaving(true);
    try {
      const result = await onRename(group.id, name);
      if (result.success) {
        setRenameOpen(false);
      } else {
        toast.error(result.error);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecolor = async (_name: string, color: GroupColor): Promise<void> => {
    setIsSaving(true);
    try {
      const result = await onRecolor(group.id, color);
      if (result.success) {
        setColorOpen(false);
      } else {
        toast.error(result.error);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (closeTabs?: boolean): Promise<void> => {
    setIsDeleting(true);
    try {
      const result = await onDelete(group.id, closeTabs);
      if (result.success) {
        setDeleteOpen(false);
        onDeleted();
      } else {
        toast.error(result.error);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenInBrowser = async (force = false): Promise<void> => {
    setIsOpening(true);
    try {
      const res = await openGroupInBrowser(group.id, force);
      if (res.needsConfirm) {
        setConfirmTabCount(res.tabCount ?? 0);
        setConfirmOpen(true);
        return;
      }
      if (res.ok) {
        setConfirmOpen(false);
        trackEvent('group_opened_in_browser', {
          tabCount: res.tabCount ?? pageItems.length,
          browser: 'chrome',
        });
        toast('Opened in browser');
        if (res.browserGroupId !== undefined) {
          setMatchedBrowserGroup({
            id: res.browserGroupId,
            tabCount: res.tabCount ?? pageItems.length,
          });
        }
      } else {
        toast.error(res.error ?? 'Failed to open group in browser');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to open group in browser');
    } finally {
      setIsOpening(false);
    }
  };

  const handleFocusInBrowser = async (): Promise<void> => {
    if (matchedBrowserGroup?.id !== undefined) {
      setIsFocusing(true);
      try {
        const res = await focusTabGroup(matchedBrowserGroup.id);
        if (res.ok) {
          toast('Focused in browser');
        } else {
          toast.error(res.error ?? 'Failed to focus tab group');
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to focus tab group');
      } finally {
        setIsFocusing(false);
      }
    } else {
      void handleOpenInBrowser();
    }
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
        <ColorSwatch color={group.color} size="sm" variant="solid" />
        <h2
          data-od-id="library-scope-title"
          data-testid="web-group-pane-name"
          className="lib-scope-title"
          style={{ margin: 0 }}
        >
          {group.name}
        </h2>
        <span
          className="u-mono"
          style={{ fontSize: 'var(--step--1)', color: 'var(--ink-3)', flexShrink: 0 }}
        >
          {liveItems.length} {liveItems.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      <div className="lib-main-head-actions">
        {presence === 'installed' ? (
          isLive ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span
                className="group-live-pill u-mono"
                data-testid="group-live-pill"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--step--1)',
                  background: 'var(--paper-2)',
                  color: 'var(--ink)',
                  border: '1px solid var(--rule-soft)',
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'var(--group-green, #2ecc71)',
                    display: 'inline-block',
                  }}
                />
                Live in {browserLabel(group.boundBrowser ?? 'chrome')} · {liveTabCount}{' '}
                {liveTabCount === 1 ? 'tab' : 'tabs'}
              </span>
              <Button
                type="button"
                size="sm"
                variant="default"
                data-testid="web-group-focus-in-browser-button"
                disabled={isFocusing}
                onClick={() => {
                  void handleFocusInBrowser();
                }}
              >
                Focus in browser
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="default"
              data-testid="web-group-open-in-browser-button"
              disabled={isOpening}
              onClick={() => {
                void handleOpenInBrowser();
              }}
            >
              Open in browser
            </Button>
          )
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="btn sm ghost"
              aria-label={`Actions for ${group.name}`}
              data-testid="web-group-pane-menu"
              style={{ minWidth: 32, padding: '0 8px' }}
            >
              ⋯
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() => setRenameOpen(true)}
              onClick={() => setRenameOpen(true)}
              data-testid="web-group-menu-rename"
            >
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => setColorOpen(true)}
              onClick={() => setColorOpen(true)}
              data-testid="web-group-menu-color"
            >
              Change color
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                void copyGroupUrlsToClipboard(liveItems);
              }}
              onClick={() => {
                void copyGroupUrlsToClipboard(liveItems);
              }}
              data-testid="web-group-menu-copy-urls"
            >
              Copy all URLs
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                exportGroupMarkdown(group, liveItems, highlights);
              }}
              onClick={() => {
                exportGroupMarkdown(group, liveItems, highlights);
              }}
              data-testid="web-group-menu-export-md"
            >
              Export as Markdown
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                exportGroupHtmlBookmarks(group, liveItems);
              }}
              onClick={() => {
                exportGroupHtmlBookmarks(group, liveItems);
              }}
              data-testid="web-group-menu-export-html"
            >
              Export as HTML Bookmarks
            </DropdownMenuItem>
            <DropdownMenuItem
              className="u-destructive"
              onSelect={() => setDeleteOpen(true)}
              onClick={() => setDeleteOpen(true)}
              data-testid="web-group-menu-delete"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {downloadButton}
      </div>

      <OpenInBrowserConfirmDialog
        open={confirmOpen}
        tabCount={confirmTabCount}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          void handleOpenInBrowser(true);
        }}
      />

      <NewGroupDialog
        open={renameOpen}
        title="Rename group"
        confirmLabel="Save"
        initialName={group.name}
        initialColor={group.color}
        isConfirming={isSaving}
        onClose={() => {
          if (!isSaving) setRenameOpen(false);
        }}
        onConfirm={(name) => {
          void handleRename(name);
        }}
      />

      <NewGroupDialog
        open={colorOpen}
        title="Change color"
        confirmLabel="Save"
        initialName={group.name}
        initialColor={group.color}
        colorOnly
        isConfirming={isSaving}
        onClose={() => {
          if (!isSaving) setColorOpen(false);
        }}
        onConfirm={(name, color) => {
          void handleRecolor(name, color);
        }}
      />

      <WebGroupDeleteDialog
        open={deleteOpen}
        groupName={group.name}
        itemCount={liveItems.length}
        isLiveOnThisDevice={isLive}
        isConfirming={isDeleting}
        onClose={() => {
          if (!isDeleting) setDeleteOpen(false);
        }}
        onConfirm={(closeTabs) => {
          void handleDelete(closeTabs);
        }}
      />
    </>
  );
}
