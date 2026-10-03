import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { DeleteConfirmDialog } from '@/features/collections/components/DeleteConfirmDialog';
import { ExportActions } from '@/features/collections/components/ExportActions';
import { HighlightSearchBar } from '@/features/collections/components/HighlightSearchBar';
import { LibraryDomainRow } from '@/features/collections/components/LibraryDomainRow';
import { LibraryHighlightTile } from '@/features/collections/components/LibraryHighlightTile';
import type { OpenedHighlight } from '@/features/collections/opened-highlight';
import { LibraryRelatedTags } from '@/features/collections/components/LibraryRelatedTags';
import {
  formatSearchMatchMeta,
  LibrarySearchGroupHeader,
} from '@/features/collections/components/LibrarySearchGroupHeader';
import { useHighlightDelete } from '@/features/collections/hooks/use-highlight-delete';
import { useCollections } from '@/features/collections/hooks/useCollections';
import { useHighlightSearch } from '@/features/collections/hooks/useHighlightSearch';
import {
  useLibraryRelatednessService,
  useRelatedTags,
} from '@/features/collections/hooks/useLibraryRelatedness';
import { useUserTags } from '@/features/collections/hooks/useUserTags';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useFilterStore } from '@/features/collections/stores/filter.store';
import { DEFAULT_MODE } from '@/shared/constants/mode-storage';
import {
  guestLibraryLocalBannerCopy,
  libraryNoMatchesCopy,
} from '@/shared/copy/product-surface-copy';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { deleteDomainCopy } from '@/shared/utils/confirm-dialog-copy';
import {
  buildGroupPageUrlSet,
  countGranularSearchResults,
  groupSearchResultsByDomainAndSection,
  matchDomainNames,
  matchGroupNames,
} from '@/shared/utils/group-library-search';
import {
  filterHighlightsByRefineAndTags,
  matchesGroupUrl,
} from '@/shared/utils/highlight-filter';
import { formatMatchBadge } from '@/shared/utils/highlight-search';
import { resolveLibraryAccess } from '@/shared/utils/mode-capabilities';
import { getSectionKey } from '@/shared/utils/section-key';
import { EmptyState } from '@/ui-system/components/composed/EmptyState';
import { LibraryEmptyGuest } from '@/ui-system/components/empty-states/LibraryEmptyGuest';
import { LibraryStarters } from '@/ui-system/components/empty-states/LibraryStarters';
import { ColorSwatch } from '@/ui-system/components/primitives/ColorSwatch';
import { useModeFeature } from '@/ui-system/hooks/useModeFeature';

export interface CollectionsViewProps {
  onCollectionClick?: (domain: string) => void;
  /** Drill into a specific result's domain/section (search results can span domains). */
  onSectionClick?: (domain: string, section: string) => void;
  isAuthenticated?: boolean;
  onSignIn?: () => void;
  onOpenHighlight?: (highlight: OpenedHighlight) => void;
  /** Open a page group in GroupDetailView (popup). Web falls back to noop until Task 1.9. */
  onGroupClick?: (groupId: string) => void;
}

export function CollectionsView({
  onCollectionClick,
  onSectionClick,
  isAuthenticated: propIsAuthenticated,
  onSignIn,
  onOpenHighlight,
  onGroupClick,
}: CollectionsViewProps): React.ReactElement {
  const navigate = useNavigate();
  const appContext = useApp();

  const isAuthenticated = propIsAuthenticated ?? appContext.isAuthenticated;
  const mode = (appContext.currentMode ?? DEFAULT_MODE) as ModeType;


  const { collections, isLoading } = useCollections(mode);
  const exportGate = useModeFeature('export', isAuthenticated);
  const tagsGate = useModeFeature('tags', isAuthenticated);
  const { deleteScope } = useHighlightDelete();
  const { tags: userTags, tagNames: labelSuggestions } = useUserTags(isAuthenticated);

  const {
    query: searchQuery,
    fields: searchFields,
    refine,
    tagFilters,
    setQuery: setSearchQuery,
    setFields: setSearchFields,
    setRefine,
    setTagFilters,
    resetAll: resetFilterStore,
  } = useFilterStore();
  const [groupFilters, setGroupFilters] = useState<string[]>([]);
  const [deleteDomain, setDeleteDomain] = useState<{
    domain: string;
    count: number;
  } | null>(null);
  const [isDeletingDomain, setIsDeletingDomain] = useState(false);
  const [expandedHighlightId, setExpandedHighlightId] = useState<string | null>(null);

  const { results: searchResults, isLoading: isSearchLoading } = useHighlightSearch({
    query: searchQuery,
    scope: { kind: 'library' },
    fields: searchFields,
    refine,
    tagFilters,
  });

  // Page Groups for the Group filter + group-name matches (read-only here).
  const { groups: pageGroups, items: groupItems } = useGroups();
  const liveGroups = useMemo(
    () => pageGroups.filter((g) => g.deletedAt === null),
    [pageGroups]
  );
  const availableGroups = useMemo(
    () => liveGroups.map((g) => ({ id: g.id, name: g.name })),
    [liveGroups]
  );

  /** Known pages for domain-rule expansion: the current search corpus. */
  const knownGroupPages = useMemo(
    () => searchResults.map((r) => ({ urlNormalized: r.url })),
    [searchResults]
  );
  const groupUrlSet = useMemo(
    () => buildGroupPageUrlSet(groupItems, knownGroupPages, groupFilters),
    [groupItems, knownGroupPages, groupFilters]
  );

  const filteredResults = useMemo(
    () =>
      filterHighlightsByRefineAndTags(searchResults, {
        refine,
        tagFilters,
        groupUrlSet,
      }),
    [searchResults, refine, tagFilters, groupUrlSet]
  );

  const hasFilter =
    searchQuery.trim().length > 0 || refine.length > 0 || tagFilters.length > 0;
  const isSearching = hasFilter;
  const showResultsList = hasFilter;

  const searchGroups = useMemo(() => {
    if (!hasFilter) return [];
    // Domain chip (or default All) also matches collection hostnames with zero quote hits.
    const domainFieldOn = searchFields.length === 0 || searchFields.includes('domain');
    const nameMatchedDomains =
      domainFieldOn && searchQuery.trim().length > 0
        ? matchDomainNames(
            collections.map((c) => c.domain),
            searchQuery
          )
        : [];
    return groupSearchResultsByDomainAndSection(filteredResults, {
      nameMatchedDomains,
    });
  }, [hasFilter, collections, searchQuery, filteredResults, searchFields]);

  const searchResultCount = useMemo(
    () => countGranularSearchResults(searchGroups),
    [searchGroups]
  );

  /**
   * Group-name matches render as a section ABOVE domains (read-only: name,
   * swatch, highlight count — no edit controls). Counts reuse the filtered
   * results scoped to each group's resolved pages.
   */
  const matchedGroups = useMemo(() => {
    if (!isSearching) return [];
    return matchGroupNames(liveGroups, searchQuery).map((group) => {
      const urls = buildGroupPageUrlSet(groupItems, knownGroupPages, [group.id]);
      const highlights = urls
        ? filteredResults.filter((r) => matchesGroupUrl(r, urls))
        : filteredResults;
      return { group, highlights };
    });
  }, [isSearching, liveGroups, searchQuery, groupItems, knownGroupPages, filteredResults]);

  const pureGroupNameMatches = useMemo(
    () => matchedGroups.filter((m) => m.highlights.length === 0).length,
    [matchedGroups]
  );

  const availableTags = useMemo(
    () => userTags.map((t) => ({ label: t.name })),
    [userTags]
  );

  const relatednessInputs = useMemo(
    () =>
      filteredResults.map((r) => ({
        id: r.id,
        text: r.text,
        notes: r.notes,
        url: r.url,
        domain: r.domain,
        path: r.path,
        tags: r.tags,
      })),
    [filteredResults]
  );
  const relatedness = useLibraryRelatednessService(relatednessInputs);
  const relatedTagResults = useRelatedTags(relatedness, tagFilters);
  const noMatches = libraryNoMatchesCopy();
  const guestLocalBanner = guestLibraryLocalBannerCopy();

  const clearSearchAndFilters = (): void => {
    resetFilterStore();
    setGroupFilters([]);
  };
  const handleCollectionClick = (domain: string): void => {
    if (onCollectionClick) {
      onCollectionClick(domain);
      return;
    }
    navigate(`/domain/${domain}`);
  };

  const handleResultSectionClick = (resultDomain: string, sectionKey: string): void => {
    if (onSectionClick) {
      onSectionClick(resultDomain, sectionKey);
      return;
    }
    navigate(`/domain/${resultDomain}/section/${encodeURIComponent(sectionKey)}`);
  };

  const handleDeleteDomain = async (): Promise<void> => {
    if (!deleteDomain || isDeletingDomain) return;
    setIsDeletingDomain(true);
    try {
      const result = await deleteScope({ scope: 'domain', domain: deleteDomain.domain });
      if (!result?.success) return;
      setDeleteDomain(null);
    } finally {
      setIsDeletingDomain(false);
    }
  };

  const totalHighlights = collections.reduce((acc, c) => acc + c.highlightCount, 0);
  const libraryAccess = resolveLibraryAccess(isAuthenticated, totalHighlights);

  if (libraryAccess.showSignInPrompt && !isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
        }}
      >
        <div className="popup-page-title-wrap">
          <h1 className="popup-page-title" data-testid="library-title">
            Library
          </h1>
        </div>
        <LibraryEmptyGuest onSignIn={onSignIn} />
      </div>
    );
  }

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}
    >
      <div className="popup-page-title-wrap">
        <h1 className="popup-page-title" data-testid="library-title">
          Library
        </h1>
      </div>

      {!isAuthenticated && totalHighlights > 0 && (
        <div
          className="u-sans"
          data-testid="library-guest-local-banner"
          style={{
            margin: '10px 16px 0',
            padding: 12,
            border: '1px solid var(--rule-soft)',
            background: 'var(--paper-2)',
            fontSize: 13,
            color: 'var(--ink-2)',
            lineHeight: 1.45,
          }}
        >
          {guestLocalBanner.body}
          {onSignIn ? (
            <button
              type="button"
              className="btn accent sm"
              style={{ marginTop: 10, display: 'block' }}
              onClick={onSignIn}
            >
              {guestLocalBanner.signInLabel ?? 'Sign in'}
            </button>
          ) : null}
        </div>
      )}

      <div style={{ padding: '10px 16px 0' }}>
        <HighlightSearchBar
          query={searchQuery}
          onQueryChange={setSearchQuery}
          fields={searchFields}
          onFieldsChange={setSearchFields}
          refine={refine}
          onRefineChange={setRefine}
          tagFilters={tagFilters}
          onTagFiltersChange={setTagFilters}
          availableTags={availableTags}
          availableGroups={availableGroups}
          groupFilters={groupFilters}
          onGroupFiltersChange={setGroupFilters}
          resultCount={isSearching ? searchResultCount + pureGroupNameMatches : undefined}
        />
      </div>

      <div
        className="list-scroll"
        style={{ marginTop: 10, flex: 1, overflowY: 'auto', minHeight: 0 }}
      >
        <LibraryRelatedTags
          tags={relatedTagResults}
          onSelectTag={(tag) => setTagFilters([tag])}
        />
        {isLoading ? (
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
        ) : showResultsList ? (
          isSearchLoading ? (
            <div style={{ padding: '8px 0' }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    height: 44,
                    margin: '0 16px 8px',
                    border: '1px solid var(--rule-soft)',
                    background: 'var(--paper-2)',
                    opacity: 0.6,
                  }}
                />
              ))}
            </div>
          ) : searchGroups.length === 0 && matchedGroups.length === 0 ? (
            <EmptyState
              variant="no-results"
              size="sm"
              title={noMatches.title}
              description={noMatches.body}
              action={{ label: noMatches.resetLabel, onClick: clearSearchAndFilters }}
            />
          ) : (
            <>
              {matchedGroups.length > 0 ? (
                <div data-testid="search-group-section">
                  {matchedGroups.map(({ group, highlights }) => (
                    <LibrarySearchGroupHeader
                      key={group.id}
                      level="group"
                      title={group.name}
                      meta={formatSearchMatchMeta(highlights.length, true)}
                      leading={
                        <ColorSwatch color={group.color} size="sm" variant="solid" />
                      }
                      onOpen={() => onGroupClick?.(group.id)}
                    />
                  ))}
                </div>
              ) : null}
              {searchGroups.map((group) => (
              <div key={group.domain} data-testid="search-domain-group">
                <LibrarySearchGroupHeader
                  level="domain"
                  title={group.domain}
                  meta={formatSearchMatchMeta(group.matchCount, group.nameMatched)}
                  onOpen={() => handleCollectionClick(group.domain)}
                />
                {group.sections.map((section) => (
                  <div
                    key={`${group.domain}::${section.sectionKey}`}
                    data-testid="search-section-group"
                  >
                    <LibrarySearchGroupHeader
                      level="section"
                      title={section.sectionKey}
                      meta={formatSearchMatchMeta(
                        section.matchCount,
                        section.nameMatched
                      )}
                      onOpen={() =>
                        handleResultSectionClick(group.domain, section.sectionKey)
                      }
                    />
                    {section.highlights.map((r) => (
                      <LibraryHighlightTile
                        key={r.id}
                        onOpenDetail={() =>
                          onOpenHighlight?.({
                            id: r.id,
                            text: r.text,
                            domain: r.domain,
                            path: r.path,
                            url: r.url,
                            notes: r.notes,
                            tags: r.tags,
                          })
                        }
                        highlight={{
                          id: r.id,
                          text: r.text,
                          domain: r.domain,
                          path: r.path,
                          sourceKind: r.sourceKind,
                          language: r.language,
                          presentation: r.presentation,
                          notes: r.notes,
                          tags: r.tags,
                        }}
                        onSectionClick={() =>
                          handleResultSectionClick(
                            r.domain,
                            getSectionKey({ url: r.url, path: r.path })
                          )
                        }
                        allowMarginalia={tagsGate.allowed}
                        isExpanded={expandedHighlightId === r.id}
                        onToggleExpand={() => {
                          setExpandedHighlightId((prev) => (prev === r.id ? null : r.id));
                        }}
                        suggestions={labelSuggestions}
                        onDelete={async () => {
                          const result = await deleteScope({
                            scope: 'highlight',
                            id: r.id,
                          });
                          if (!result?.success) {
                            throw new Error(result?.error ?? 'Delete failed');
                          }
                        }}
                        matchBadge={formatMatchBadge(r.matchedFields)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            ))}
            </>
          )
        ) : collections.length === 0 && isAuthenticated ? (
          <LibraryStarters />
        ) : (
          collections.map((c) => (
            <LibraryDomainRow
              key={c.id}
              domain={c.domain}
              count={c.highlightCount}
              sub={c.lastActive ? new Date(c.lastActive).toLocaleDateString() : undefined}
              onOpen={() => handleCollectionClick(c.domain)}
              showActions={isAuthenticated}
              onDelete={
                isAuthenticated
                  ? () => setDeleteDomain({ domain: c.domain, count: c.highlightCount })
                  : undefined
              }
            />
          ))
        )}
      </div>

      {(() => {
        const copy = deleteDomain
          ? deleteDomainCopy(deleteDomain.domain, deleteDomain.count)
          : null;
        return (
          <DeleteConfirmDialog
            open={deleteDomain !== null}
            onClose={() => setDeleteDomain(null)}
            severity={copy?.severity}
            title={copy?.title ?? 'Delete this domain?'}
            message={copy?.message ?? ''}
            note={copy?.note}
            strongNames={copy?.strongNames}
            confirmLabel={copy?.confirmLabel}
            cancelLabel={copy?.cancelLabel}
            onConfirm={() => {
              void handleDeleteDomain();
            }}
            isConfirming={isDeletingDomain}
            exportFooter={
              deleteDomain ? (
                <ExportActions
                  scope={{ kind: 'domain', domain: deleteDomain.domain }}
                  highlightCount={deleteDomain.count}
                  disabled={!exportGate.allowed}
                />
              ) : undefined
            }
          />
        );
      })()}
    </div>
  );
}
