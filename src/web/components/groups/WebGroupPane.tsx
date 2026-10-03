/**
 * @file WebGroupPane.tsx
 * @description Items section for the web group pane (`/library/groups/:id`):
 * domain rows expandable to resolved pages, page rows with move/remove menus,
 * then the Add page / Add domain forms with library auto-suggest.
 * The group header (swatch, name, item count, Open in browser, ⋯ menu)
 * is rendered in `lib-main-head` (or via `showHeader` if rendered standalone).
 */

import React, { useMemo, useState } from 'react';

import type { GroupColor, PageGroup, PageGroupItem } from '@/shared/types/page-group';
import { resolveGroupPages } from '@/shared/utils/group-membership';
import { normalizePageUrl } from '@/shared/utils/normalize-page-url';
import type { WebGroupMutationResult } from '@/web/hooks/useWebGroups';
import { toast } from 'sonner';

import { WebGroupAddCard } from './WebGroupAddCard';
import type { AvailablePageSuggestion } from './WebGroupAddForms';
import { WebGroupHeader } from './WebGroupHeader';
import {
  WebGroupDomainRow,
  WebGroupPageRow,
  type WebItemMoveTarget,
} from './WebGroupItemRows';

import type { WebHighlight } from '@/web/hooks/useWebLibrary';

export interface WebGroupPaneCallbacks {
  onAddPage: (groupId: string, rawUrl: string) => Promise<WebGroupMutationResult>;
  onAddDomain: (
    groupId: string,
    rawHostname: string,
    includeSubdomains: boolean
  ) => Promise<WebGroupMutationResult>;
  onRemoveItem: (groupId: string, itemId: string) => Promise<WebGroupMutationResult>;
  onMoveItem: (
    groupId: string,
    itemId: string,
    to: WebItemMoveTarget
  ) => Promise<WebGroupMutationResult>;
  onRename?: (id: string, name: string) => Promise<WebGroupMutationResult>;
  onRecolor?: (id: string, color: GroupColor) => Promise<WebGroupMutationResult>;
  onDelete?: (id: string, closeTabs?: boolean) => Promise<WebGroupMutationResult>;
  onDeleted?: () => void;
}

export interface WebGroupPaneProps extends WebGroupPaneCallbacks {
  group: PageGroup;
  items: PageGroupItem[];
  highlightCountForUrl: (urlNormalized: string) => number;
  highlights?: WebHighlight[];
  availablePages?: AvailablePageSuggestion[];
  availableDomains?: string[];
  showHeader?: boolean;
  showAddForms?: boolean;
  showItemsList?: boolean;
  defaultAddOpen?: boolean;
}

export function WebGroupPane({
  group,
  items,
  highlightCountForUrl,
  highlights = [],
  availablePages = [],
  availableDomains = [],
  showHeader = true,
  showAddForms = true,
  showItemsList = false,
  defaultAddOpen = false,
  onRename,
  onRecolor,
  onDelete,
  onAddPage,
  onAddDomain,
  onRemoveItem,
  onMoveItem,
  onDeleted = () => undefined,
}: WebGroupPaneProps): React.ReactElement {
  const [announcement, setAnnouncement] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const liveItems = useMemo(() => items.filter((i) => i.deletedAt === null), [items]);
  const domainItems = useMemo(() => liveItems.filter((i) => i.kind === 'domain'), [liveItems]);
  const pageItems = useMemo(() => liveItems.filter((i) => i.kind === 'page'), [liveItems]);

  const isAddOpen = defaultAddOpen || liveItems.length === 0;

  const resolved = useMemo(
    () =>
      resolveGroupPages(
        liveItems,
        availablePages && availablePages.length > 0
          ? availablePages.map((p) => ({
              urlNormalized: p.url,
              title: p.title,
              faviconUrl: null,
            }))
          : pageItems.map((i) => ({
              urlNormalized: i.urlNormalized,
              title: i.title,
              faviconUrl: null,
            }))
      ),
    [liveItems, availablePages, pageItems]
  );

  const pagesByRule = useMemo(() => {
    const map = new Map<string, typeof resolved>();
    for (const rule of domainItems) {
      if (rule.kind !== 'domain') continue;
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
        (item) =>
          highlightCountForUrl(item.urlNormalized) > 0 ||
          highlightCountForUrl(normalizePageUrl(item.urlNormalized)) > 0
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
    if (selectedItemIds.size === 0) return;
    setIsBatchDeleting(true);
    setActionError(null);
    try {
      let count = 0;
      const domainRuleIdsToRemove = new Set<string>();

      for (const key of selectedItemIds) {
        if (key.startsWith('domainPage:')) {
          const [, domainRuleId] = key.split(':');
          domainRuleIdsToRemove.add(domainRuleId);
        } else {
          const res = await onRemoveItem(group.id, key);
          if (res.success) count++;
        }
      }

      for (const ruleId of domainRuleIdsToRemove) {
        const res = await onRemoveItem(group.id, ruleId);
        if (res.success) count++;
      }

      toast(`Deleted ${count} ${count === 1 ? 'page' : 'pages'} from "${group.name}"`);
      setSelectedItemIds(new Set());
      setIsSelectMode(false);
    } catch {
      setActionError('Failed to delete some selected pages');
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const itemLabel = (item: PageGroupItem): string =>
    item.kind === 'page' ? (item.title ?? item.urlNormalized) : item.hostname;

  const handleMove = async (item: PageGroupItem, to: WebItemMoveTarget): Promise<void> => {
    setActionError(null);
    const result = await onMoveItem(group.id, item.id, to);
    if (!result.success) {
      setActionError(result.error);
      return;
    }
    setAnnouncement(`${itemLabel(item)} moved ${to === 'top' ? 'to top' : to === 'up' ? 'up' : 'down'}`);
  };

  const handleRemove = async (item: PageGroupItem): Promise<void> => {
    setActionError(null);
    const result = await onRemoveItem(group.id, item.id);
    if (!result.success) {
      setActionError(result.error);
      return;
    }
    setAnnouncement(`${itemLabel(item)} removed from ${group.name}`);
  };

  return (
    <div data-testid="web-group-pane">
      {showHeader && onRename && onRecolor && onDelete ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0 16px' }}>
          <WebGroupHeader
            group={group}
            items={items}
            highlights={highlights}
            onRename={onRename}
            onRecolor={onRecolor}
            onDelete={onDelete}
            onDeleted={onDeleted}
          />
        </div>
      ) : null}

      {actionError ? (
        <p
          role="alert"
          data-testid="web-group-pane-error"
          style={{ margin: '0 0 12px', fontSize: 'var(--step--1)', color: 'var(--ttl-expired)' }}
        >
          {actionError}
        </p>
      ) : null}

      {showItemsList && liveItems.length === 0 ? (
        <div
          data-testid="web-group-pane-empty-items"
          style={{
            padding: '16px 20px',
            border: '1px dashed var(--rule-soft)',
            borderRadius: 'var(--radius)',
            background: 'var(--paper-2)',
            marginBottom: 20,
          }}
        >
          <p
            style={{
              margin: '0 0 4px',
              fontFamily: 'var(--serif)',
              fontSize: 'var(--step-0)',
              color: 'var(--ink)',
              fontWeight: 500,
            }}
          >
            This group has no pages or sites yet
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 'var(--step--1)',
              color: 'var(--ink-2)',
              lineHeight: 1.4,
            }}
          >
            No pages yet. Add a page URL or a domain below.
          </p>
        </div>
      ) : showItemsList ? (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
          <p className="u-kicker" style={{ margin: 0, color: 'var(--ink-3)' }}>
            Pages & sites ({allSelectableKeys.length})
          </p>
          <button
            type="button"
            className="btn ghost sm"
            data-testid="web-group-select-mode-toggle"
            onClick={() => {
              setIsSelectMode(!isSelectMode);
              setSelectedItemIds(new Set());
            }}
            style={{
              fontSize: 'var(--step--1)',
              padding: '2px 8px',
              minHeight: 28,
              cursor: 'pointer',
            }}
          >
            {isSelectMode ? 'Cancel' : 'Select'}
          </button>
        </div>

        {isSelectMode ? (
        <div
          data-testid="web-group-batch-bar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '8px 14px',
            marginBottom: 10,
            border: '1px solid var(--rule-soft)',
            borderRadius: 'var(--radius)',
            background: 'var(--paper-2)',
          }}
        >
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              fontSize: 'var(--step--1)',
              fontFamily: 'var(--sans)',
              color: 'var(--ink)',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              data-testid="web-group-select-all-checkbox"
              checked={
                allSelectableKeys.length > 0 &&
                selectedItemIds.size === allSelectableKeys.length
              }
              onChange={toggleSelectAll}
              style={{
                cursor: 'pointer',
                width: 16,
                height: 16,
                accentColor: 'var(--accent)',
              }}
            />
            <span>Select all ({allSelectableKeys.length})</span>
          </label>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span
              data-testid="web-group-selected-count"
              style={{
                fontSize: 'var(--step--1)',
                color: 'var(--ink-2)',
                fontFamily: 'var(--mono)',
              }}
            >
              {selectedItemIds.size} selected
            </span>
            <button
              type="button"
              className="btn destructive sm"
              data-testid="web-group-batch-delete-btn"
              disabled={selectedItemIds.size === 0 || isBatchDeleting}
              onClick={() => void handleBatchDelete()}
              style={{
                minHeight: 28,
                padding: '0 12px',
                background:
                  selectedItemIds.size === 0
                    ? 'var(--paper-3)'
                    : 'var(--ttl-expired, #b91c1c)',
                color: selectedItemIds.size === 0 ? 'var(--ink-3)' : '#fff',
                border: 'none',
                borderRadius: 'var(--radius)',
                cursor:
                  selectedItemIds.size === 0 || isBatchDeleting
                    ? 'not-allowed'
                    : 'pointer',
                fontWeight: 500,
                fontSize: 'var(--step--1)',
              }}
            >
              {isBatchDeleting ? 'Deleting…' : `Delete (${selectedItemIds.size})`}
            </button>
            <button
              type="button"
              className="btn ghost sm"
              data-testid="web-group-batch-cancel-btn"
              onClick={() => {
                setIsSelectMode(false);
                setSelectedItemIds(new Set());
              }}
              style={{
                minHeight: 28,
                padding: '0 8px',
                cursor: 'pointer',
                fontSize: 'var(--step--1)',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div
        style={{
          border: '1px solid var(--rule-soft)',
            borderRadius: 'var(--radius)',
            background: 'var(--paper)',
            overflow: 'hidden',
            marginBottom: 20,
          }}
        >
          {domainItems.map((item) =>
            item.kind === 'domain' ? (
              <WebGroupDomainRow
                key={item.id}
                item={item}
                matchedPages={pagesByRule.get(item.id) ?? []}
                highlightCount={(pagesByRule.get(item.id) ?? []).reduce(
                  (acc, p) => acc + highlightCountForUrl(normalizePageUrl(p.urlNormalized)),
                  0
                )}
                highlightCountForUrl={highlightCountForUrl}
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
                onRemoveDomainPage={() => {
                  void handleRemove(item);
                }}
              />
            ) : null
          )}
          {visiblePageItems.map((item) =>
            item.kind === 'page' ? (
              <WebGroupPageRow
                key={item.id}
                item={item}
                highlightCount={
                  highlightCountForUrl(item.urlNormalized) ||
                  highlightCountForUrl(normalizePageUrl(item.urlNormalized))
                }
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
            ) : null
          )}
        </div>
        </div>
      ) : null}

      {showAddForms ? (
        <div data-testid="web-group-add-container">
          <WebGroupAddCard
            onAddPage={(rawUrl) => onAddPage(group.id, rawUrl)}
            onAddDomain={(rawHostname) => onAddDomain(group.id, rawHostname, true)}
            availablePages={availablePages}
            availableDomains={availableDomains.map((d) =>
              typeof d === 'string' ? { hostname: d, itemCount: 0 } : d
            )}
            defaultOpen={isAddOpen}
          />
        </div>
      ) : null}

      <div
        aria-live="polite"
        data-testid="web-group-move-announcement"
        className="u-sans"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
          whiteSpace: 'nowrap',
        }}
      >
        {announcement}
      </div>
    </div>
  );
}
