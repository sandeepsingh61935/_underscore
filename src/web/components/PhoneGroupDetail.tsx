/**
 * @file PhoneGroupDetail.tsx
 * @description Read-only group detail for handheld (phone/tablet) clients:
 * header (back, swatch, name, state label, count), domain accordion & page items,
 * and member highlights section.
 * Domain rows expand to their resolved pages; tapping a page opens it in
 * a new tab with `noopener noreferrer`.
 *
 * ADR-031: consume-only — zero edit controls render here (no Rename,
 * Color, Delete, Add page/domain, Remove, or move). The web never closes
 * tabs. Web-only: no `chrome.*` access.
 */

import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { NewGroupDialog } from '@/features/groups/components/NewGroupDialog';
import { OpenInBrowserConfirmDialog } from '@/features/groups/components/OpenInBrowserConfirmDialog';
import type { GroupColor, PageGroup, PageGroupItem } from '@/shared/types/page-group';
import {
  resolveGroupPages,
  type KnownGroupPage,
} from '@/shared/utils/group-membership';
import { normalizePageUrl } from '@/shared/utils/normalize-page-url';
import { ColorSwatch } from '@/ui-system/components/primitives/ColorSwatch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui-system/components/primitives/DropdownMenu';
import { useExtensionPresence } from '@/web/extension-presence-context';
import type { WebHighlight } from '@/web/hooks/useWebLibrary';
import type { WebClientKind } from '@/web/lib/classify-web-client';
import { openGroupInBrowser } from '@/web/lib/extension-bridge';
import { WebGroupDeleteDialog } from '@/web/components/groups/WebGroupDeleteDialog';

import { PhoneHighlightCard } from './PhoneHighlightCard';
import { phoneGroupStateLabel } from './PhoneGroups';

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return url;
  }
}

function LetterTile({ letter }: { letter: string }): React.ReactElement {
  return (
    <span
      aria-hidden="true"
      className="u-serif"
      style={{
        width: 16,
        height: 16,
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 'var(--step--1)',
        color: 'var(--ink-3)',
        border: '1px solid var(--rule-soft)',
        borderRadius: 'var(--radius)',
        background: 'var(--paper-2)',
      }}
    >
      {letter}
    </span>
  );
}

function PageAnchor({
  href,
  title,
  host,
  highlightCount,
  testId,
}: {
  href: string;
  title: string;
  host: string;
  highlightCount: number | null;
  testId: string;
}): React.ReactElement {
  const letter = (title.trim().charAt(0) || host.charAt(0) || '?').toUpperCase();
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-testid={testId}
      style={{
        minHeight: '44px',
        textDecoration: 'none',
        color: 'inherit',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 12px',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <LetterTile letter={letter} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          className="title"
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: '14px',
            color: 'var(--ink)',
          }}
        >
          {title}
        </div>
        <div
          className="u-mono sub"
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: '10px',
            color: 'var(--ink-3)',
            marginTop: 2,
          }}
        >
          {host}
        </div>
      </div>
      {highlightCount !== null ? (
        <span
          className="u-serif"
          style={{
            fontSize: 'var(--step-0)',
            fontStyle: 'italic',
            color: 'var(--ink-3)',
            flexShrink: 0,
          }}
        >
          {highlightCount}
        </span>
      ) : null}
    </a>
  );
}

export interface PhoneGroupDetailProps {
  group: PageGroup;
  items: PageGroupItem[];
  highlightCountForUrl?: (urlNormalized: string) => number;
  /** Known library pages used to expand domain rules into pages. */
  knownPages?: KnownGroupPage[];
  highlights?: WebHighlight[];
  onOpenHighlight?: (id: string) => void;
  clientKind?: WebClientKind;
  onNoteSave?: (id: string, note: string) => Promise<boolean>;
  onTagsChange?: (id: string, tags: string[]) => Promise<boolean>;
  onDeleteHighlight?: (id: string) => Promise<boolean>;
  onBack: () => void;
  // Parity actions:
  onRenameGroup?: (id: string, name: string) => Promise<any>;
  onRecolorGroup?: (id: string, color: GroupColor) => Promise<any>;
  onDeleteGroup?: (id: string) => Promise<any>;
  onRemoveItem?: (groupId: string, itemId: string) => Promise<any>;
  onDeleted?: () => void;
}

export function PhoneGroupDetail({
  group,
  items,
  highlightCountForUrl,
  knownPages = [],
  highlights,
  onOpenHighlight,
  clientKind = 'phone',
  onNoteSave,
  onTagsChange,
  onDeleteHighlight,
  onBack,
  onRenameGroup,
  onRecolorGroup,
  onDeleteGroup,
  onRemoveItem,
  onDeleted,
}: PhoneGroupDetailProps): React.ReactElement {
  const [expandedRules, setExpandedRules] = useState<Record<string, boolean>>({});
  const [renameOpen, setRenameOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const presence = useExtensionPresence();
  const [isOpening, setIsOpening] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTabCount, setConfirmTabCount] = useState(0);

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  const liveItems = useMemo(
    () => items.filter((i) => i.deletedAt === null),
    [items]
  );
  const domainItems = useMemo(
    () => liveItems.filter((i) => i.kind === 'domain'),
    [liveItems]
  );
  const pageItems = useMemo(
    () => liveItems.filter((i) => i.kind === 'page'),
    [liveItems]
  );
  const resolved = useMemo(
    () => resolveGroupPages(liveItems, knownPages),
    [liveItems, knownPages]
  );

  const pagesByRule = useMemo(() => {
    const map = new Map<string, typeof resolved>();
    for (const rule of domainItems) {
      if (rule.kind !== 'domain') continue;
      const matched = resolved.filter(
        (p) => p.source === `via:${rule.hostname.trim().toLowerCase()}`
      );
      const filtered = matched.filter((page) =>
        (highlightCountForUrl
          ? highlightCountForUrl(normalizePageUrl(page.urlNormalized))
          : 0) > 0
      );
      map.set(rule.id, filtered);
    }
    return map;
  }, [domainItems, resolved, highlightCountForUrl]);

  const visiblePageItems = useMemo(
    () =>
      pageItems.filter(
        (item) =>
          (highlightCountForUrl
            ? highlightCountForUrl(normalizePageUrl(item.urlNormalized))
            : 0) > 0
      ),
    [pageItems, highlightCountForUrl]
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
    if (!onRemoveItem || selectedItemIds.size === 0) return;
    setIsBatchDeleting(true);
    try {
      let count = 0;
      const domainRuleIdsToRemove = new Set<string>();

      for (const key of selectedItemIds) {
        if (key.startsWith('domainPage:')) {
          const parts = key.split(':');
          const domainRuleId = parts[1];
          if (domainRuleId) domainRuleIdsToRemove.add(domainRuleId);
        } else {
          await onRemoveItem(group.id, key);
          count++;
        }
      }

      for (const ruleId of domainRuleIdsToRemove) {
        await onRemoveItem(group.id, ruleId);
        count++;
      }

      toast(`Deleted ${count} ${count === 1 ? 'page' : 'pages'} from "${group.name}"`);
      setSelectedItemIds(new Set());
      setIsSelectMode(false);
    } catch {
      toast.error('Failed to delete selected pages');
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const showOpenInBrowser = presence === 'installed' || clientKind === 'web';
  const canManage = Boolean(onRenameGroup || onRecolorGroup || onDeleteGroup);

  const handleOpenInBrowser = async (force = false): Promise<void> => {
    setIsOpening(true);
    try {
      const res = await openGroupInBrowser(group.id, force);
      if (!res) return;
      if (res.needsConfirm) {
        setConfirmTabCount(res.tabCount ?? liveItems.length);
        setConfirmOpen(true);
        return;
      }
      if (res.ok) {
        setConfirmOpen(false);
        toast('Opened in browser');
      } else if (res.error) {
        toast.error(res.error);
      }
    } catch {
      toast.error('Failed to open in browser');
    } finally {
      setIsOpening(false);
    }
  };

  const handleRename = async (name: string): Promise<void> => {
    if (!onRenameGroup) return;
    setIsSubmitting(true);
    try {
      await onRenameGroup(group.id, name);
      setRenameOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecolor = async (_name: string, color: GroupColor): Promise<void> => {
    if (!onRecolorGroup) return;
    setIsSubmitting(true);
    try {
      await onRecolorGroup(group.id, color);
      setColorOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!onDeleteGroup) return;
    setIsSubmitting(true);
    try {
      await onDeleteGroup(group.id);
      setDeleteOpen(false);
      if (onDeleted) {
        onDeleted();
      } else {
        onBack();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const stateLabel = phoneGroupStateLabel(group);

  return (
    <section
      className="phone-library"
      aria-label={group.name}
      data-od-id={`phone-group-detail-${group.id}`}
      data-testid="phone-group-detail"
    >
      <button
        type="button"
        onClick={onBack}
        data-testid="phone-group-detail-back"
        aria-label="Back to groups"
        style={{
          minHeight: '44px',
          alignSelf: 'flex-start',
          padding: '0 12px 0 0',
          border: 'none',
          background: 'transparent',
          color: 'var(--ink-2)',
          fontSize: 'var(--step-0)',
          cursor: 'pointer',
        }}
      >
        <span aria-hidden="true">‹ </span>Groups
      </button>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          padding: '4px 0 8px',
        }}
      >
        <ColorSwatch color={group.color} size="md" variant="solid" />
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2
            className="u-serif"
            data-testid="phone-group-detail-name"
            style={{
              margin: 0,
              fontSize: 'var(--step-2)',
              color: 'var(--ink)',
              lineHeight: 1.3,
            }}
          >
            {group.name}
          </h2>
          {stateLabel ? (
            <div
              className="u-sans"
              data-testid="phone-group-detail-state"
              style={{
                marginTop: 2,
                fontSize: 'var(--step--1)',
                color: 'var(--ink-3)',
                lineHeight: 1.4,
              }}
            >
              {stateLabel}
            </div>
          ) : null}
          <p
            className="u-mono"
            style={{
              margin: '4px 0 0',
              fontSize: 'var(--step--1)',
              color: 'var(--ink-3)',
            }}
          >
            {liveItems.length} {liveItems.length === 1 ? 'item' : 'items'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {showOpenInBrowser && (
            <button
              type="button"
              data-testid="phone-group-open-in-browser"
              disabled={isOpening}
              onClick={() => void handleOpenInBrowser(false)}
              style={{
                fontSize: 'var(--step--1)',
                fontFamily: 'var(--sans)',
                color: 'var(--ink-2)',
                border: '1px solid var(--rule-soft)',
                borderRadius: 'var(--radius)',
                padding: '0 8px',
                minHeight: '44px',
                background: 'var(--paper)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isOpening ? 'Opening…' : 'Open in browser'}
            </button>
          )}
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Options for ${group.name}`}
                  data-testid="phone-group-detail-menu-button"
                  style={{
                    minWidth: 44,
                    minHeight: '44px',
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
                  }}
                >
                  <span aria-hidden="true">⋯</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onRenameGroup && (
                  <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
                    Rename group
                  </DropdownMenuItem>
                )}
                {onRecolorGroup && (
                  <DropdownMenuItem onSelect={() => setColorOpen(true)}>
                    Change color
                  </DropdownMenuItem>
                )}
                {onDeleteGroup && (
                  <DropdownMenuItem
                    className="u-destructive"
                    onSelect={() => setDeleteOpen(true)}
                  >
                    Delete group
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {liveItems.length === 0 ? (
        <p
          data-testid="phone-group-detail-empty"
          style={{
            margin: '0 0 12px',
            fontSize: 'var(--step-0)',
            color: 'var(--ink-3)',
            lineHeight: 1.5,
          }}
        >
          No pages in this group yet.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 0 4px',
            }}
          >
            <p className="u-kicker" style={{ margin: 0, color: 'var(--ink-3)' }}>
              Pages & Sites ({allSelectableKeys.length})
            </p>
            {onRemoveItem && allSelectableKeys.length > 0 && (
              <button
                type="button"
                data-testid="phone-group-detail-select-toggle"
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
                  minHeight: '44px',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                {isSelectMode ? 'Cancel' : 'Select'}
              </button>
            )}
          </div>

          {isSelectMode && (
            <div
              data-testid="phone-group-detail-batch-bar"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                padding: '8px 12px',
                background: 'var(--paper-2)',
                border: '1px solid var(--rule-soft)',
                borderRadius: 'var(--radius)',
                marginBottom: 8,
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
                  data-testid="phone-group-detail-select-all-checkbox"
                  checked={
                    allSelectableKeys.length > 0 &&
                    selectedItemIds.size === allSelectableKeys.length
                  }
                  onChange={toggleSelectAll}
                  style={{
                    width: 16,
                    height: 16,
                    cursor: 'pointer',
                    accentColor: 'var(--accent)',
                  }}
                />
                <span>Select all ({allSelectableKeys.length})</span>
              </label>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span
                  data-testid="phone-group-detail-selected-count"
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
                  data-testid="phone-group-detail-batch-delete-btn"
                  disabled={selectedItemIds.size === 0 || isBatchDeleting}
                  onClick={() => void handleBatchDelete()}
                  style={{
                    padding: '4px 10px',
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
                    minHeight: '44px',
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  {isBatchDeleting ? 'Deleting…' : `Delete (${selectedItemIds.size})`}
                </button>
                <button
                  type="button"
                  data-testid="phone-group-detail-batch-cancel-btn"
                  onClick={() => {
                    setIsSelectMode(false);
                    setSelectedItemIds(new Set());
                  }}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--rule-soft)',
                    borderRadius: 'var(--radius)',
                    padding: '4px 8px',
                    fontSize: 'var(--step--1)',
                    color: 'var(--ink-2)',
                    cursor: 'pointer',
                    minHeight: '44px',
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {domainItems.map((item) => {
            if (item.kind !== 'domain') return null;
            const expanded = Boolean(expandedRules[item.id]);
            const matched = pagesByRule.get(item.id) ?? [];
            const letter = (item.hostname.trim().charAt(0) || '?').toUpperCase();
            return (
              <div
                key={item.id}
                data-testid={`phone-group-domain-row-${item.id}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  borderBottom: '1px solid var(--rule-soft)',
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedRules((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                  }
                  aria-expanded={expanded}
                  aria-label={`${item.hostname}, ${matched.length} pages`}
                  data-testid={`phone-group-domain-toggle-${item.id}`}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 12px',
                    minHeight: '44px',
                    textAlign: 'left',
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      display: 'inline-block',
                      transform: expanded ? 'rotate(90deg)' : 'none',
                      transition: 'transform 140ms ease',
                      color: 'var(--ink-3)',
                      flexShrink: 0,
                    }}
                  >
                    ▸
                  </span>
                  <LetterTile letter={letter} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      className="u-mono title"
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: '14px',
                        fontWeight: 500,
                        color: 'var(--ink)',
                      }}
                    >
                      {item.hostname}
                    </div>
                    <div
                      className="sub"
                      style={{
                        fontSize: '10px',
                        color: 'var(--ink-3)',
                        marginTop: 2,
                      }}
                    >
                      {item.includeSubdomains ? 'domain + subdomains' : 'domain'} ·{' '}
                      {matched.length} {matched.length === 1 ? 'page' : 'pages'}
                    </div>
                  </div>
                </button>
                {expanded ? (
                  <div
                    data-testid={`phone-group-domain-pages-${item.id}`}
                    style={{
                      padding: '4px 0 8px 16px',
                      background: 'var(--paper-2)',
                      borderTop: '1px solid var(--rule-soft)',
                    }}
                  >
                    {matched.length === 0 ? (
                      <div
                        className="u-sans"
                        style={{ fontSize: 'var(--step--1)', color: 'var(--ink-3)', padding: '10px 12px' }}
                      >
                        No saved pages match this rule yet.
                      </div>
                    ) : (
                      matched.map((page) => {
                        const itemKey = `domainPage:${item.id}:${page.urlNormalized}`;
                        const isChecked = selectedItemIds.has(itemKey);
                        return (
                          <div
                            key={page.urlNormalized}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            {isSelectMode ? (
                              <div style={{ padding: '0 8px 0 12px', display: 'flex', alignItems: 'center' }}>
                                <input
                                  type="checkbox"
                                  data-testid={`phone-page-checkbox-${encodeURIComponent(page.urlNormalized)}`}
                                  checked={isChecked}
                                  onChange={() => {
                                    setSelectedItemIds((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(itemKey)) next.delete(itemKey);
                                      else next.add(itemKey);
                                      return next;
                                    });
                                  }}
                                  style={{
                                    width: 18,
                                    height: 18,
                                    cursor: 'pointer',
                                    accentColor: 'var(--accent)',
                                  }}
                                />
                              </div>
                            ) : null}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <PageAnchor
                                href={page.urlNormalized}
                                title={page.title ?? page.urlNormalized}
                                host={hostnameOf(page.urlNormalized)}
                                highlightCount={
                                  highlightCountForUrl
                                    ? highlightCountForUrl(normalizePageUrl(page.urlNormalized))
                                    : null
                                }
                                testId={`phone-group-page-via-${item.id}`}
                              />
                            </div>
                            {!isSelectMode && onRemoveItem ? (
                              <div style={{ paddingRight: 8, display: 'flex', alignItems: 'center' }}>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      type="button"
                                      aria-label={`Actions for ${page.title ?? page.urlNormalized}`}
                                      data-testid={`phone-group-page-menu-${item.id}`}
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
                                        fontSize: 'var(--step-0)',
                                        borderRadius: 'var(--radius)',
                                      }}
                                    >
                                      <span aria-hidden="true">⋯</span>
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      className="u-destructive"
                                      onSelect={() => void onRemoveItem(group.id, item.id)}
                                    >
                                      Remove from group
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => setIsSelectMode(true)}>
                                      Select multiple pages…
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            ) : null}
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
          {visiblePageItems.map((item) => {
            const itemKey = item.id;
            const isChecked = selectedItemIds.has(itemKey);
            return (
              <div
                key={item.id}
                data-testid={`phone-group-item-row-${item.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--rule-soft)',
                }}
              >
                {isSelectMode ? (
                  <div style={{ padding: '0 8px 0 12px', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      data-testid={`phone-page-checkbox-${encodeURIComponent(item.urlNormalized)}`}
                      checked={isChecked}
                      onChange={() => {
                        setSelectedItemIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(itemKey)) next.delete(itemKey);
                          else next.add(itemKey);
                          return next;
                        });
                      }}
                      style={{
                        width: 18,
                        height: 18,
                        cursor: 'pointer',
                        accentColor: 'var(--accent)',
                      }}
                    />
                  </div>
                ) : null}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <PageAnchor
                    href={item.urlNormalized}
                    title={item.title ?? item.urlNormalized}
                    host={hostnameOf(item.urlNormalized)}
                    highlightCount={
                      highlightCountForUrl
                        ? highlightCountForUrl(normalizePageUrl(item.urlNormalized))
                        : null
                    }
                    testId={`phone-group-page-${item.id}`}
                  />
                </div>
                {!isSelectMode && onRemoveItem ? (
                  <div style={{ paddingRight: 8, display: 'flex', alignItems: 'center' }}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label={`Actions for ${item.title ?? item.urlNormalized}`}
                          data-testid={`phone-group-page-menu-${item.id}`}
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
                            fontSize: 'var(--step-0)',
                            borderRadius: 'var(--radius)',
                          }}
                        >
                          <span aria-hidden="true">⋯</span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="u-destructive"
                          onSelect={() => void onRemoveItem(group.id, item.id)}
                        >
                          Remove from group
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setIsSelectMode(true)}>
                          Select multiple pages…
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {highlights && highlights.length > 0 ? (
        <div
          data-testid="phone-group-highlights"
          style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <h3
            className="u-serif"
            data-testid="phone-group-highlights-header"
            style={{
              margin: 0,
              fontSize: 'var(--step-0)',
              color: 'var(--ink-2)',
              fontWeight: 600,
            }}
          >
            Highlights · {highlights.length}
          </h3>
          <div
            className="phone-quote-list"
            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            {highlights.map((h) => (
              <PhoneHighlightCard
                key={h.id}
                highlight={h}
                meta={h.path && h.path !== '/' ? `${h.domain}${h.path}` : h.domain}
                onOpen={() => onOpenHighlight?.(h.id)}
                clientKind={clientKind}
                onNoteSave={onNoteSave}
                onTagsChange={onTagsChange}
                onDelete={onDeleteHighlight}
              />
            ))}
          </div>
        </div>
      ) : null}

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
        isConfirming={isSubmitting}
        onClose={() => {
          if (!isSubmitting) setRenameOpen(false);
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
        isConfirming={isSubmitting}
        onClose={() => {
          if (!isSubmitting) setColorOpen(false);
        }}
        onConfirm={(_name, color) => {
          void handleRecolor(_name, color);
        }}
      />

      <WebGroupDeleteDialog
        open={deleteOpen}
        groupName={group.name}
        itemCount={liveItems.length}
        isConfirming={isSubmitting}
        onClose={() => {
          if (!isSubmitting) setDeleteOpen(false);
        }}
        onConfirm={() => {
          void handleDelete();
        }}
      />
    </section>
  );
}
