import React, { useMemo, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { DeleteConfirmDialog } from '@/features/collections/components/DeleteConfirmDialog';
import { ExportActions } from '@/features/collections/components/ExportActions';
import { HighlightSearchBar } from '@/features/collections/components/HighlightSearchBar';
import { LibraryHighlightTile } from '@/features/collections/components/LibraryHighlightTile';
import { LibraryRelatedHighlights } from '@/features/collections/components/LibraryRelatedHighlights';
import { LibraryRelatedTags } from '@/features/collections/components/LibraryRelatedTags';
import { LibraryScopeChrome } from '@/features/collections/components/LibraryScopeChrome';
import { useHighlightDelete } from '@/features/collections/hooks/use-highlight-delete';
import { useHighlightsByDomain } from '@/features/collections/hooks/useHighlightsByDomainFactory';
import { useHighlightSearch } from '@/features/collections/hooks/useHighlightSearch';
import {
  useLibraryRelatednessService,
  useRelatedHighlights,
  useRelatedTags,
} from '@/features/collections/hooks/useLibraryRelatedness';
import { useUserTags } from '@/features/collections/hooks/useUserTags';
import { AUTH_REQUIRED_MODES, DEFAULT_MODE } from '@/shared/constants/mode-storage';
import { libraryNoMatchesCopy } from '@/shared/copy/product-surface-copy';
import {
  sortLibraryHighlights,
  type LibrarySortKey,
} from '@/shared/library/library-sort';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { deleteSectionCopy } from '@/shared/utils/confirm-dialog-copy';
import { highlightActivityMs } from '@/shared/utils/highlight-activity';
import {
  DEFAULT_SEARCH_FIELDS,
  filterHighlightsByRefineAndTags,
  type RefineFilter,
} from '@/shared/utils/highlight-filter';
import { formatMatchBadge, type SearchField } from '@/shared/utils/highlight-search';
import { getSectionKey } from '@/shared/utils/section-key';
import { EmptyState } from '@/ui-system/components/composed/EmptyState';
import { EmptySubDomain } from '@/ui-system/components/empty-states/EmptySubDomain';
import { useModeFeature } from '@/ui-system/hooks/useModeFeature';

export interface SubDomainViewProps {
  domain?: string;
  section?: string;
  onBack?: () => void;
  /** When the domain has no highlights left, return to Library (Collections). */
  onDomainEmpty?: () => void;
}

export function SubDomainView({
  domain: propDomain,
  section: propSection,
  onBack: _onBack,
  onDomainEmpty,
}: SubDomainViewProps): React.ReactElement {
  const params = useParams<{ domain: string; section: string }>();
  const domain = propDomain ?? params.domain ?? '';
  const section =
    propSection ?? (params.section ? decodeURIComponent(params.section) : '/');

  const navigate = useNavigate();
  const { isAuthenticated, currentMode } = useApp();
  const mode = (currentMode ?? DEFAULT_MODE) as ModeType;

  useEffect(() => {
    if (!isAuthenticated && AUTH_REQUIRED_MODES.includes(mode)) {
      navigate('/home');
    }
  }, [isAuthenticated, mode, navigate]);

  const { highlights, isLoading } = useHighlightsByDomain(domain, isAuthenticated);
  const exportGate = useModeFeature('export', isAuthenticated);
  const tagsGate = useModeFeature('tags', isAuthenticated);
  const exportDisabled = !exportGate.allowed;
  const { deleteScope } = useHighlightDelete();
  const [deleteSectionOpen, setDeleteSectionOpen] = useState(false);
  const [isDeletingSection, setIsDeletingSection] = useState(false);
  const [expandedHighlightId, setExpandedHighlightId] = useState<string | null>(null);
  const { tagNames: labelSuggestions } = useUserTags(isAuthenticated);

  const sectionHighlights = useMemo(() => {
    return highlights.filter(
      (h) => getSectionKey({ url: h.url, path: h.path }) === section
    );
  }, [highlights, section]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchFields, setSearchFields] = useState<SearchField[]>([
    ...DEFAULT_SEARCH_FIELDS,
  ]);
  const [refine, setRefine] = useState<RefineFilter[]>([]);
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [sort, setSort] = useState<LibrarySortKey>('newest');

  useEffect(() => {
    setSearchQuery('');
    setRefine([]);
    setTagFilters([]);
    setSearchFields([...DEFAULT_SEARCH_FIELDS]);
    setSort('newest');
  }, [domain, section]);

  const { results: searchResults, isLoading: isSearchLoading } = useHighlightSearch({
    query: searchQuery,
    scope: { kind: 'section', domain, section },
    fields: searchFields,
  });
  const filteredSearchResults = useMemo(
    () => filterHighlightsByRefineAndTags(searchResults, { refine, tagFilters }),
    [searchResults, refine, tagFilters]
  );
  const filteredSectionHighlights = useMemo(
    () => filterHighlightsByRefineAndTags(sectionHighlights, { refine, tagFilters }),
    [sectionHighlights, refine, tagFilters]
  );
  const isSearching = searchQuery.trim().length > 0;
  const hasRefineOrTags = refine.length > 0 || tagFilters.length > 0;
  const availableTags = useMemo(
    () => labelSuggestions.map((name) => ({ label: name })),
    [labelSuggestions]
  );

  const relatedness = useLibraryRelatednessService(sectionHighlights);
  const relatedTagResults = useRelatedTags(relatedness, tagFilters);
  const relatedHighlightResults = useRelatedHighlights(relatedness, expandedHighlightId);

  const sortedSectionHighlights = useMemo(() => {
    const rows = filteredSectionHighlights.map((h) => ({
      ...h,
      activityMs: highlightActivityMs({
        updatedAt: h.updatedAt,
        createdAt: h.createdAt,
      }),
      domain,
    }));
    return sortLibraryHighlights(rows, sort);
  }, [filteredSectionHighlights, sort, domain]);

  const sortedSearchResults = useMemo(() => {
    const rows = filteredSearchResults.map((r) => ({
      ...r,
      activityMs: highlightActivityMs({
        createdAt: r.createdAt,
      }),
      text: r.text,
      domain: r.domain,
    }));
    return sortLibraryHighlights(rows, sort);
  }, [filteredSearchResults, sort]);

  const relatedHighlightRows = useMemo(() => {
    return relatedHighlightResults.map((r) => {
      const h = sectionHighlights.find((x) => x.id === r.id);
      return {
        ...r,
        text: h?.text ?? '',
        domain: domain,
        path: h ? getSectionKey({ url: h.url, path: h.path }) : section,
      };
    });
  }, [relatedHighlightResults, sectionHighlights, domain, section]);

  const noMatches = libraryNoMatchesCopy();

  const clearSearchAndFilters = (): void => {
    setSearchQuery('');
    setSearchFields([...DEFAULT_SEARCH_FIELDS]);
    setRefine([]);
    setTagFilters([]);
  };

  useEffect(() => {
    if (isLoading) return;

    if (highlights.length === 0) {
      if (onDomainEmpty) {
        onDomainEmpty();
      } else {
        navigate('/library');
      }
    }
  }, [domain, highlights.length, isLoading, navigate, onDomainEmpty]);

  const handleBackToDomain = (): void => {
    if (_onBack) {
      _onBack();
      return;
    }
    navigate(`/domain/${encodeURIComponent(domain)}`);
  };

  const handleDeleteSection = async (): Promise<void> => {
    if (isDeletingSection) return;
    setIsDeletingSection(true);
    try {
      const result = await deleteScope({ scope: 'section', domain, sectionKey: section });
      if (!result?.success) return;
      setDeleteSectionOpen(false);
      handleBackToDomain();
    } finally {
      setIsDeletingSection(false);
    }
  };

  if (!isLoading && highlights.length > 0 && sectionHighlights.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
          minHeight: 0,
        }}
      >
        <EmptySubDomain domain={domain} section={section} onBack={handleBackToDomain} />
      </div>
    );
  }

  const sectionTitle = section === '/' ? '/' : section;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        minHeight: 0,
      }}
    >
      <LibraryScopeChrome
        testId="section-sticky-chrome"
        toolbarTestId="section-scope-toolbar"
        title={sectionTitle}
        highlightCount={sectionHighlights.length}
        exportScope={{ kind: 'section', domain, sectionKey: section }}
        exportDisabled={exportDisabled}
        onDelete={() => setDeleteSectionOpen(true)}
        deleteAriaLabel="Delete section"
        sort={sort}
        onSortChange={setSort}
        searchSlot={
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
            resultCount={
              isSearching
                ? sortedSearchResults.length
                : hasRefineOrTags
                  ? sortedSectionHighlights.length
                  : undefined
            }
          />
        }
      />

      <div className="list-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <LibraryRelatedTags
          tags={relatedTagResults}
          onSelectTag={(tag) => setTagFilters([tag])}
        />

        {isLoading ? (
          <div style={{ padding: '20px 16px', textAlign: 'center' }}>
            <span className="u-mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>
              Loading...
            </span>
          </div>
        ) : isSearching ? (
          isSearchLoading ? (
            <div style={{ padding: '20px 16px', textAlign: 'center' }}>
              <span className="u-mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>
                Loading...
              </span>
            </div>
          ) : sortedSearchResults.length === 0 ? (
            <EmptyState
              variant="no-results"
              size="sm"
              title={noMatches.title}
              description={noMatches.body}
              action={{ label: noMatches.resetLabel, onClick: clearSearchAndFilters }}
            />
          ) : (
            sortedSearchResults.map((r) => (
              <React.Fragment key={r.id}>
                <LibraryHighlightTile
                  highlight={{
                    id: r.id,
                    text: r.text,
                    domain: r.domain,
                    path: r.path,
                    notes: r.notes,
                    tags: r.tags,
                    sourceKind: r.sourceKind,
                    language: r.language,
                    presentation: r.presentation,
                  }}
                  showLocationMeta={false}
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
                {expandedHighlightId === r.id ? (
                  <LibraryRelatedHighlights
                    items={relatedHighlightRows}
                    onOpen={(id) => setExpandedHighlightId(id)}
                  />
                ) : null}
              </React.Fragment>
            ))
          )
        ) : hasRefineOrTags && sortedSectionHighlights.length === 0 ? (
          <EmptyState
            variant="no-results"
            size="sm"
            title={noMatches.title}
            description={noMatches.body}
            action={{ label: noMatches.resetLabel, onClick: clearSearchAndFilters }}
          />
        ) : (
          sortedSectionHighlights.map((h) => (
            <React.Fragment key={h.id}>
              <LibraryHighlightTile
                highlight={{
                  id: h.id,
                  text: h.text,
                  domain,
                  path: section,
                  notes: h.notes,
                  tags: h.tags,
                  sourceKind: h.sourceKind,
                  language: h.language,
                  presentation: h.presentation,
                }}
                showLocationMeta={false}
                allowMarginalia={tagsGate.allowed}
                isExpanded={expandedHighlightId === h.id}
                onToggleExpand={() => {
                  setExpandedHighlightId((prev) => (prev === h.id ? null : h.id));
                }}
                suggestions={labelSuggestions}
                onDelete={async () => {
                  const result = await deleteScope({ scope: 'highlight', id: h.id });
                  if (!result?.success) {
                    throw new Error(result?.error ?? 'Delete failed');
                  }
                }}
              />
              {expandedHighlightId === h.id ? (
                <LibraryRelatedHighlights
                  items={relatedHighlightRows}
                  onOpen={(id) => setExpandedHighlightId(id)}
                />
              ) : null}
            </React.Fragment>
          ))
        )}
      </div>

      {(() => {
        const copy = deleteSectionCopy(domain, section, sectionHighlights.length);
        return (
          <DeleteConfirmDialog
            open={deleteSectionOpen}
            onClose={() => setDeleteSectionOpen(false)}
            severity={copy.severity}
            title={copy.title}
            message={copy.message}
            note={copy.note}
            strongNames={copy.strongNames}
            confirmLabel={copy.confirmLabel}
            cancelLabel={copy.cancelLabel}
            onConfirm={() => {
              void handleDeleteSection();
            }}
            isConfirming={isDeletingSection}
            exportFooter={
              <ExportActions
                scope={{ kind: 'section', domain, sectionKey: section }}
                highlightCount={sectionHighlights.length}
                disabled={exportDisabled}
              />
            }
          />
        );
      })()}
    </div>
  );
}
