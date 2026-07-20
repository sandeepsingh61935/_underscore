import React, { useMemo, useEffect, useState } from 'react';
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
import type { HighlightSearchResult } from '@/features/collections/hooks/useHighlightSearch';
import { LibraryHighlightTile } from '@/features/collections/components/LibraryHighlightTile';
import { useSectionLabels } from '@/features/collections/hooks/useSectionLabels';
import { prepareHighlightExcerpts } from '@/shared/llm/prepare-highlight-excerpts';
import { AUTH_REQUIRED_MODES, DEFAULT_MODE } from '@/shared/constants/mode-storage';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { displaySectionTitle } from '@/shared/services/section-label-store';
import { getSectionKey } from '@/shared/utils/section-key';
import { highlightActivityMs } from '@/shared/utils/highlight-activity';
import type { SearchField } from '@/shared/utils/highlight-search';
import { useModeFeature } from '@/ui-system/hooks/useModeFeature';
import { Row } from '@/ui-system/components/primitives/Row';
import { EmptyState } from '@/ui-system/components/composed/EmptyState';

export interface DomainDetailsViewProps {
  domain?: string;
  onBack?: () => void;
  onSectionClick?: (domain: string, section: string) => void;
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
  const skipBlurSaveRef = React.useRef(false);

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

  const [searchQuery, setSearchQuery] = useState('');
  const [searchFields, setSearchFields] = useState<SearchField[]>(DEFAULT_SEARCH_FIELDS);

  // Reset search when the domain itself changes (route param change without remount).
  useEffect(() => {
    setSearchQuery('');
  }, [domain]);

  const { results: searchResults, isLoading: isSearchLoading } = useHighlightSearch({
    query: searchQuery,
    scope: { kind: 'domain', domain },
    fields: searchFields,
  });
  const isSearching = searchQuery.trim().length > 0;

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
              resultCount={searchQuery.trim() ? searchResults.length : undefined}
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
            ) : searchResults.length === 0 ? (
              <EmptyState variant="no-results" size="sm" />
            ) : (
              searchResults.map((r) => {
                const badge = matchBadgeLabel(r.matchedFields);
                return (
                  <div key={r.id}>
                    <LibraryHighlightTile
                      highlight={{
                        id: r.id,
                        text: r.text,
                        domain: r.domain,
                        path: r.path,
                        sourceKind: r.sourceKind,
                        language: r.language,
                        presentation: r.presentation,
                      }}
                      onSectionClick={() => handleSectionClick(r.path)}
                    />
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
                <Row
                  key={s.path}
                  title={displaySectionTitle(s.path, labels)}
                  right={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(s.path);
                          }}
                          style={{ all: 'unset', cursor: 'pointer', fontSize: 12, color: 'var(--accent)' }}
                        >
                          [edit]
                        </button>
                      )}
                      <span className="u-serif" style={{ fontSize: 16, fontStyle: 'italic', color: 'var(--ink-3)' }}>
                        {s.count}
                      </span>
                    </div>
                  }
                  onClick={() => handleSectionClick(s.path)}
                />
              )
            ))
          )}
        </div>
      </div>

      {aiGate.allowed && (
        <ScopeAskPanel
          scopeLabel={domain}
          scopeKind="domain"
          artifactScope={artifactScope}
          highlights={promptHighlights}
          highlightCount={highlights.length}
          disabled={isPreparing}
          placeholder="Ask about this domain…"
        />
      )}

      <DeleteConfirmDialog
        open={deleteDomainOpen}
        onClose={() => setDeleteDomainOpen(false)}
        title="Delete this domain?"
        message={`This permanently removes ${highlights.length} highlight${highlights.length === 1 ? '' : 's'} from “${domain}”. This cannot be undone.`}
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
    </div>
  );
}
