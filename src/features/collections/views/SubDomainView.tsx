import React, { useMemo, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { useHighlightsByDomain } from '@/features/collections/hooks/useHighlightsByDomainFactory';
import { useActiveLLMProvider } from '@/features/ai/hooks/useActiveLLMProvider';
import { useGenerateSummary } from '@/features/ai/hooks/useGenerateSummary';
import { useLlmArtifacts } from '@/features/ai/hooks/useLlmArtifacts';
import { usePersistLlmArtifactOnDone } from '@/features/ai/hooks/usePersistLlmArtifactOnDone';
import { usePageContext } from '@/features/ai/hooks/usePageContext';
import { ScopeAskPanel } from '@/features/ai/components/ScopeAskPanel';
import { ExportActions } from '@/features/collections/components/ExportActions';
import { DeleteConfirmDialog } from '@/features/collections/components/DeleteConfirmDialog';
import { useHighlightDelete } from '@/features/collections/hooks/use-highlight-delete';
import { HighlightWithMarginalia } from '@/features/collections/components/HighlightWithMarginalia';
import { useUserTags } from '@/features/collections/hooks/useUserTags';
import { copyHighlightPlainText } from '@/features/collections/hooks/useHighlightExport';
import { useUpdateHighlightMetadata } from '@/features/collections/hooks/useUpdateHighlightMetadata';
import { HighlightSearchBar } from '@/features/collections/components/HighlightSearchBar';
import { useHighlightSearch } from '@/features/collections/hooks/useHighlightSearch';
import type { HighlightSearchResult } from '@/features/collections/hooks/useHighlightSearch';
import { prepareHighlightExcerpts } from '@/shared/llm/prepare-highlight-excerpts';
import { AUTH_REQUIRED_MODES, DEFAULT_MODE } from '@/shared/constants/mode-storage';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { getSectionKey } from '@/shared/utils/section-key';
import type { SearchField } from '@/shared/utils/highlight-search';
import { useModeFeature } from '@/ui-system/hooks/useModeFeature';
import { HighlightCard } from '@/ui-system/components/primitives/HighlightCard';
import { EmptyState } from '@/ui-system/components/composed/EmptyState';
import { EmptySubDomain } from '@/ui-system/components/empty-states/EmptySubDomain';

export interface SubDomainViewProps {
  domain?: string;
  section?: string;
  onBack?: () => void;
  /** When the domain has no highlights left, return to Library (Collections). */
  onDomainEmpty?: () => void;
}

const DEFAULT_SEARCH_FIELDS: SearchField[] = ['text', 'notes', 'tags'];

/**
 * Small mono badge for results whose hit was only in the note or tag(s),
 * not the visible quote — otherwise a matched card can look confusing.
 */
function matchBadgeLabel(matchedFields: HighlightSearchResult['matchedFields']): string | null {
  if (matchedFields.includes('text')) return null;
  const inNotes = matchedFields.includes('notes');
  const inTags = matchedFields.includes('tags');
  if (inNotes && inTags) return 'Matched in note & tag(s)';
  if (inNotes) return 'Matched in note';
  if (inTags) return 'Matched in tag(s)';
  return null;
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
      navigate('/mode');
    }
  }, [isAuthenticated, mode, navigate]);

  const { highlights, isLoading } = useHighlightsByDomain(domain, isAuthenticated);
  const { updateMetadata } = useUpdateHighlightMetadata();
  const exportGate = useModeFeature('export', isAuthenticated);
  const tagsGate = useModeFeature('tags', isAuthenticated);
  const aiGate = useModeFeature('ai', isAuthenticated);
  const exportDisabled = !exportGate.allowed;
  const summary = useGenerateSummary();
  const { provider } = useActiveLLMProvider();
  const artifactScope = useMemo(
    () => ({ kind: 'section' as const, domain, sectionKey: section }),
    [domain, section],
  );
  const artifacts = useLlmArtifacts(artifactScope);
  const savedSummary = artifacts.getByKind('section_summary');
  const { fetch: fetchPageContext } = usePageContext();
  const [contextNote, setContextNote] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const { deleteScope } = useHighlightDelete();
  const [deleteSectionOpen, setDeleteSectionOpen] = useState(false);
  const [isDeletingSection, setIsDeletingSection] = useState(false);
  const [expandedHighlightId, setExpandedHighlightId] = useState<string | null>(null);
  const { tagNames: labelSuggestions } = useUserTags(isAuthenticated);

  const sectionHighlights = useMemo(() => {
    return highlights.filter((h) => getSectionKey({ url: h.url, path: h.path }) === section);
  }, [highlights, section]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchFields, setSearchFields] = useState<SearchField[]>(DEFAULT_SEARCH_FIELDS);

  // Reset search when the domain/section itself changes (route param change without remount).
  useEffect(() => {
    setSearchQuery('');
  }, [domain, section]);

  const { results: searchResults, isLoading: isSearchLoading } = useHighlightSearch({
    query: searchQuery,
    scope: { kind: 'section', domain, section },
    fields: searchFields,
  });
  const isSearching = searchQuery.trim().length > 0;

  useEffect(() => {
    if (isLoading) return;

    if (highlights.length === 0) {
      if (onDomainEmpty) {
        onDomainEmpty();
      } else {
        navigate('/collections');
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

  const [summarizeError, setSummarizeError] = useState<string | null>(null);

  const promptHighlights = useMemo(
    () => sectionHighlights.map(h => ({
      id: h.id,
      text: h.text,
      url: h.url,
      title: section,
    })),
    [sectionHighlights, section],
  );

  const handleSummarize = async (): Promise<void> => {
    setContextNote(null);
    setSummarizeError(null);
    setIsPreparing(true);
    try {
      const { excerpts, cacheNote, errorNote } = await prepareHighlightExcerpts(
        promptHighlights,
        fetchPageContext,
      );

      if (errorNote) {
        setContextNote(`Page context unavailable: ${errorNote}`);
      } else if (cacheNote) {
        setContextNote(cacheNote);
      }

      summary.start({
        pageTitle: section,
        pageUrl: domain,
        pageContextWithMarks: '',
        pageContext: '',
        highlights: promptHighlights,
        length: 'medium',
      }, excerpts);
    } catch (err) {
      setSummarizeError((err as Error).message);
    } finally {
      setIsPreparing(false);
    }
  };

  const summarizeDisabled = summary.phase === 'streaming'
    || isPreparing
    || sectionHighlights.some(h => !h.text);

  const summaryText = summary.chunks || savedSummary?.content || '';
  const summaryStale = savedSummary
    ? artifacts.isStale(savedSummary, sectionHighlights.length)
    : false;

  usePersistLlmArtifactOnDone({
    status: summary.status,
    content: summary.chunks,
    input: summary.status === 'done' && summary.chunks.trim()
      ? {
          kind: 'section_summary',
          scope: artifactScope,
          content: summary.chunks,
          highlightCountAtGeneration: sectionHighlights.length,
          provider: provider ?? undefined,
        }
      : null,
    save: artifacts.save,
  });

  const handleDeleteSection = async (): Promise<void> => {
    setIsDeletingSection(true);
    try {
      const result = await deleteScope({ scope: 'section', domain, sectionKey: section });
      if (!result?.success) return;
      setDeleteSectionOpen(false);
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
            <div>
              <div className="u-sans" style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                {section === '/' ? 'HOME' : section}
              </div>
              <div className="u-mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
                {sectionHighlights.length} highlights · {mode}
              </div>
            </div>
            <ExportActions
              scope={{ kind: 'section', domain, sectionKey: section }}
              highlightCount={sectionHighlights.length}
              disabled={exportDisabled}
            />
          </div>
        </div>

        {sectionHighlights.length > 0 && (
          <div style={{ padding: '4px 16px 8px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {aiGate.allowed && (
              <button
                type="button"
                onClick={() => { void handleSummarize(); }}
                disabled={summarizeDisabled}
                style={{
                  font: 'var(--sans)', fontSize: 'var(--step--1)',
                  padding: '6px 10px', background: 'var(--paper)', color: 'var(--ink)',
                  border: '1px solid var(--rule)', cursor: summarizeDisabled ? 'wait' : 'pointer',
                }}
              >
                Summarize this section
              </button>
            )}
            <button
              type="button"
              onClick={() => setDeleteSectionOpen(true)}
              style={{
                font: 'var(--sans)', fontSize: 'var(--step--1)',
                padding: '6px 10px', background: 'var(--paper)', color: 'var(--accent)',
                border: '1px solid var(--rule)', cursor: 'pointer',
              }}
            >
              Delete section
            </button>
          </div>
        )}

        {contextNote && (
          <p className="u-mono" style={{ padding: '4px 16px', fontSize: 'var(--step--1)', color: 'var(--ink-3)' }}>
            {contextNote}
          </p>
        )}

        {summary.status === 'streaming' && !summary.chunks && (
          <p className="u-mono" style={{ padding: '4px 16px', fontSize: 'var(--step--1)', color: 'var(--ink-3)' }}>
            Writing summary…
          </p>
        )}

        {(summary.error || summarizeError) && (
          <p style={{ padding: '4px 16px', fontSize: 'var(--step--1)', color: 'var(--ink)' }}>
            Failed: {summary.error ?? summarizeError}
          </p>
        )}

        {summaryStale && (
          <p className="u-mono" style={{ padding: '4px 16px', fontSize: 'var(--step--1)', color: 'var(--ink-3)' }}>
            Summary may be outdated — highlight count changed since it was generated.
          </p>
        )}

        {summaryText && (
          <div
            role="status"
            aria-live="polite"
            style={{
              padding: '8px 16px', whiteSpace: 'pre-wrap',
              font: 'var(--sans)', fontSize: 'var(--step--1)', color: 'var(--ink)',
              borderTop: '1px solid var(--rule)', maxHeight: '200px', overflowY: 'auto',
            }}
          >
            {summaryText}
          </div>
        )}

        <div style={{ padding: '0 16px 8px' }}>
          <HighlightSearchBar
            query={searchQuery}
            onQueryChange={setSearchQuery}
            fields={searchFields}
            onFieldsChange={setSearchFields}
            resultCount={searchQuery.trim() ? searchResults.length : undefined}
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
          ) : searchResults.length === 0 ? (
            <EmptyState variant="no-results" size="sm" />
          ) : (
            searchResults.map((r) => {
              const badge = matchBadgeLabel(r.matchedFields);
              return (
                <div key={r.id}>
                  {tagsGate.allowed ? (
                    <HighlightWithMarginalia
                      highlightId={r.id}
                      quote={r.text || '[Unavailable]'}
                      domain={r.domain}
                      section={r.path === '/' ? undefined : r.path}
                      notes={r.notes}
                      labels={r.tags}
                      isExpanded={expandedHighlightId === r.id}
                      onToggleExpand={() => {
                        setExpandedHighlightId((prev) => (prev === r.id ? null : r.id));
                      }}
                      showLocationMeta={false}
                      suggestions={labelSuggestions}
                      sourceKind={r.sourceKind}
                      language={r.language}
                      presentation={r.presentation}
                      onCopy={r.text ? () => { void copyHighlightPlainText(r.text); } : undefined}
                      onDelete={() => { void deleteScope({ scope: 'highlight', id: r.id }); }}
                      onPresentationChange={(presentation) =>
                        updateMetadata(r.id, { presentation }, { silent: true })
                      }
                    />
                  ) : (
                    <HighlightCard
                      quote={r.text || '[Unavailable]'}
                      domain={r.domain}
                      section={r.path === '/' ? undefined : r.path}
                      showLocationMeta={false}
                      sourceKind={r.sourceKind}
                      language={r.language}
                      presentation={r.presentation}
                      onCopy={r.text ? () => { void copyHighlightPlainText(r.text); } : undefined}
                      onDelete={() => { void deleteScope({ scope: 'highlight', id: r.id }); }}
                      onPresentationChange={(presentation) =>
                        updateMetadata(r.id, { presentation }, { silent: true })
                      }
                    />
                  )}
                  {badge && (
                    <div style={{ padding: '0 16px 8px', marginTop: -4 }}>
                      <span
                        className="u-mono"
                        style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}
                      >
                        {badge}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )
        ) : (
          sectionHighlights.map((h) => (
            tagsGate.allowed ? (
              <HighlightWithMarginalia
                key={h.id}
                highlightId={h.id}
                quote={h.text || '[Unavailable]'}
                domain={domain}
                section={section === '/' ? undefined : section}
                notes={h.notes}
                labels={h.tags}
                isExpanded={expandedHighlightId === h.id}
                onToggleExpand={() => {
                  setExpandedHighlightId((prev) => (prev === h.id ? null : h.id));
                }}
                showLocationMeta={false}
                suggestions={labelSuggestions}
                sourceKind={h.sourceKind}
                language={h.language}
                presentation={h.presentation}
                onCopy={h.text ? () => { void copyHighlightPlainText(h.text); } : undefined}
                onDelete={() => { void deleteScope({ scope: 'highlight', id: h.id }); }}
                onPresentationChange={(presentation) =>
                  updateMetadata(h.id, { presentation }, { silent: true })
                }
              />
            ) : (
              <HighlightCard
                key={h.id}
                quote={h.text || '[Unavailable]'}
                domain={domain}
                section={section === '/' ? undefined : section}
                showLocationMeta={false}
                sourceKind={h.sourceKind}
                language={h.language}
                presentation={h.presentation}
                onCopy={h.text ? () => { void copyHighlightPlainText(h.text); } : undefined}
                onDelete={() => { void deleteScope({ scope: 'highlight', id: h.id }); }}
                onPresentationChange={(presentation) =>
                  updateMetadata(h.id, { presentation }, { silent: true })
                }
              />
            )
          ))
        )}
      </div>

      {aiGate.allowed && (
        <ScopeAskPanel
          scopeLabel={section === '/' ? domain : section}
          scopeKind="section"
          artifactScope={artifactScope}
          highlights={promptHighlights}
          highlightCount={sectionHighlights.length}
          disabled={isPreparing}
          placeholder="Ask about this section…"
        />
      )}

      <DeleteConfirmDialog
        open={deleteSectionOpen}
        onClose={() => setDeleteSectionOpen(false)}
        title={section === '/' ? 'Delete this section?' : 'Delete this section?'}
        message={
          section === '/'
            ? `This permanently removes ${sectionHighlights.length} highlight${sectionHighlights.length === 1 ? '' : 's'} in "${domain}". This cannot be undone.`
            : `This permanently removes ${sectionHighlights.length} highlight${sectionHighlights.length === 1 ? '' : 's'} in "${section}". This cannot be undone.`
        }
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
    </div>
  );
}
