/**
 * @file WebGroupsRailSection.tsx
 * @description Groups rail section for the web app, supporting:
 * - Group rows with centered color swatch in 24x24 icon slot, chevrons, counts, and delete
 * - Domain items with DomainFavicon, chevrons, child pages, and group removal
 * - Standalone page items with DomainFavicon and group removal
 * - New group button at the bottom of the list
 * - Group deletion dialog ensuring library highlights remain untouched
 *
 * Web-only: React Router links, no `chrome.*` access.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import { GROUPS_GUEST_COPY } from '@/features/groups/components/GroupEmptyState';
import { NewGroupDialog } from '@/features/groups/components/NewGroupDialog';
import type { GroupColor, PageGroup, PageGroupItem } from '@/shared/types/page-group';
import { normalizePageUrl } from '@/shared/utils/normalize-page-url';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui-system/components/primitives/DropdownMenu';
import { ColorSwatch } from '@/ui-system/components/primitives/ColorSwatch';
import { DomainFavicon } from '@/web/components/DomainFavicon';

import { WebGroupDeleteDialog } from './WebGroupDeleteDialog';

export interface GroupChildPage {
  urlNormalized: string;
  title: string | null;
  domain: string;
}

export interface WebGroupsRailSectionProps {
  isAuthenticated: boolean;
  groups: PageGroup[];
  activeGroupId: string | null;
  activeUrl?: string | null;
  activeDomain?: string | null;
  itemCountOf: (groupId: string) => number;
  onCreateGroup: (name: string, color: GroupColor) => Promise<PageGroup | null>;
  onRenameGroup?: (id: string, name: string) => Promise<unknown>;
  onRecolorGroup?: (id: string, color: GroupColor) => Promise<unknown>;
  onRemoveItem?: (groupId: string, itemId: string) => Promise<unknown>;
  onAddPage?: (groupId: string, urlNormalized: string) => Promise<unknown>;
  onDeleteGroup?: (groupId: string) => Promise<unknown>;
  itemsByGroup?: Record<string, PageGroupItem[]>;
  availablePages?: GroupChildPage[];
  basePath?: string;
  hideDivider?: boolean;
  onOpenImport?: () => void;
}

function PageDocIco(): React.ReactElement {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 2h5.5L13 5.5V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
      <path d="M9 2v4h4" />
    </svg>
  );
}

const TrashIco = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14" />
  </svg>
);

function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

export function WebGroupsRailSection({
  isAuthenticated,
  groups,
  activeGroupId,
  activeUrl = null,
  activeDomain = null,
  itemCountOf,
  onCreateGroup,
  onRenameGroup,
  onRecolorGroup,
  onRemoveItem,
  onAddPage,
  onDeleteGroup,
  itemsByGroup = {},
  availablePages,
  basePath = '/groups',
  hideDivider = false,
  onOpenImport,
}: WebGroupsRailSectionProps): React.ReactElement {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedDomains, setExpandedDomains] = useState<Record<string, boolean>>({});
  const [groupsSectionExpanded, setGroupsSectionExpanded] = useState(true);
  const [groupToDelete, setGroupToDelete] = useState<PageGroup | null>(null);
  const [groupToRename, setGroupToRename] = useState<PageGroup | null>(null);
  const [groupToRecolor, setGroupToRecolor] = useState<PageGroup | null>(null);

  const isPageItemVisible = (item: PageGroupItem): boolean => {
    if (item.kind === 'domain') return true;
    if (!availablePages) return true;
    return availablePages.some(
      (p) =>
        p.urlNormalized === item.urlNormalized ||
        normalizePageUrl(p.urlNormalized) === normalizePageUrl(item.urlNormalized)
    );
  };

  const toggleGroup = (id: string): void => {
    setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleDomain = (itemId: string): void => {
    setExpandedDomains((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleConfirmCreate = async (name: string, color: GroupColor): Promise<void> => {
    setIsSaving(true);
    try {
      const created = await onCreateGroup(name, color);
      if (created) setDialogOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemovePageFromDomain = async (
    groupId: string,
    domainItem: Extract<PageGroupItem, { kind: 'domain' }>,
    pageToRemove: GroupChildPage,
    allDomainPages: GroupChildPage[]
  ): Promise<void> => {
    if (!onRemoveItem) return;
    await onRemoveItem(groupId, domainItem.id);
    if (onAddPage) {
      for (const p of allDomainPages) {
        if (p.urlNormalized !== pageToRemove.urlNormalized) {
          await onAddPage(groupId, p.urlNormalized);
        }
      }
    }
  };

  return (
    <section aria-label="Groups" data-od-id="library-groups-section">
      <button
        type="button"
        onClick={() => setGroupsSectionExpanded((prev) => !prev)}
        data-testid="web-groups-section-toggle"
        style={{
          all: 'unset',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '4px 0 8px',
          width: '100%',
          cursor: 'pointer',
          boxSizing: 'border-box',
        }}
        aria-expanded={groupsSectionExpanded}
      >
        <p className="u-kicker" style={{ margin: 0, color: 'var(--ink-3)' }}>
          Groups
        </p>
        <span
          aria-hidden="true"
          style={{
            fontSize: 'var(--step--1)',
            color: 'var(--ink-3)',
            transform: groupsSectionExpanded ? 'none' : 'rotate(-90deg)',
            transition: 'transform 0.15s ease',
            display: 'inline-block',
          }}
        >
          ▾
        </span>
      </button>

      {groupsSectionExpanded ? (
        !isAuthenticated ? (
        <p
          data-testid="web-groups-guest-copy"
          style={{
            margin: '0 0 8px',
            fontSize: 'var(--step-0)',
            color: 'var(--ink-2)',
            lineHeight: 1.5,
          }}
        >
          {GROUPS_GUEST_COPY}{' '}
          <Link
            to="/sign-in"
            data-od-id="library-groups-guest-signin"
            style={{ color: 'var(--accent)' }}
          >
            Sign in
          </Link>
        </p>
      ) : groups.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '0 0 8px' }}>
          <p
            data-testid="web-groups-empty"
            style={{
              margin: 0,
              fontSize: 'var(--step--1)',
              color: 'var(--ink-3)',
              lineHeight: 1.5,
            }}
          >
            Group pages and domains you&apos;re working across.
          </p>
          <div className="tree-row">
            <span className="tree-chev-slot" aria-hidden="true" />
            <button
              type="button"
              data-od-id="library-groups-new"
              data-testid="web-groups-new"
              className="tree-item"
              onClick={() => setDialogOpen(true)}
              style={{
                color: 'var(--ink-3)',
                cursor: 'pointer',
                padding: '4px 8px 4px 4px',
                gap: 8,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 24,
                  height: 24,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 'var(--step-0)',
                  lineHeight: 1,
                  color: 'var(--ink-3)',
                }}
              >
                +
              </span>
              <span className="tree-label">New group</span>
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {groups.map((group) => {
            const active = group.id === activeGroupId;
            const rawItems = (itemsByGroup[group.id] ?? []).filter((i) => i.deletedAt === null);
            const items = rawItems.filter(isPageItemVisible);
            const open = Boolean(expandedGroups[group.id]);
            const hasItems = items.length > 0;

            return (
              <div key={group.id} className="tree-group">
                <div className="tree-row">
                  {hasItems ? (
                    <button
                      type="button"
                      className={`tree-toggle${open ? ' is-open' : ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleGroup(group.id);
                      }}
                      aria-label={`${open ? 'Collapse' : 'Expand'} ${group.name}`}
                      aria-expanded={open}
                    >
                      <svg
                        className="tree-chevron"
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M4 2.5 8 6 4 9.5"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  ) : (
                    <span className="tree-chev-slot" aria-hidden="true" />
                  )}
                  <Link
                    to={`${basePath}/${group.id}`}
                    className={`tree-item${active && !activeUrl && !activeDomain ? ' active' : ''}`}
                    data-od-id={`lib-group-${group.id}`}
                    data-testid={`web-group-row-${group.id}`}
                    aria-current={active && !activeUrl && !activeDomain ? 'page' : undefined}
                    style={{ textDecoration: 'none' }}
                  >
                    <span className="folder-ico group-swatch-slot" aria-hidden="true">
                      <ColorSwatch color={group.color} size="sm" variant="solid" />
                    </span>
                    <span
                      className="tree-label"
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {group.name}
                    </span>
                    <span
                      className="u-serif"
                      aria-label={`${itemCountOf(group.id)} items`}
                      style={{
                        fontSize: 'var(--step-0)',
                        fontStyle: 'italic',
                        color: 'var(--ink-3)',
                        flexShrink: 0,
                        marginLeft: 'auto',
                      }}
                    >
                      {itemCountOf(group.id)}
                    </span>
                  </Link>
                  <div className="tree-actions">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="tree-more sr-icon"
                          data-testid={`web-group-menu-trigger-${group.id}`}
                          aria-label={`Options for ${group.name}`}
                          title="More options"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          ⋯
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" sideOffset={4}>
                        {onRenameGroup ? (
                          <DropdownMenuItem
                            data-testid={`web-group-rail-rename-${group.id}`}
                            onSelect={() => setGroupToRename(group)}
                            onClick={() => setGroupToRename(group)}
                          >
                            Rename
                          </DropdownMenuItem>
                        ) : null}
                        {onRecolorGroup ? (
                          <DropdownMenuItem
                            data-testid={`web-group-rail-recolor-${group.id}`}
                            onSelect={() => setGroupToRecolor(group)}
                            onClick={() => setGroupToRecolor(group)}
                          >
                            Change color
                          </DropdownMenuItem>
                        ) : null}
                        {onDeleteGroup ? (
                          <DropdownMenuItem
                            className="u-destructive"
                            data-testid={`web-group-rail-delete-${group.id}`}
                            onSelect={() => setGroupToDelete(group)}
                            onClick={() => setGroupToDelete(group)}
                          >
                            Delete
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div
                  className={`tree-children${open ? ' is-open' : ''}`}
                  data-tree-children
                >
                  <div className="tree-children-inner">
                    {items.map((item) => {
                      if (item.kind === 'domain') {
                        const domainPages = (availablePages ?? []).filter(
                          (p) =>
                            p.domain.toLowerCase() === item.hostname.toLowerCase() ||
                            p.domain.toLowerCase().endsWith(`.${item.hostname.toLowerCase()}`)
                        );
                        const isDomainOpen = Boolean(expandedDomains[item.id]);
                        const isDomainActive = active && activeDomain === item.hostname;
                        const hasPages = domainPages.length > 0;

                        return (
                          <div key={item.id} className="tree-group">
                            <div className="tree-row is-group-item">
                              {hasPages ? (
                                <button
                                  type="button"
                                  className={`tree-toggle${isDomainOpen ? ' is-open' : ''}`}
                                  style={{ width: 20, height: 34 }}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggleDomain(item.id);
                                  }}
                                  aria-label={`${isDomainOpen ? 'Collapse' : 'Expand'} ${item.hostname}`}
                                  aria-expanded={isDomainOpen}
                                >
                                  <svg
                                    className="tree-chevron"
                                    width="12"
                                    height="12"
                                    viewBox="0 0 12 12"
                                    fill="none"
                                    aria-hidden="true"
                                  >
                                    <path
                                      d="M4 2.5 8 6 4 9.5"
                                      stroke="currentColor"
                                      strokeWidth="1.4"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </button>
                              ) : (
                                <span className="tree-chev-slot" style={{ width: 20, height: 34 }} aria-hidden="true" />
                              )}
                              <Link
                                to={`${basePath}/${group.id}?domain=${encodeURIComponent(item.hostname)}`}
                                className={`tree-item${isDomainActive ? ' active' : ''}`}
                                data-testid={`web-group-item-domain-${item.id}`}
                                style={{ textDecoration: 'none' }}
                              >
                                <DomainFavicon domain={item.hostname} />
                                <span className="tree-label" title={item.hostname}>
                                  {item.hostname}
                                </span>
                                {hasPages ? (
                                  <span
                                    className="u-serif"
                                    style={{
                                      fontSize: 'var(--step--1)',
                                      fontStyle: 'italic',
                                      color: 'var(--ink-3)',
                                      marginLeft: 'auto',
                                      flexShrink: 0,
                                    }}
                                  >
                                    {domainPages.length}
                                  </span>
                                ) : null}
                              </Link>
                              {onRemoveItem ? (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      type="button"
                                      className="tree-more sr-icon"
                                      data-testid={`web-group-domain-menu-${item.id}`}
                                      aria-label={`Options for ${item.hostname}`}
                                      title="More options"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                      }}
                                    >
                                      ⋯
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" sideOffset={4}>
                                    <DropdownMenuItem
                                      className="u-destructive"
                                      data-testid={`web-group-remove-domain-${item.id}`}
                                      onSelect={() => {
                                        void onRemoveItem(group.id, item.id);
                                      }}
                                      onClick={() => {
                                        void onRemoveItem(group.id, item.id);
                                      }}
                                    >
                                      Delete from group
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              ) : null}
                            </div>

                            {/* Pages under this domain */}
                            {isDomainOpen && hasPages ? (
                              <div className="tree-children is-open">
                                <div className="tree-children-inner">
                                  {domainPages.slice(0, 8).map((page) => {
                                    const isPageActive = active && activeUrl === page.urlNormalized;
                                    return (
                                      <div key={page.urlNormalized} className="tree-row is-group-page">
                                        <span className="tree-page-ico" aria-hidden="true">
                                          <PageDocIco />
                                        </span>
                                        <Link
                                          to={`${basePath}/${group.id}?url=${encodeURIComponent(page.urlNormalized)}`}
                                          className={`tree-item${isPageActive ? ' active' : ''}`}
                                          style={{ textDecoration: 'none' }}
                                        >
                                          <span
                                            className="tree-label"
                                            title={page.title || page.urlNormalized}
                                          >
                                            {page.title || page.urlNormalized}
                                          </span>
                                        </Link>
                                        {onRemoveItem ? (
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <button
                                                type="button"
                                                className="tree-more sr-icon"
                                                data-testid={`web-group-page-menu-${encodeURIComponent(page.urlNormalized)}`}
                                                aria-label={`Options for ${page.title || page.urlNormalized}`}
                                                title="More options"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                }}
                                              >
                                                ⋯
                                              </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" sideOffset={4}>
                                              <DropdownMenuItem
                                                className="u-destructive"
                                                data-testid={`web-group-remove-page-${encodeURIComponent(page.urlNormalized)}`}
                                                onSelect={() => {
                                                  void handleRemovePageFromDomain(
                                                    group.id,
                                                    item,
                                                    page,
                                                    domainPages
                                                  );
                                                }}
                                                onClick={() => {
                                                  void handleRemovePageFromDomain(
                                                    group.id,
                                                    item,
                                                    page,
                                                    domainPages
                                                  );
                                                }}
                                              >
                                                Delete from group
                                              </DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        ) : null}
                                      </div>
                                    );
                                  })}
                                  {domainPages.length > 8 ? (
                                    <div className="tree-row is-group-page">
                                      <span className="tree-page-ico" aria-hidden="true" />
                                      <Link
                                        to={`${basePath}/${group.id}?domain=${encodeURIComponent(item.hostname)}`}
                                        className="tree-item is-clamped-link"
                                        data-testid={`web-group-clamped-pages-${item.id}`}
                                        style={{
                                          textDecoration: 'none',
                                          fontSize: 'var(--step--1)',
                                          fontStyle: 'italic',
                                          color: 'var(--ink-3)',
                                          padding: '4px 8px',
                                        }}
                                      >
                                        + {domainPages.length - 8} more pages…
                                      </Link>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      }

                      // Standalone page item
                      if (availablePages && availablePages.length > 0) {
                        const hasHighlights = availablePages.some(
                          (p) => p.urlNormalized.toLowerCase() === item.urlNormalized.toLowerCase()
                        );
                        if (!hasHighlights) return null;
                      }

                      const isPageActive = active && activeUrl === item.urlNormalized;
                      return (
                        <div key={item.id} className="tree-row is-group-item">
                          <span className="tree-chev-slot" style={{ width: 20, height: 34 }} aria-hidden="true" />
                          <Link
                            to={`${basePath}/${group.id}?url=${encodeURIComponent(item.urlNormalized)}`}
                            className={`tree-item${isPageActive ? ' active' : ''}`}
                            data-testid={`web-group-item-page-${item.id}`}
                            style={{ textDecoration: 'none' }}
                          >
                            <DomainFavicon domain={domainFromUrl(item.urlNormalized)} />
                            <span
                              className="tree-label"
                              title={item.title || item.urlNormalized}
                            >
                              {item.title || item.urlNormalized}
                            </span>
                          </Link>
                          {onRemoveItem ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="tree-more sr-icon"
                                  data-testid={`web-group-page-menu-${item.id}`}
                                  aria-label={`Options for ${item.title || item.urlNormalized}`}
                                  title="More options"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                >
                                  ⋯
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" sideOffset={4}>
                                <DropdownMenuItem
                                  className="u-destructive"
                                  data-testid={`web-group-remove-item-${item.id}`}
                                  onSelect={() => {
                                    void onRemoveItem(group.id, item.id);
                                  }}
                                  onClick={() => {
                                    void onRemoveItem(group.id, item.id);
                                  }}
                                >
                                  Delete from group
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}

          {isAuthenticated ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              <button
                type="button"
                data-od-id="library-groups-new"
                data-testid="web-groups-new"
                className="btn sm ghost"
                onClick={() => setDialogOpen(true)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  border: '1px dashed var(--rule)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--ink-2)',
                  padding: '8px 12px',
                  cursor: 'pointer',
                }}
              >
                <span aria-hidden="true" style={{ fontSize: 'var(--step-0)', lineHeight: 1 }}>
                  +
                </span>
                <span className="tree-label">New group</span>
              </button>
              {onOpenImport ? (
                <button
                  type="button"
                  data-od-id="groups-rail-import-browser"
                  data-testid="web-groups-import-browser"
                  className="btn sm ghost"
                  onClick={onOpenImport}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    border: '1px solid var(--rule-soft)',
                    borderRadius: 'var(--radius)',
                    color: 'var(--ink-3)',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontSize: 'var(--step--1)',
                  }}
                >
                  Import from browser
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        )
      ) : null}

      {!hideDivider ? (
        <div
          style={{ borderTop: '1px solid var(--rule-soft)', width: '100%', margin: '12px 0' }}
        />
      ) : null}

      {isAuthenticated ? (
        <NewGroupDialog
          open={dialogOpen}
          isConfirming={isSaving}
          onClose={() => {
            if (!isSaving) setDialogOpen(false);
          }}
          onConfirm={(name, color) => {
            void handleConfirmCreate(name, color);
          }}
        />
      ) : null}

      {groupToDelete ? (
        <WebGroupDeleteDialog
          open
          groupName={groupToDelete.name}
          itemCount={itemCountOf(groupToDelete.id)}
          onClose={() => setGroupToDelete(null)}
          onConfirm={async () => {
            if (onDeleteGroup) {
              await onDeleteGroup(groupToDelete.id);
            }
            setGroupToDelete(null);
          }}
        />
      ) : null}

      {groupToRename ? (
        <NewGroupDialog
          open
          title="Rename group"
          confirmLabel="Save"
          initialName={groupToRename.name}
          initialColor={groupToRename.color}
          isConfirming={isSaving}
          onClose={() => {
            if (!isSaving) setGroupToRename(null);
          }}
          onConfirm={async (name) => {
            if (onRenameGroup) {
              setIsSaving(true);
              try {
                await onRenameGroup(groupToRename.id, name);
                setGroupToRename(null);
              } finally {
                setIsSaving(false);
              }
            }
          }}
        />
      ) : null}

      {groupToRecolor ? (
        <NewGroupDialog
          open
          title="Change color"
          confirmLabel="Save"
          initialName={groupToRecolor.name}
          initialColor={groupToRecolor.color}
          colorOnly
          isConfirming={isSaving}
          onClose={() => {
            if (!isSaving) setGroupToRecolor(null);
          }}
          onConfirm={async (_name, color) => {
            if (onRecolorGroup) {
              setIsSaving(true);
              try {
                await onRecolorGroup(groupToRecolor.id, color);
                setGroupToRecolor(null);
              } finally {
                setIsSaving(false);
              }
            }
          }}
        />
      ) : null}
    </section>
  );
}
