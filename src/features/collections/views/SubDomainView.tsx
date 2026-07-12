import React, { useMemo, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { useHighlightsByDomain } from '@/features/collections/hooks/useHighlightsByDomainFactory';
import { canAccessLibrary } from '@/shared/utils/mode-capabilities';
import { useActiveLLMProvider } from '@/features/ai/hooks/useActiveLLMProvider';
import { useGenerateSummary } from '@/features/ai/hooks/useGenerateSummary';
import { useLlmArtifacts } from '@/features/ai/hooks/useLlmArtifacts';
import { usePersistLlmArtifactOnDone } from '@/features/ai/hooks/usePersistLlmArtifactOnDone';
import { usePageContext } from '@/features/ai/hooks/usePageContext';
import { ScopeAskPanel } from '@/features/ai/components/ScopeAskPanel';
import { ExportActions } from '@/features/collections/components/ExportActions';
import { DeleteConfirmDialog } from '@/features/collections/components/DeleteConfirmDialog';
import { useHighlightDelete } from '@/features/collections/hooks/use-highlight-delete';
import { HighlightMetadataEditor } from '@/features/collections/components/HighlightMetadataEditor';
import { copyHighlightPlainText } from '@/features/collections/hooks/useHighlightExport';
import { prepareHighlightExcerpts } from '@/shared/llm/prepare-highlight-excerpts';
import { AUTH_REQUIRED_MODES, DEFAULT_MODE } from '@/shared/constants/mode-storage';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { getSectionKey } from '@/shared/utils/section-key';
import { useBasicTtlOption } from '@/ui-system/hooks/useBasicTtlOption';
import { useModeFeature } from '@/ui-system/hooks/useModeFeature';
import { HighlightCard } from '@/ui-system/components/primitives/HighlightCard';

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
  const section = propSection ?? (params.section ? decodeURIComponent(params.section) : '/');

  const navigate = useNavigate();
  const { isAuthenticated, currentMode } = useApp();
  const mode = (currentMode ?? DEFAULT_MODE) as ModeType;
  const { ttlMs: basicTtlMs } = useBasicTtlOption();
  const libraryAccessible = canAccessLibrary(isAuthenticated);

  useEffect(() => {
    if (!libraryAccessible) {
      if (_onBack) {
        _onBack();
        return;
      }
      if (!isAuthenticated && AUTH_REQUIRED_MODES.includes(mode)) {
        navigate('/mode');
      }
    }
  }, [libraryAccessible, isAuthenticated, mode, navigate, _onBack]);

  const { highlights, isLoading } = useHighlightsByDomain(domain, isAuthenticated);
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

  const sectionHighlights = useMemo(() => {
    return highlights.filter((h) => getSectionKey({ url: h.url, path: h.path }) === section);
  }, [highlights, section]);

  useEffect(() => {
    if (isLoading) return;

    if (highlights.length === 0) {
      if (onDomainEmpty) {
        onDomainEmpty();
      } else {
        navigate('/collections');
      }
      return;
    }

    if (sectionHighlights.length === 0) {
      if (_onBack) {
        _onBack();
      } else {
        navigate(`/domain/${encodeURIComponent(domain)}`);
      }
    }
  }, [
    domain,
    highlights.length,
    isLoading,
    navigate,
    onDomainEmpty,
    sectionHighlights.length,
    _onBack,
  ]);

  const getTtlMs = (createdAt: Date): number | undefined => {
    // Basic mode's TTL is user-configurable (see @/shared/constants/basic-ttl);
    // "forever" (basicTtlMs === null) means no expiry badge.
    if (mode === 'basic' && basicTtlMs !== null) {
      const expiry = createdAt.getTime() + basicTtlMs;
      const ttl = expiry - Date.now();
      return Math.max(0, ttl);
    }
    return undefined;
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

        {isLoading ? (
          <div style={{ padding: '20px 16px', textAlign: 'center' }}>
            <span className="u-mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>Loading...</span>
          </div>
        ) : (
          sectionHighlights.map((h) => (
            <div key={h.id}>
              <HighlightCard
                quote={h.text || '[Unavailable]'}
                domain={domain}
                section={section === '/' ? undefined : section}
                showLocationMeta={false}
                ttlMs={getTtlMs(h.createdAt)}
                onCopy={h.text ? () => { void copyHighlightPlainText(h.text); } : undefined}
                onDelete={() => { void deleteScope({ scope: 'highlight', id: h.id }); }}
              />
              <div style={{ padding: '0 16px 8px', marginTop: -4 }}>
                {tagsGate.allowed && (
                  <HighlightMetadataEditor
                    highlightId={h.id}
                    notes={h.notes}
                    tags={h.tags}
                  />
                )}
              </div>
            </div>
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
            ? `This permanently removes ${sectionHighlights.length} highlight${sectionHighlights.length === 1 ? '' : 's'} in “${domain}”. This cannot be undone.`
            : `This permanently removes ${sectionHighlights.length} highlight${sectionHighlights.length === 1 ? '' : 's'} in “${section}”. This cannot be undone.`
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
