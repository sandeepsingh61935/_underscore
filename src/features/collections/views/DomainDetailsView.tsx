import React, { useMemo, useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { useHighlightsByDomain } from '@/features/collections/hooks/useHighlightsByDomainFactory';
import { useActiveLLMProvider } from '@/features/ai/hooks/useActiveLLMProvider';
import { useLlmArtifacts } from '@/features/ai/hooks/useLlmArtifacts';
import { usePersistLlmArtifactOnDone } from '@/features/ai/hooks/usePersistLlmArtifactOnDone';
import { useSynthesizeDomain } from '@/features/ai/hooks/useSynthesizeDomain';
import { usePageContext } from '@/features/ai/hooks/usePageContext';
import { ScopeAskPanel } from '@/features/ai/components/ScopeAskPanel';
import { ExportActions } from '@/features/collections/components/ExportActions';
import { DeleteConfirmDialog } from '@/features/collections/components/DeleteConfirmDialog';
import { useHighlightDelete } from '@/features/collections/hooks/use-highlight-delete';
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
import { prepareHighlightExcerpts } from '@/shared/llm/prepare-highlight-excerpts';
import { AUTH_REQUIRED_MODES, DEFAULT_MODE } from '@/shared/constants/mode-storage';
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

export function DomainDetailsView({ domain: propDomain, onBack: _onBack, onSectionClick }: DomainDetailsViewProps): React.ReactElement {
  const params = useParams<{ domain: string }>();
  const domain = propDomain ?? params.domain ?? '';
  const navigate = useNavigate();
  const { isAuthenticated, currentMode } = useApp();
  const mode = (currentMode ?? DEFAULT_MODE) as ModeType;

  useEffect(() => {
    if (!isAuthenticated && AUTH_REQUIRED_MODES.includes(mode)) {
      navigate('/mode');
    }
  }, [isAuthenticated, mode, navigate]);

  const [editingSection, setEditingSection] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState('');
  /** Baseline display title when edit started — used for dirty check and Escape. */
  const [editBaseline, setEditBaseline] = React.useState('');
  const skipBlurSaveRef = useRef(false);
  const askPanelRef = useRef<HTMLDivElement | null>(null);

  const { labels, canEdit, saveLabel } = useSectionLabels(domain, mode);

  const closeEdit = React.useCallback((): void => {
    setEditingSection(null);
    setEditValue('');
    setEditBaseline('');
  }, []);

  const commitEdit = React.useCallback(
    async (sectionKey: string, value: string, baseline: string): Promise<void> => {
      if (value.trim() === baseline.trim()) {
        closeEdit();
        return;
      }
      await saveLabel(sectionKey, value);
      closeEdit();
    },
    [closeEdit, saveLabel],
  );

  const handleSaveEdit = (e: React.FormEvent, sectionKey: string): void => {
    e.preventDefault();
    skipBlurSaveRef.current = true;
    void commitEdit(sectionKey, editValue, editBaseline);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, sectionKey: string): void => {
    if (e.key === 'Escape') {
      e.preventDefault();
      skipBlurSaveRef.current = true;
      closeEdit();
      return;
    }
    // Prevent default so blur-after-Enter does not race a second save path.
    if (e.key === 'Enter') {
      e.preventDefault();
      skipBlurSaveRef.current = true;
      void commitEdit(sectionKey, editValue, editBaseline);
    }
  };

  const handleEditBlur = (sectionKey: string): void => {
    if (skipBlurSaveRef.current) {
      skipBlurSaveRef.current = false;
      return;
    }
    void commitEdit(sectionKey, editValue, editBaseline);
  };

  const startEdit = (sectionKey: string): void => {
    const title = displaySectionTitle(sectionKey, labels);
    skipBlurSaveRef.current = false;
    setEditingSection(sectionKey);
    setEditValue(title);
    setEditBaseline(title);
  };

  const { highlights, isLoading } = useHighlightsByDomain(domain, isAuthenticated);
  const exportGate = useModeFeature('export', isAuthenticated);
  const aiGate = useModeFeature('ai', isAuthenticated);
  const tagsGate = useModeFeature('tags', isAuthenticated);
  const exportDisabled = !exportGate.allowed;
  const synthesis = useSynthesizeDomain();
  const { provider } = useActiveLLMProvider();
  const artifactScope = useMemo(
    () => ({ kind: 'domain' as const, domain }),
    [domain],
  );
  const artifacts = useLlmArtifacts(artifactScope);
  const savedSynthesis = artifacts.getByKind('domain_synthesis');
  const { fetch: fetchPageContext } = usePageContext();
  const [isPreparing, setIsPreparing] = useState(false);
  const [synthesizeError, setSynthesizeError] = useState<string | null>(null);
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
  const { tags: userTags, tagNames: labelSuggestions } = useUserTags(isAuthenticated);

  // Reset search when the domain itself changes (route param change without remount).
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

  const focusAskPanel = (): void => {
    askPanelRef.current?.scrollIntoView({ block: 'nearest' });
  };

  const promptHighlights = useMemo(
    () => highlights.map(h => ({
      id: h.id,
      text: h.text,
      url: h.url,
      title: domain,
    })),
    [highlights, domain],
  );

  const handleSynthesize = async (): Promise<void> => {
    setSynthesizeError(null);
    setIsPreparing(true);
    try {
      const paths = Object.fromEntries(highlights.map(h => [h.id, h.path]));
      const { excerpts } = await prepareHighlightExcerpts(promptHighlights, fetchPageContext);

      await synthesis.start({
        ctx: {
          pageTitle: domain,
          pageUrl: '',
          pageContextWithMarks: '',
          pageContext: '',
          highlights: promptHighlights,
          domain,
          uniqueUrls: new Set(highlights.map(h => h.url)).size,
          length: 'long',
        },
        excerpts,
        paths,
      });
    } catch (err) {
      setSynthesizeError((err as Error).message);
    } finally {
      setIsPreparing(false);
    }
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
    return Array.from(map.entries())
      .map(([path, { count, lastActivity }]) => ({ path, count, lastActivity }))
      .sort((a, b) => b.lastActivity - a.lastActivity || b.count - a.count);
  }, [highlights]);

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
        navigate('/collections');
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

  const synthesisText = synthesis.chunks || savedSynthesis?.content || '';
  const synthesisStale = savedSynthesis
    ? artifacts.isStale(savedSynthesis, highlights.length)
    : false;

  usePersistLlmArtifactOnDone({
    status: synthesis.status,
    content: synthesis.chunks,
    input: synthesis.status === 'done' && synthesis.chunks.trim()
      ? {
          kind: 'domain_synthesis',
          scope: artifactScope,
          content: synthesis.chunks,
          highlightCountAtGeneration: highlights.length,
          provider: provider ?? undefined,
        }
      : null,
    save: artifacts.save,
  });

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
        navigate('/collections');
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
      <div className="list-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <div style={{ padding: '10px 16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <div className="u-serif" style={{ fontSize: 22, fontStyle: 'italic', letterSpacing: '-0.015em' }}>
                {domain}
              </div>
              <div className="u-mono" style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.14em', marginTop: 4 }}>
                Sections
              </div>
            </div>
            <ExportActions
              scope={{ kind: 'domain', domain }}
              highlightCount={highlights.length}
              disabled={exportDisabled}
            />
          </div>

          {highlights.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {aiGate.allowed && (
                <button
                  type="button"
                  onClick={() => { void handleSynthesize(); }}
                  disabled={synthesis.phase === 'sections' || synthesis.phase === 'streaming' || isPreparing || highlights.some(h => !h.text)}
                  style={{
                    font: 'var(--sans)', fontSize: 'var(--step--1)',
                    padding: '6px 10px', background: 'var(--paper)', color: 'var(--ink)',
                    border: '1px solid var(--rule)', cursor: (synthesis.phase === 'sections' || synthesis.phase === 'streaming' || isPreparing) ? 'wait' : 'pointer',
                  }}
                >
                  Synthesize this domain
                </button>
              )}
              <button
                type="button"
                onClick={() => setDeleteDomainOpen(true)}
                style={{
                  font: 'var(--sans)', fontSize: 'var(--step--1)',
                  padding: '6px 10px', background: 'var(--paper)', color: 'var(--accent)',
                  border: '1px solid var(--rule)', cursor: 'pointer',
                }}
              >
                Delete domain
              </button>
            </div>
          )}

          {synthesis.phase === 'sections' && (
            <p className="u-mono" style={{ marginTop: 8, fontSize: 'var(--step--1)', color: 'var(--ink-3)' }}>
              Summarizing sections {synthesis.sectionProgress.current}/{synthesis.sectionProgress.total}…
            </p>
          )}

          {synthesis.status === 'streaming' && synthesis.phase !== 'sections' && !synthesis.chunks && (
            <p className="u-mono" style={{ marginTop: 8, fontSize: 'var(--step--1)', color: 'var(--ink-3)' }}>
              Synthesizing domain…
            </p>
          )}

          {(synthesis.error || synthesizeError) && (
            <p style={{ marginTop: 8, fontSize: 'var(--step--1)', color: 'var(--ink)' }}>
              Failed: {synthesis.error ?? synthesizeError}
            </p>
          )}

          {synthesisStale && (
            <p className="u-mono" style={{ marginTop: 8, fontSize: 'var(--step--1)', color: 'var(--ink-3)' }}>
              Synthesis may be outdated — highlight count changed since it was generated.
            </p>
          )}

          {synthesisText && (
            <div
              role="status"
              aria-live="polite"
              style={{
                marginTop: 8, padding: 8, whiteSpace: 'pre-wrap',
                font: 'var(--sans)', fontSize: 'var(--step--1)', color: 'var(--ink)',
                border: '1px solid var(--rule)', maxHeight: '240px', overflowY: 'auto',
              }}
            >
              {synthesisText}
            </div>
          )}

          <div style={{ marginTop: 10 }}>
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
              placeholder="Search in domain…"
            />
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
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
                description="Clear filters or try another query"
                action={{ label: 'Clear search', onClick: clearSearchAndFilters }}
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
              editingSection === s.path ? (
                <form
                  key={s.path}
                  onSubmit={(e) => handleSaveEdit(e, s.path)}
                  style={{ padding: '12px 16px', display: 'flex', gap: 8 }}
                >
                  <input
                    autoFocus
                    aria-label="Section display name"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => handleEditKeyDown(e, s.path)}
                    onBlur={() => handleEditBlur(s.path)}
                    style={{
                      flex: 1,
                      padding: '4px 8px',
                      background: 'transparent',
                      border: '1px solid var(--rule)',
                      color: 'var(--ink)',
                      font: 'var(--sans)',
                    }}
                  />
                </form>
              ) : (
                <LibrarySectionRow
                  key={s.path}
                  title={displaySectionTitle(s.path, labels)}
                  count={s.count}
                  onOpen={() => handleSectionClick(s.path)}
                  canEdit={canEdit}
                  onEdit={() => startEdit(s.path)}
                  showActions={aiGate.allowed}
                  onAsk={aiGate.allowed ? focusAskPanel : undefined}
                  onDelete={
                    aiGate.allowed
                      ? () => setDeleteSection({ path: s.path, count: s.count })
                      : undefined
                  }
                />
              )
            ))
          )}
        </div>
      </div>

      {aiGate.allowed && (
        <div ref={askPanelRef}>
          <ScopeAskPanel
            scopeLabel={domain}
            scopeKind="domain"
            artifactScope={artifactScope}
            highlights={promptHighlights}
            highlightCount={highlights.length}
            disabled={isPreparing}
            placeholder="Ask about this domain…"
          />
        </div>
      )}

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
