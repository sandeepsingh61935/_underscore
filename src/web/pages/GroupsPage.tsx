/**
 * @file GroupsPage.tsx
 * @description Dedicated Page Groups view (`/groups` and `/groups/:id`):
 * - Primary left sidebar navigation destination
 * - Left rail: Groups tree with color swatches, domain favicons, child pages, and removal
 * - Main pane: Group header with Open in browser and actions, collapsible Add card,
 *   subfilter breadcrumbs, and member highlights.
 *
 * Web-only: React Router navigation, no `chrome.*` access.
 */

import React, { useCallback, useId, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { useBillingContextOptional } from '@/features/billing/BillingProvider';
import { useUpdateHighlightMetadata } from '@/features/collections/hooks/useUpdateHighlightMetadata';
import type { GroupColor, PageGroup } from '@/shared/types/page-group';
import {
  matchesDomainRule,
  resolveGroupPages,
} from '@/shared/utils/group-membership';
import {
  DEFAULT_SEARCH_FIELDS,
} from '@/shared/utils/highlight-filter';
import {
  formatMatchBadge,
  searchHighlights,
  type SearchField,
} from '@/shared/utils/highlight-search';
import { normalizePageUrl } from '@/shared/utils/normalize-page-url';
import { displaySectionPath } from '@/shared/utils/page-href';
import { resolveWebCaps } from '@/web/caps/resolveWebCaps';
import { resolveWebPaidActive } from '@/web/caps/resolveWebPaidActive';
import { PhoneGroupDetail } from '@/web/components/PhoneGroupDetail';
import { PhoneGroups } from '@/web/components/PhoneGroups';
import { PhoneQuoteScreen } from '@/web/components/PhoneQuoteScreen';
import { LibraryHighlightDetail } from '@/web/components/LibraryHighlightDetail';
import { LibraryPager } from '@/web/components/LibraryPager';
import { WebHighlightCard } from '@/web/components/WebHighlightCard';
import { WebGroupHeader } from '@/web/components/groups/WebGroupHeader';
import { WebGroupImportDialog } from '@/web/components/groups/WebGroupImportDialog';
import { WebGroupPane } from '@/web/components/groups/WebGroupPane';
import {
  WebGroupsRailSection,
  type GroupChildPage,
} from '@/web/components/groups/WebGroupsRailSection';
import { useWebGroups } from '@/web/hooks/useWebGroups';
import { useWebGroupsRealtime } from '@/web/hooks/useWebGroupsRealtime';
import { useWebHighlightDelete } from '@/web/hooks/useWebHighlightDelete';
import { useWebLibrary, type WebHighlight } from '@/web/hooks/useWebLibrary';
import { useMobileWebViewport } from '@/web/lib/is-mobile-web-viewport';
import { createOptimisticMetadataHandlers } from '@/web/lib/optimisticMetadataSave';
import { useWebClientKind } from '@/web/lib/use-web-client-kind';
import { createWebGroupRepository } from '@/web/lib/web-group-repository';

type SearchableRow = WebHighlight & {
  text: string;
  notes: string;
  url: string;
};

function toSearchable(h: WebHighlight): SearchableRow {
  return {
    ...h,
    text: h.quote,
    notes: h.note,
    url: `https://${h.domain}${h.path || '/'}`,
  };
}

export function GroupsPage(): React.ReactElement {
  const { isAuthenticated } = useApp();
  const billing = useBillingContextOptional();
  const isPaidActive = resolveWebPaidActive(billing?.snapshot);
  const caps = useMemo(
    () =>
      resolveWebCaps({
        isAuthenticated,
        isPaidActive,
        billingStatus: billing?.snapshot.entitlement.status ?? null,
      }),
    [isAuthenticated, isPaidActive, billing?.snapshot.entitlement.status]
  );
  const clientKind = useWebClientKind();
  const location = useLocation();
  const navigate = useNavigate();
  const searchInputId = useId();

  const routeParams = useParams<{ id?: string }>();
  const activeGroupId = routeParams.id ?? null;

  // Subfilter query params (?domain=... or ?url=...)
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const filterDomain = searchParams.get('domain');
  const filterUrl = searchParams.get('url');

  const groupsRepository = useMemo(() => createWebGroupRepository(), []);
  const webGroups = useWebGroups({
    isAuthenticated: !caps.isGuest,
    repository: groupsRepository,
  });

  useWebGroupsRealtime({
    isAuthenticated: !caps.isGuest,
    applyRemoteGroup: webGroups.applyRemoteGroup,
    applyRemoteItem: webGroups.applyRemoteItem,
    removeRemoteGroup: webGroups.removeRemoteGroup,
    removeRemoteItem: webGroups.removeRemoteItem,
    refresh: webGroups.refresh,
  });

  const lib = useWebLibrary({
    isAuthenticated,
    planLabel: caps.planLabel,
  });

  const { updateMetadata } = useUpdateHighlightMetadata();
  const patchHighlight = lib.patchHighlight;
  const { deleteScope } = useWebHighlightDelete({
    highlights: lib.highlights,
    removeHighlights: lib.removeHighlights,
  });

  const phoneLayout = useMobileWebViewport();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedHighlightId, setSelectedHighlightId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const activeGroup: PageGroup | null = useMemo(() => {
    if (!activeGroupId || caps.isGuest) return null;
    return webGroups.groups.find((g) => g.id === activeGroupId) ?? null;
  }, [activeGroupId, caps.isGuest, webGroups.groups]);

  // If on /groups with no :id, auto-select first group if available (desktop only)
  React.useEffect(() => {
    if (!phoneLayout && !activeGroupId && webGroups.groups.length > 0 && !caps.isGuest) {
      void navigate(`/groups/${webGroups.groups[0]!.id}`, { replace: true });
    }
  }, [phoneLayout, activeGroupId, webGroups.groups, caps.isGuest, navigate]);

  const activeGroupItems = useMemo(
    () => (activeGroup && activeGroupId ? webGroups.liveItemsOf(activeGroupId) : []),
    [activeGroup, activeGroupId, webGroups]
  );

  const availablePages: GroupChildPage[] = useMemo(() => {
    const map = new Map<string, GroupChildPage>();
    for (const h of lib.highlights) {
      const rawUrl = `https://${h.domain}${h.path || '/'}`;
      if (!map.has(rawUrl)) {
        map.set(rawUrl, {
          urlNormalized: rawUrl,
          title: displaySectionPath(h.path) || null,
          domain: h.domain,
        });
      }
    }
    return Array.from(map.values());
  }, [lib.highlights]);

  const availableDomains = useMemo(() => {
    return lib.domains.map((d) => d.domain);
  }, [lib.domains]);

  const availablePageSuggestions = useMemo(
    () =>
      availablePages.map((p) => ({
        url: p.urlNormalized,
        title: p.title,
        domain: p.domain,
      })),
    [availablePages]
  );

  // Group resolved pages & domain matches
  const groupResolvedPages = useMemo(() => {
    if (!activeGroup) return [];
    return resolveGroupPages(
      activeGroupItems,
      availablePages.map((p) => ({
        urlNormalized: p.urlNormalized,
        title: p.title,
        faviconUrl: null,
      }))
    );
  }, [activeGroup, activeGroupItems, availablePages]);

  // Highlights filtered to active group and active subfilter
  const groupHighlights = useMemo(() => {
    if (!activeGroup) return [];

    let matched = lib.highlights.filter((h) => {
      const pageUrl = `https://${h.domain}${h.path || '/'}`;
      const normalizedPageUrl = normalizePageUrl(pageUrl);

      // Check explicit or resolved match
      const inResolved = groupResolvedPages.some(
        (p) => normalizePageUrl(p.urlNormalized) === normalizedPageUrl
      );
      if (inResolved) return true;

      // Check domain items
      return activeGroupItems.some((item) => {
        if (item.kind === 'domain') {
          return matchesDomainRule(normalizedPageUrl, item);
        }
        return normalizePageUrl(item.urlNormalized) === normalizedPageUrl;
      });
    });

    if (filterDomain) {
      const clean = filterDomain.trim().toLowerCase();
      matched = matched.filter(
        (h) => h.domain.toLowerCase() === clean || h.domain.toLowerCase().endsWith(`.${clean}`)
      );
    } else if (filterUrl) {
      const clean = normalizePageUrl(filterUrl);
      matched = matched.filter((h) => {
        const pageUrl = `https://${h.domain}${h.path || '/'}`;
        return normalizePageUrl(pageUrl) === clean;
      });
    }

    return matched;
  }, [activeGroup, activeGroupItems, groupResolvedPages, lib.highlights, filterDomain, filterUrl]);

  const searchableGroupHighlights = useMemo(
    () => groupHighlights.map(toSearchable),
    [groupHighlights]
  );

  const searchedHighlights = useMemo(() => {
    const q = query.trim();
    if (!q) {
      return groupHighlights.map((h) => ({
        highlight: h,
        matchedFields: [] as SearchField[],
      }));
    }
    return searchHighlights(searchableGroupHighlights, q, DEFAULT_SEARCH_FIELDS).map((m) => ({
      highlight: m.highlight as unknown as WebHighlight,
      matchedFields: m.matchedFields,
    }));
  }, [groupHighlights, searchableGroupHighlights, query]);

  const totalPages = Math.ceil(searchedHighlights.length / PAGE_SIZE);
  const pagedHighlights = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return searchedHighlights.slice(start, start + PAGE_SIZE);
  }, [searchedHighlights, page]);

  const highlightCountForUrl = useCallback(
    (urlNormalized: string): number => {
      const key = normalizePageUrl(urlNormalized);
      return lib.highlights.filter((h) => {
        const pageUrl = `https://${h.domain}${h.path || '/'}`;
        return normalizePageUrl(pageUrl) === key;
      }).length;
    },
    [lib.highlights]
  );

  const handleCreateGroup = async (name: string, color: GroupColor): Promise<PageGroup | null> => {
    const created = await webGroups.createGroup(name, color);
    if (created) {
      void navigate(`/groups/${created.id}`);
      return created;
    }
    return null;
  };

  const handleRenameGroup = async (id: string, name: string) => {
    return webGroups.renameGroup(id, name);
  };

  const handleRecolorGroup = async (id: string, color: GroupColor) => {
    return webGroups.recolorGroup(id, color);
  };

  const handleDeleteGroup = async (id: string, _closeTabs?: boolean) => {
    const result = await webGroups.deleteGroup(id);
    if (result.success) {
      const remaining = webGroups.groups.filter((g) => g.id !== id);
      if (remaining.length > 0) {
        void navigate(`/groups/${remaining[0]!.id}`);
      } else {
        void navigate('/groups');
      }
    }
    return result;
  };

  const detailHighlight = useMemo(() => {
    if (!selectedHighlightId) return null;
    return lib.highlights.find((h) => h.id === selectedHighlightId) ?? null;
  }, [selectedHighlightId, lib.highlights]);

  const highlightsRef = useRef(lib.highlights);
  highlightsRef.current = lib.highlights;

  const { handleNoteSave, handleTagsChange } = useMemo(
    () =>
      createOptimisticMetadataHandlers({
        getHighlight: (id: string) => highlightsRef.current.find((h) => h.id === id),
        patchHighlight,
        updateMetadata,
      }),
    [patchHighlight, updateMetadata]
  );

  const handleHighlightDelete = useCallback(
    async (id: string): Promise<boolean> => {
      const result = await deleteScope({ scope: 'highlight', id });
      if (result.success && selectedHighlightId === id) {
        setSelectedHighlightId(null);
      }
      return result.success;
    },
    [deleteScope, selectedHighlightId]
  );

  if (phoneLayout) {
    if (activeGroup) {
      if (selectedHighlightId && detailHighlight) {
        return (
          <div className="phone-library" data-testid="phone-group-highlight-detail">
            <button
              type="button"
              onClick={() => setSelectedHighlightId(null)}
              data-testid="phone-highlight-back"
              aria-label="Back to group"
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
              <span aria-hidden="true">‹ </span>{activeGroup.name}
            </button>
            <PhoneQuoteScreen
              highlight={detailHighlight}
              clientKind={clientKind}
              onOpenRelatedPage={() => undefined}
            />
          </div>
        );
      }

      return (
        <PhoneGroupDetail
          group={activeGroup}
          items={activeGroupItems}
          highlightCountForUrl={highlightCountForUrl}
          knownPages={availablePages.map((p) => ({
            urlNormalized: p.urlNormalized,
            title: p.title,
            faviconUrl: null,
          }))}
          highlights={groupHighlights}
          onOpenHighlight={(id) => setSelectedHighlightId(id)}
          clientKind={clientKind}
          onNoteSave={handleNoteSave}
          onTagsChange={handleTagsChange}
          onDeleteHighlight={handleHighlightDelete}
          onBack={() => {
            void navigate('/groups');
          }}
          onRenameGroup={handleRenameGroup}
          onRecolorGroup={handleRecolorGroup}
          onDeleteGroup={handleDeleteGroup}
          onRemoveItem={webGroups.removeItem}
          onDeleted={() => navigate('/groups')}
        />
      );
    }
    return (
      <div className="phone-library" data-od-id="phone-groups-page" data-testid="phone-groups-page">
        <PhoneGroups
          groups={webGroups.groups}
          itemCountOf={webGroups.itemCountOf}
          onOpenGroup={(id) => {
            void navigate(`/groups/${id}`);
          }}
          isGuest={caps.isGuest}
          onCreateGroup={handleCreateGroup}
          onRenameGroup={handleRenameGroup}
          onRecolorGroup={handleRecolorGroup}
          onDeleteGroup={handleDeleteGroup}
          onOpenImport={() => setImportDialogOpen(true)}
        />
        <WebGroupImportDialog
          open={importDialogOpen}
          onClose={() => setImportDialogOpen(false)}
          existingGroups={webGroups.groups}
          repository={groupsRepository}
          availablePages={availablePages}
          onImported={async () => {
            await webGroups.refresh();
          }}
        />
      </div>
    );
  }

  return (
    <div className="lib-shell" data-od-id="groups-page" data-testid="groups-page">
      <div className="lib-rail" data-od-id="groups-rail" data-testid="groups-rail">
        <div className="lib-rail-head">
          <h1 data-od-id="groups-title">Groups</h1>
        </div>
        <div className="lib-rail-body">
          <WebGroupsRailSection
            isAuthenticated={!caps.isGuest}
            groups={webGroups.groups}
            activeGroupId={activeGroupId}
            activeUrl={filterUrl}
            activeDomain={filterDomain}
            itemCountOf={webGroups.itemCountOf}
            onCreateGroup={handleCreateGroup}
            onRenameGroup={handleRenameGroup}
            onRecolorGroup={handleRecolorGroup}
            onRemoveItem={webGroups.removeItem}
            onAddPage={webGroups.addPage}
            onDeleteGroup={handleDeleteGroup}
            onOpenImport={() => setImportDialogOpen(true)}
            itemsByGroup={webGroups.itemsByGroup}
            availablePages={availablePages}
            basePath="/groups"
            hideDivider
          />
        </div>
      </div>

      <div className="lib-main" data-od-id="groups-main" data-testid="groups-main">
        {activeGroup ? (
          <>
            <div className="lib-main-head" data-od-id="groups-head">
              <WebGroupHeader
                group={activeGroup}
                items={activeGroupItems}
                highlights={groupHighlights}
                onRename={handleRenameGroup}
                onRecolor={handleRecolorGroup}
                onDelete={handleDeleteGroup}
                onDeleted={() => {
                  const remaining = webGroups.groups.filter((g) => g.id !== activeGroup.id);
                  if (remaining.length > 0) {
                    void navigate(`/groups/${remaining[0]!.id}`);
                  } else {
                    void navigate('/groups');
                  }
                }}
              />
            </div>

            <div className="lib-search-wrap" data-od-id="groups-search">
              <div className="search-input-row">
                <span className="search-icon" aria-hidden="true">
                  ⌕
                </span>
                <input
                  id={searchInputId}
                  type="search"
                  className="search-input"
                  placeholder="Search highlights in this group…"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  autoComplete="off"
                  spellCheck={false}
                />
                {query ? (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={() => setQuery('')}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                ) : null}
              </div>
            </div>

            <div className="lib-main-body">
              {/* Add card only appears at group main view (when no subfilter is active) */}
              {!filterDomain && !filterUrl ? (
                <div className="lib-group-add-wrap">
                  <WebGroupPane
                    group={activeGroup}
                    items={activeGroupItems}
                    highlightCountForUrl={highlightCountForUrl}
                    availablePages={availablePageSuggestions}
                    availableDomains={availableDomains}
                    showHeader={false}
                    showItemsList={false}
                    showAddForms={true}
                    onAddPage={webGroups.addPage}
                    onAddDomain={webGroups.addDomain}
                    onRemoveItem={webGroups.removeItem}
                    onMoveItem={webGroups.moveItem}
                  />
                </div>
              ) : null}
              {detailHighlight ? (
                <LibraryHighlightDetail
                  highlight={detailHighlight}
                  related={[]}
                  relatedPages={[]}
                  relatedLabel=""
                  readOnly={caps.isGuest}
                  activeTagFilters={[]}
                  onBack={() => setSelectedHighlightId(null)}
                  onOpenRelatedPage={() => undefined}
                />
              ) : pagedHighlights.length > 0 ? (
                <div>
                  <div className="stack">
                    {pagedHighlights.map(({ highlight: h, matchedFields }) => {
                      const badge = formatMatchBadge(matchedFields);
                      return (
                        <WebHighlightCard
                          key={h.id}
                          highlight={h}
                          showDomain
                          matchBadge={badge}
                          readOnly={caps.isGuest}
                          activeTagFilters={[]}
                          onOpenHighlight={(id) => setSelectedHighlightId(id)}
                          onOpenPage={(domain, path) => {
                            window.open(`https://${domain}${path || ''}`, '_blank');
                          }}
                          onNoteSave={caps.isGuest ? undefined : handleNoteSave}
                          onTagsChange={caps.isGuest ? undefined : handleTagsChange}
                          onDelete={caps.isGuest ? undefined : handleHighlightDelete}
                          clientKind={clientKind}
                        />
                      );
                    })}
                  </div>
                  {totalPages > 1 ? (
                    <LibraryPager page={page} totalPages={totalPages} onPageChange={setPage} />
                  ) : null}
                </div>
              ) : (
                <div className="state-box" data-od-id="groups-empty">
                  <h3>No highlights in this group</h3>
                  <p>
                    {query
                      ? 'No highlights match your search in this group.'
                      : filterDomain || filterUrl
                      ? 'No highlights found for this page/domain in this group.'
                      : 'Pages and sites in this group have no saved highlights yet.'}
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="state-box" style={{ margin: 'auto' }} data-od-id="groups-empty-state" data-testid="groups-empty-state">
            <h3>No group selected</h3>
            <p>Select a group from the rail or create a new one to organize your research.</p>
          </div>
        )}
      </div>

      <WebGroupImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        existingGroups={webGroups.groups}
        repository={groupsRepository}
        availablePages={availablePages}
        onImported={async () => {
          await webGroups.refresh();
        }}
      />
    </div>
  );
}
