import React, { useMemo, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { useHighlightsByDomain } from '@/features/collections/hooks/useHighlightsByDomainFactory';
import { ExportActions } from '@/features/collections/components/ExportActions';
import { DeleteConfirmDialog } from '@/features/collections/components/DeleteConfirmDialog';
import { useHighlightDelete } from '@/features/collections/hooks/use-highlight-delete';
import { LibraryHighlightTile } from '@/features/collections/components/LibraryHighlightTile';
import { useUserTags } from '@/features/collections/hooks/useUserTags';
import { HighlightSearchBar } from '@/features/collections/components/HighlightSearchBar';
import { useHighlightSearch } from '@/features/collections/hooks/useHighlightSearch';
import { AUTH_REQUIRED_MODES, DEFAULT_MODE } from '@/shared/constants/mode-storage';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { getSectionKey } from '@/shared/utils/section-key';
import { formatMatchBadge, type SearchField } from '@/shared/utils/highlight-search';
import {
  DEFAULT_SEARCH_FIELDS,
  filterHighlightsByRefineAndTags,
  type RefineFilter,
} from '@/shared/utils/highlight-filter';
import { deleteSectionCopy } from '@/shared/utils/confirm-dialog-copy';
import { useModeFeature } from '@/ui-system/hooks/useModeFeature';
import { EmptyState } from '@/ui-system/components/composed/EmptyState';
import { EmptySubDomain } from '@/ui-system/components/empty-states/EmptySubDomain';

export interface SubDomainViewProps {
  domain?: string;
  section?: string;
  onBack?: () => void;
  /** When the domain has no highlights left, return to Library (Collections). */
  onDomainEmpty?: () => void;
}

function IconTrash(): React.ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3.5 4.5h9M6 4.5V3.5h4v1M5.5 4.5l.5 8h4l.5-8"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SubDomainView({
  domain: propDomain,
  section: propSection,
  onBack: _onBack,
  onDomainEmpty,
}: SubDomainViewProps): React.ReactElement {
  const params = useParams<{ domain: string; section: string }>();
  const domain = propDomain ?? params.domain ?? '';
  const section = propSection ?? (params.section ? decodeURIComponent(params.section) : '/');

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
    return highlights.filter((h) => getSectionKey({ url: h.url, path: h.path }) === section);
  }, [highlights, section]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchFields, setSearchFields] = useState<SearchField[]>([...DEFAULT_SEARCH_FIELDS]);
  const [refine, setRefine] = useState<RefineFilter[]>([]);
  const [tagFilters, setTagFilters] = useState<string[]>([]);

  useEffect(() => {
    setSearchQuery('');
    setRefine([]);
    setTagFilters([]);
    setSearchFields([...DEFAULT_SEARCH_FIELDS]);
  }, [domain, section]);

  const { results: searchResults, isLoading: isSearchLoading } = useHighlightSearch({
    query: searchQuery,
    scope: { kind: 'section', domain, section },
    fields: searchFields,
  });
  const filteredSearchResults = useMemo(
    () => filterHighlightsByRefineAndTags(searchResults, { refine, tagFilters }),
    [searchResults, refine, tagFilters],
  );
  const filteredSectionHighlights = useMemo(
    () => filterHighlightsByRefineAndTags(sectionHighlights, { refine, tagFilters }),
    [sectionHighlights, refine, tagFilters],
  );
  const isSearching = searchQuery.trim().length > 0;
  const hasRefineOrTags = refine.length > 0 || tagFilters.length > 0;
  const availableTags = useMemo(
    () => labelSuggestions.map((name) => ({ label: name })),
    [labelSuggestions],
  );

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
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', minHeight: 0 }}>
        <EmptySubDomain domain={domain} section={section} onBack={handleBackToDomain} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', minHeight: 0 }}>
      <div className="list-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <div style={{ padding: '10px 16px 6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div className="u-sans" style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                {section === '/' ? 'HOME' : section}
              </div>
              <div className="u-mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
                {sectionHighlights.length} {sectionHighlights.length === 1 ? 'highlight' : 'highlights'}
              </div>
            </div>
            {sectionHighlights.length > 0 ? (
              <div className="scope-toolbar" data-testid="section-scope-toolbar">
                <ExportActions
                  scope={{ kind: 'section', domain, sectionKey: section }}
                  highlightCount={sectionHighlights.length}
                  disabled={exportDisabled}
                />
                <button
                  type="button"
                  className="sr-icon is-delete"
                  aria-label="Delete section"
                  title="Delete section"
                  onClick={() => setDeleteSectionOpen(true)}
                >
                  <IconTrash />
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ padding: '0 16px 8px' }}>
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
                ? filteredSearchResults.length
                : hasRefineOrTags
                  ? filteredSectionHighlights.length
                  : undefined
            }
          />
        </div>

        {isLoading ? (
          <div style={{ padding: '20px 16px', textAlign: 'center' }}>
            <span className="u-mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>Loading...</span>
          </div>
        ) : isSearching ? (
          isSearchLoading ? (
            <div style={{ padding: '20px 16px', textAlign: 'center' }}>
              <span className="u-mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>Loading...</span>
            </div>
          ) : filteredSearchResults.length === 0 ? (
            <EmptyState
              variant="no-results"
              size="sm"
              title="No matches"
              description="Try a different query"
              action={{ label: 'Clear', onClick: clearSearchAndFilters }}
            />
          ) : (
            filteredSearchResults.map((r) => (
              <LibraryHighlightTile
                key={r.id}
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
            ))
          )
        ) : hasRefineOrTags && filteredSectionHighlights.length === 0 ? (
          <EmptyState
            variant="no-results"
            size="sm"
            title="No matches"
            description="Try a different query"
            action={{ label: 'Clear', onClick: clearSearchAndFilters }}
          />
        ) : (
          filteredSectionHighlights.map((h) => (
            <LibraryHighlightTile
              key={h.id}
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
            onConfirm={() => { void handleDeleteSection(); }}
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
