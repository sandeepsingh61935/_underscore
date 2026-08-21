import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { useCollections } from '@/features/collections/hooks/useCollections';
import { HighlightSearchBar } from '@/features/collections/components/HighlightSearchBar';
import { useHighlightSearch } from '@/features/collections/hooks/useHighlightSearch';
import { LibraryHighlightTile } from '@/features/collections/components/LibraryHighlightTile';
import { LibraryDomainRow } from '@/features/collections/components/LibraryDomainRow';
import {
  formatSearchMatchMeta,
  LibrarySearchGroupHeader,
} from '@/features/collections/components/LibrarySearchGroupHeader';
import { DeleteConfirmDialog } from '@/features/collections/components/DeleteConfirmDialog';
import { ExportActions } from '@/features/collections/components/ExportActions';
import { useHighlightDelete } from '@/features/collections/hooks/use-highlight-delete';
import { useUserTags } from '@/features/collections/hooks/useUserTags';
import { DEFAULT_MODE } from '@/shared/constants/mode-storage';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { deleteDomainCopy } from '@/shared/utils/confirm-dialog-copy';
import {
  countGranularSearchResults,
  groupSearchResultsByDomainAndSection,
  matchDomainNames,
} from '@/shared/utils/group-library-search';
import { resolveLibraryAccess } from '@/shared/utils/mode-capabilities';
import { getSectionKey } from '@/shared/utils/section-key';
import { formatMatchBadge, type SearchField } from '@/shared/utils/highlight-search';
import {
  DEFAULT_SEARCH_FIELDS,
  filterHighlightsByRefineAndTags,
  type RefineFilter,
} from '@/shared/utils/highlight-filter';
import { useModeFeature } from '@/ui-system/hooks/useModeFeature';
import { LibraryRelatedTags } from '@/features/collections/components/LibraryRelatedTags';
import {
  useLibraryRelatednessService,
  useRelatedTags,
} from '@/features/collections/hooks/useLibraryRelatedness';
import {
  guestLibraryLocalBannerCopy,
  libraryNoMatchesCopy,
} from '@/shared/copy/product-surface-copy';
import { EmptyState } from '@/ui-system/components/composed/EmptyState';
import { LibraryEmptyGuest } from '@/ui-system/components/empty-states/LibraryEmptyGuest';
import { LibraryStarters } from '@/ui-system/components/empty-states/LibraryStarters';

export interface CollectionsViewProps {
  onCollectionClick?: (domain: string) => void;
  /** Drill into a specific result's domain/section (search results can span domains). */
  onSectionClick?: (domain: string, section: string) => void;
  isAuthenticated?: boolean;
  onSignIn?: () => void;
}

export function CollectionsView({
  onCollectionClick,
  onSectionClick,
  isAuthenticated: propIsAuthenticated,
  onSignIn,
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

  const [searchQuery, setSearchQuery] = useState('');
  const [searchFields, setSearchFields] = useState<SearchField[]>([...DEFAULT_SEARCH_FIELDS]);
  const [refine, setRefine] = useState<RefineFilter[]>([]);
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [deleteDomain, setDeleteDomain] = useState<{ domain: string; count: number } | null>(null);
  const [isDeletingDomain, setIsDeletingDomain] = useState(false);
  const [expandedHighlightId, setExpandedHighlightId] = useState<string | null>(null);

  const { results: searchResults, isLoading: isSearchLoading } = useHighlightSearch({
    query: searchQuery,
    scope: { kind: 'library' },
    fields: searchFields,
  });

  const filteredResults = useMemo(
    () => filterHighlightsByRefineAndTags(searchResults, { refine, tagFilters }),
    [searchResults, refine, tagFilters],
  );

  const isSearching = searchQuery.trim().length > 0;
  const showResultsList = isSearching;

  const searchGroups = useMemo(() => {
    if (!isSearching) return [];
    // Domain chip (or default All) also matches collection hostnames with zero quote hits.
    const domainFieldOn =
      searchFields.length === 0 || searchFields.includes('domain');
    const nameMatchedDomains = domainFieldOn
      ? matchDomainNames(
          collections.map((c) => c.domain),
          searchQuery,
        )
      : [];
    return groupSearchResultsByDomainAndSection(filteredResults, {
      nameMatchedDomains,
    });
  }, [isSearching, collections, searchQuery, filteredResults, searchFields]);

  const searchResultCount = useMemo(
    () => countGranularSearchResults(searchGroups),
    [searchGroups],
  );

  const availableTags = useMemo(
    () => userTags.map((t) => ({ label: t.name })),
    [userTags],
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
    [filteredResults],
  );
  const relatedness = useLibraryRelatednessService(relatednessInputs);
  const relatedTagResults = useRelatedTags(relatedness, tagFilters);
  const noMatches = libraryNoMatchesCopy();
  const guestLocalBanner = guestLibraryLocalBannerCopy();

  const clearSearchAndFilters = (): void => {
    setSearchQuery('');
    setSearchFields([...DEFAULT_SEARCH_FIELDS]);
    setRefine([]);
    setTagFilters([]);
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
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
        <div style={{ padding: '12px 16px 6px' }}>
          <div className="u-serif" style={{ fontSize: 32, lineHeight: 1, letterSpacing: '-0.025em' }}>
            Library
          </div>
        </div>
        <LibraryEmptyGuest onSignIn={onSignIn} />
      </div>
    );
  }

  const kicker = isAuthenticated
    ? `${collections.length} domains · ${totalHighlights} highlights`
    : `Guest · ${collections.length} domains · ${totalHighlights} highlights`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <div style={{ padding: '10px 16px 0' }}>
        <div className="u-serif" style={{ fontSize: 32, lineHeight: 1, letterSpacing: '-0.025em' }}>
          Library
        </div>
        <div className="u-mono" style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.14em', marginTop: 4 }}>
          {kicker}
        </div>
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
          resultCount={isSearching ? searchResultCount : undefined}
        />
      </div>

      <div className="list-scroll" style={{ marginTop: 10, flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <LibraryRelatedTags
          tags={relatedTagResults}
          onSelectTag={(tag) => setTagFilters([tag])}
        />
        {isLoading ? (
          <div style={{ padding: '20px 16px', textAlign: 'center' }}>
            <span className="u-mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>Loading...</span>
          </div>
        ) : showResultsList ? (
          isSearchLoading ? (
            <div style={{ padding: '20px 16px', textAlign: 'center' }}>
              <span className="u-mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>Loading...</span>
            </div>
          ) : searchGroups.length === 0 ? (
            <EmptyState
              variant="no-results"
              size="sm"
              title={noMatches.title}
              description={noMatches.body}
              action={{ label: noMatches.resetLabel, onClick: clearSearchAndFilters }}
            />
          ) : (
            searchGroups.map((group) => (
              <div key={group.domain} data-testid="search-domain-group">
                <LibrarySearchGroupHeader
                  level="domain"
                  title={group.domain}
                  meta={formatSearchMatchMeta(group.matchCount, group.nameMatched)}
                  onOpen={() => handleCollectionClick(group.domain)}
                />
                {group.sections.map((section) => (
                  <div key={`${group.domain}::${section.sectionKey}`} data-testid="search-section-group">
                    <LibrarySearchGroupHeader
                      level="section"
                      title={section.sectionKey}
                      meta={formatSearchMatchMeta(section.matchCount, section.nameMatched)}
                      onOpen={() => handleResultSectionClick(group.domain, section.sectionKey)}
                    />
                    {section.highlights.map((r) => (
                      <LibraryHighlightTile
                        key={r.id}
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
                            getSectionKey({ url: r.url, path: r.path }),
                          )
                        }
                        allowMarginalia={tagsGate.allowed}
                        isExpanded={expandedHighlightId === r.id}
                        onToggleExpand={() => {
                          setExpandedHighlightId((prev) => (prev === r.id ? null : r.id));
                        }}
                        suggestions={labelSuggestions}
                        onDelete={async () => {
                          const result = await deleteScope({ scope: 'highlight', id: r.id });
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
            ))
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
            onConfirm={() => { void handleDeleteDomain(); }}
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
