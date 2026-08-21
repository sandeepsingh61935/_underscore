import React, { useMemo, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { useHighlightsByDomain } from '@/features/collections/hooks/useHighlightsByDomainFactory';
import { ExportActions } from '@/features/collections/components/ExportActions';
import { DeleteConfirmDialog } from '@/features/collections/components/DeleteConfirmDialog';
import { useHighlightDelete } from '@/features/collections/hooks/use-highlight-delete';
import { LibraryScopeChrome } from '@/features/collections/components/LibraryScopeChrome';
import { HighlightSearchBar } from '@/features/collections/components/HighlightSearchBar';
import { useHighlightSearch } from '@/features/collections/hooks/useHighlightSearch';
import { LibraryHighlightTile } from '@/features/collections/components/LibraryHighlightTile';
import {
  formatSearchMatchMeta,
  LibrarySearchGroupHeader,
} from '@/features/collections/components/LibrarySearchGroupHeader';
import { LibrarySectionRow } from '@/features/collections/components/LibrarySectionRow';
import { useSectionLabels } from '@/features/collections/hooks/useSectionLabels';
import { useUserTags } from '@/features/collections/hooks/useUserTags';
import { AUTH_REQUIRED_MODES, DEFAULT_MODE } from '@/shared/constants/mode-storage';
import type { LibrarySortKey } from '@/shared/library/library-sort';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { displaySectionTitle } from '@/shared/services/section-label-store';
import { getSectionKey } from '@/shared/utils/section-key';
import { highlightActivityMs } from '@/shared/utils/highlight-activity';
import {
  countSectionGranularResults,
  groupSearchResultsBySection,
  matchSectionNames,
} from '@/shared/utils/group-library-search';
import { formatMatchBadge, type SearchField } from '@/shared/utils/highlight-search';
import {
  DEFAULT_SEARCH_FIELDS,
  filterHighlightsByRefineAndTags,
  type RefineFilter,
} from '@/shared/utils/highlight-filter';
import {
  deleteDomainCopy,
  deleteSectionCopy,
} from '@/shared/utils/confirm-dialog-copy';
import { useModeFeature } from '@/ui-system/hooks/useModeFeature';
import { EmptyState } from '@/ui-system/components/composed/EmptyState';

export interface DomainDetailsViewProps {
  domain?: string;
  onBack?: () => void;
  onSectionClick?: (domain: string, section: string) => void;
}

export function DomainDetailsView({
  domain: propDomain,
  onBack: _onBack,
  onSectionClick,
}: DomainDetailsViewProps): React.ReactElement {
  const params = useParams<{ domain: string }>();
  const domain = propDomain ?? params.domain ?? '';
  const navigate = useNavigate();
  const { isAuthenticated, currentMode } = useApp();
  const mode = (currentMode ?? DEFAULT_MODE) as ModeType;

  useEffect(() => {
    if (!isAuthenticated && AUTH_REQUIRED_MODES.includes(mode)) {
      navigate('/home');
    }
  }, [isAuthenticated, mode, navigate]);

  const { labels } = useSectionLabels(domain, mode);

  const { highlights, isLoading } = useHighlightsByDomain(domain, isAuthenticated);
  const exportGate = useModeFeature('export', isAuthenticated);
  const tagsGate = useModeFeature('tags', isAuthenticated);
  const exportDisabled = !exportGate.allowed;
  const { deleteScope } = useHighlightDelete();
  const [deleteDomainOpen, setDeleteDomainOpen] = useState(false);
  const [isDeletingDomain, setIsDeletingDomain] = useState(false);
  const [deleteSection, setDeleteSection] = useState<{ path: string; count: number } | null>(null);
  const [isDeletingSection, setIsDeletingSection] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchFields, setSearchFields] = useState<SearchField[]>([...DEFAULT_SEARCH_FIELDS]);
  const [refine, setRefine] = useState<RefineFilter[]>([]);
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [expandedHighlightId, setExpandedHighlightId] = useState<string | null>(null);
  const [sort, setSort] = useState<LibrarySortKey>('newest');
  const { tags: userTags, tagNames: labelSuggestions } = useUserTags(isAuthenticated);

  useEffect(() => {
    setSearchQuery('');
    setRefine([]);
    setTagFilters([]);
    setSearchFields([...DEFAULT_SEARCH_FIELDS]);
  }, [domain]);

  const { results: searchResults, isLoading: isSearchLoading } = useHighlightSearch({
    query: searchQuery,
    scope: { kind: 'domain', domain },
    fields: searchFields,
  });
  const filteredResults = useMemo(
    () => filterHighlightsByRefineAndTags(searchResults, { refine, tagFilters }),
    [searchResults, refine, tagFilters],
  );
  const isSearching = searchQuery.trim().length > 0;
  const availableTags = useMemo(
    () => userTags.map((t) => ({ label: t.name })),
    [userTags],
  );

  const clearSearchAndFilters = (): void => {
    setSearchQuery('');
    setSearchFields([...DEFAULT_SEARCH_FIELDS]);
    setRefine([]);
    setTagFilters([]);
  };

  const sections = useMemo(() => {
    const map = new Map<string, { count: number; lastActivity: number }>();
    highlights.forEach((h) => {
      const sectionKey = getSectionKey({ url: h.url, path: h.path });
      const activity = highlightActivityMs(h);
      const prev = map.get(sectionKey);
      if (!prev) {
        map.set(sectionKey, { count: 1, lastActivity: activity });
      } else {
        map.set(sectionKey, {
          count: prev.count + 1,
          lastActivity: Math.max(prev.lastActivity, activity),
        });
      }
    });
    const list = Array.from(map.entries()).map(([path, { count, lastActivity }]) => ({
      path,
      count,
      lastActivity,
    }));
    list.sort((a, b) => {
      if (sort === 'oldest') {
        return a.lastActivity - b.lastActivity || b.count - a.count;
      }
      // newest + other keys: recency first for section list
      return b.lastActivity - a.lastActivity || b.count - a.count;
    });
    return list;
  }, [highlights, sort]);

  const searchSectionGroups = useMemo(() => {
    if (!isSearching) return [];
    const nameMatchedSections = matchSectionNames(
      sections.map((s) => s.path),
      searchQuery,
      (key) => displaySectionTitle(key, labels),
    );
    return groupSearchResultsBySection(filteredResults, { nameMatchedSections });
  }, [isSearching, sections, searchQuery, labels, filteredResults]);

  const searchResultCount = useMemo(
    () => countSectionGranularResults(searchSectionGroups),
    [searchSectionGroups],
  );

  useEffect(() => {
    if (isLoading) return;
    if (highlights.length === 0) {
      if (_onBack) {
        _onBack();
      } else {
        navigate('/library');
      }
    }
  }, [highlights.length, isLoading, navigate, _onBack]);

  const handleSectionClick = (section: string): void => {
    if (onSectionClick) {
      onSectionClick(domain, section);
    } else {
      navigate(`/domain/${domain}/section/${encodeURIComponent(section)}`);
    }
  };

  const handleDeleteDomain = async (): Promise<void> => {
    if (isDeletingDomain) return;
    setIsDeletingDomain(true);
    try {
      const result = await deleteScope({ scope: 'domain', domain });
      if (!result?.success) return;
      setDeleteDomainOpen(false);
      if (_onBack) {
        _onBack();
      } else {
        navigate('/library');
      }
    } finally {
      setIsDeletingDomain(false);
    }
  };

  const handleDeleteSection = async (): Promise<void> => {
    if (!deleteSection || isDeletingSection) return;
    setIsDeletingSection(true);
    try {
      const result = await deleteScope({
        scope: 'section',
        domain,
        sectionKey: deleteSection.path,
      });
      if (!result?.success) return;
      setDeleteSection(null);
    } finally {
      setIsDeletingSection(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', minHeight: 0 }}>
      <LibraryScopeChrome
        testId="domain-sticky-chrome"
        toolbarTestId="domain-scope-toolbar"
        title={domain}
        highlightCount={highlights.length}
        exportScope={{ kind: 'domain', domain }}
        exportDisabled={exportDisabled}
        onDelete={() => setDeleteDomainOpen(true)}
        deleteAriaLabel="Delete domain"
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
            resultCount={isSearching ? searchResultCount : undefined}
            placeholder="Search…"
          />
        }
      />

      <div className="list-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <div style={{ marginTop: 4 }}>
          {isLoading ? (
            <div style={{ padding: '20px 16px', textAlign: 'center' }}>
              <span className="u-mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>Loading...</span>
            </div>
          ) : isSearching ? (
            isSearchLoading ? (
              <div style={{ padding: '20px 16px', textAlign: 'center' }}>
                <span className="u-mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>Loading...</span>
              </div>
            ) : searchSectionGroups.length === 0 ? (
              <EmptyState
                variant="no-results"
                size="sm"
                title="No matches"
                description="Try a different query"
                action={{ label: 'Clear', onClick: clearSearchAndFilters }}
              />
            ) : (
              searchSectionGroups.map((section) => (
                <div key={section.sectionKey} data-testid="search-section-group">
                  <LibrarySearchGroupHeader
                    level="section"
                    title={displaySectionTitle(section.sectionKey, labels)}
                    meta={formatSearchMatchMeta(section.matchCount, section.nameMatched)}
                    onOpen={() => handleSectionClick(section.sectionKey)}
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
                        handleSectionClick(getSectionKey({ url: r.url, path: r.path }))
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
              ))
            )
          ) : (
            sections.map((s) => (
              <LibrarySectionRow
                key={s.path}
                title={displaySectionTitle(s.path, labels)}
                count={s.count}
                onOpen={() => handleSectionClick(s.path)}
                showActions={isAuthenticated}
                onDelete={
                  isAuthenticated
                    ? () => setDeleteSection({ path: s.path, count: s.count })
                    : undefined
                }
              />
            ))
          )}
        </div>
      </div>

      {(() => {
        const copy = deleteDomainCopy(domain, highlights.length);
        return (
          <DeleteConfirmDialog
            open={deleteDomainOpen}
            onClose={() => setDeleteDomainOpen(false)}
            severity={copy.severity}
            title={copy.title}
            message={copy.message}
            note={copy.note}
            strongNames={copy.strongNames}
            confirmLabel={copy.confirmLabel}
            cancelLabel={copy.cancelLabel}
            onConfirm={() => { void handleDeleteDomain(); }}
            isConfirming={isDeletingDomain}
            exportFooter={
              <ExportActions
                scope={{ kind: 'domain', domain }}
                highlightCount={highlights.length}
                disabled={exportDisabled}
              />
            }
          />
        );
      })()}

      {(() => {
        const copy = deleteSection
          ? deleteSectionCopy(domain, deleteSection.path, deleteSection.count)
          : null;
        return (
          <DeleteConfirmDialog
            open={deleteSection !== null}
            onClose={() => setDeleteSection(null)}
            severity={copy?.severity}
            title={copy?.title ?? 'Delete this section?'}
            message={copy?.message ?? ''}
            note={copy?.note}
            strongNames={copy?.strongNames}
            confirmLabel={copy?.confirmLabel}
            cancelLabel={copy?.cancelLabel}
            onConfirm={() => { void handleDeleteSection(); }}
            isConfirming={isDeletingSection}
            exportFooter={
              deleteSection ? (
                <ExportActions
                  scope={{ kind: 'section', domain, sectionKey: deleteSection.path }}
                  highlightCount={deleteSection.count}
                  disabled={exportDisabled}
                />
              ) : undefined
            }
          />
        );
      })()}
    </div>
  );
}
