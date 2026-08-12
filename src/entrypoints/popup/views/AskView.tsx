/**
 * Ask tab body — commercial locks + Paid scope thread shell.
 * Wireframe: ui_kits/extension/v3/screens-ask.jsx (+ billing AskLockedBilling).
 * Body-only: PopupShell owns chrome (ModeHeader + TabBar).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AskModelChip } from '@/features/ai/components/AskModelChip';
import { useAskModelSelection } from '@/features/ai/hooks/useAskModelSelection';
import { usePageContext } from '@/features/ai/hooks/usePageContext';
import { useScopeQuery } from '@/features/ai/hooks/useScopeQuery';
import { useDashboardData } from '@/features/collections/hooks/useDashboardData';
import { useHighlightsByDomain } from '@/features/collections/hooks/useHighlightsByDomainFactory';
import { useApp } from '@/core/context/PopupAppProvider';
import { DEFAULT_MODE } from '@/shared/constants/mode-storage';
import type { PromptHighlight, ScopeKind } from '@/shared/llm/prompts';
import type { AskLockReason } from '@/shared/utils/ask-lock';
import { getSectionKey } from '@/shared/utils/section-key';
import { useCurrentTabContext } from '@/ui-system/hooks/useCurrentTabContext';

export type { AskLockReason };

export type AskScopeChip = 'page' | 'domain' | 'library';

export interface AskViewProps {
  lockReason?: AskLockReason;
  onSignIn?: () => void;
  onUpgrade?: () => void;
  onUpdatePayment?: () => void;
  onConnectAi?: () => void;
  /** Optional initial scope chip (e.g. Home "Ask page"). */
  initialScope?: AskScopeChip;
  /**
   * When set (e.g. Library domain chat icon), Ask uses this hostname for
   * domain scope instead of the current browser tab.
   */
  libraryDomain?: string | null;
}

interface ThreadTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = ['Summarize', 'List tags', 'Key themes'] as const;

const LOCK_COPY: Record<
  Exclude<AskLockReason, null>,
  { title: string; body: string; cta: string }
> = {
  guest: {
    title: 'Sign in to use Ask',
    body: 'Answers use only highlights in the selected scope.',
    cta: 'Sign in',
  },
  free: {
    title: 'Ask needs Account (Paid)',
    body: 'Upgrade opens Polar checkout in a new tab.',
    cta: 'Upgrade',
  },
  past_due: {
    title: 'Payment past due',
    body: 'Update payment in Polar to restore Ask.',
    cta: 'Update payment',
  },
  no_model: {
    title: 'No model selected',
    body: 'Add a provider key under Settings → Models & providers.',
    cta: 'Models & providers',
  },
};

function formatPath(path: string | null | undefined): string {
  if (!path || path === '/') return '/';
  return path;
}

function AskLockPage({
  reason,
  onSignIn,
  onUpgrade,
  onUpdatePayment,
  onConnectAi,
}: {
  reason: Exclude<AskLockReason, null>;
  onSignIn?: () => void;
  onUpgrade?: () => void;
  onUpdatePayment?: () => void;
  onConnectAi?: () => void;
}): React.ReactElement {
  const copy = LOCK_COPY[reason];
  const onClick =
    reason === 'guest'
      ? onSignIn
      : reason === 'free'
        ? onUpgrade
        : reason === 'past_due'
          ? onUpdatePayment
          : onConnectAi;

  return (
    <div
      className="ask-layout"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
      }}
      data-testid="ask-lock"
      data-lock={reason}
    >
      <div className="ask-lock-page">
        <p className="al-title u-serif">{copy.title}</p>
        <p className="al-body">{copy.body}</p>
        {onClick ? (
          <div className="al-actions">
            <button type="button" className="btn accent sm" onClick={onClick}>
              {copy.cta}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PaidAskShell({
  initialScope = 'page',
  libraryDomain = null,
  onConnectAi,
}: {
  initialScope?: AskScopeChip;
  libraryDomain?: string | null;
  onConnectAi?: () => void;
}): React.ReactElement {
  const { isAuthenticated, currentMode } = useApp();
  const mode = currentMode || DEFAULT_MODE;
  const tab = useCurrentTabContext();
  const { data: dashboardData } = useDashboardData(mode, isAuthenticated);
  const domainHost = libraryDomain || tab.domain || undefined;
  const { highlights: domainHighlights } = useHighlightsByDomain(
    domainHost,
    isAuthenticated,
  );
  const query = useScopeQuery();
  const modelSelection = useAskModelSelection();
  const provider = modelSelection.activeProvider;
  const { fetch: fetchPageContext } = usePageContext();

  const [scope, setScope] = useState<AskScopeChip>(
    libraryDomain ? 'domain' : initialScope,
  );
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<ThreadTurn[]>([]);
  const [streamUserContent, setStreamUserContent] = useState<string | null>(null);
  const [askError, setAskError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const turnSeq = useRef(0);

  useEffect(() => {
    if (!libraryDomain) return;
    setScope('domain');
    setTurns([]);
    setStreamUserContent(null);
    setAskError(null);
    setQuestion('');
  }, [libraryDomain]);

  const nextId = (): string => {
    turnSeq.current += 1;
    return `turn-${turnSeq.current}`;
  };

  const currentSectionKey = useMemo(() => {
    if (!tab.url && !tab.path) return '/';
    return getSectionKey({
      url: tab.url ?? `https://${tab.domain ?? 'local'}${tab.path ?? '/'}`,
      path: tab.path ?? '/',
    });
  }, [tab.url, tab.path, tab.domain]);

  const pageHighlights = useMemo(() => {
    return domainHighlights.filter((h) => {
      const key = getSectionKey({ url: h.url, path: h.path });
      return key === currentSectionKey;
    });
  }, [domainHighlights, currentSectionKey]);

  const libraryHighlights = useMemo(() => {
    return dashboardData?.recentHighlights ?? [];
  }, [dashboardData?.recentHighlights]);

  const scopedRaw = useMemo(() => {
    if (scope === 'page') return pageHighlights;
    if (scope === 'domain') return domainHighlights;
    return libraryHighlights;
  }, [scope, pageHighlights, domainHighlights, libraryHighlights]);

  // Library ask input uses dashboard recentHighlights only — count matches corpus, not full vault total.
  const highlightCount = scopedRaw.length;
  const libraryIsRecentOnly = scope === 'library';

  const promptHighlights: PromptHighlight[] = useMemo(
    () =>
      scopedRaw.map((h) => ({
        id: h.id,
        text: h.text,
        url: h.url,
        title: 'domain' in h && typeof h.domain === 'string' ? h.domain : (tab.domain ?? ''),
      })),
    [scopedRaw, tab.domain],
  );

  const usableHighlights = useMemo(
    () => promptHighlights.filter((h) => h.text.trim().length > 0),
    [promptHighlights],
  );

  const scopeKind: ScopeKind = scope === 'domain' || scope === 'library' ? 'domain' : 'section';

  const scopeLabel = useMemo(() => {
    if (scope === 'library') return 'Library';
    if (scope === 'domain') return domainHost ?? 'Domain';
    const path = formatPath(tab.path);
    return tab.domain ? `${tab.domain}${path === '/' ? '' : path}` : path;
  }, [scope, domainHost, tab.domain, tab.path]);

  const breadcrumb = useMemo(() => {
    if (scope === 'library') return { segments: ['Library'] as string[] };
    if (scope === 'domain') {
      return { segments: [domainHost ?? 'This domain'] as string[] };
    }
    const domain = tab.domain ?? 'Page';
    const path = formatPath(tab.path);
    if (path === '/') return { segments: [domain] as string[] };
    return { segments: [domain, path] as string[] };
  }, [scope, domainHost, tab.domain, tab.path]);

  const busy = query.isPreparing || query.status === 'streaming';
  const inputDisabled = busy;
  const submitDisabled =
    inputDisabled || !question.trim() || usableHighlights.length === 0 || provider === null;

  const placeholder =
    scope === 'page'
      ? 'Ask about this page…'
      : scope === 'domain'
        ? 'Ask about this domain…'
        : 'Ask about your library…';

  const emptyHello =
    highlightCount === 0
      ? 'No highlights in this scope'
      : highlightCount === 1
        ? '1 highlight in this scope'
        : `${highlightCount} highlights in this scope`;

  // Finalize streaming turn into thread history
  useEffect(() => {
    if (query.status === 'done' && streamUserContent !== null) {
      const answer = query.chunks.trim();
      setTurns((prev) => [
        ...prev,
        { id: nextId(), role: 'user', content: streamUserContent },
        ...(answer
          ? [{ id: nextId(), role: 'assistant' as const, content: answer }]
          : []),
      ]);
      setStreamUserContent(null);
    }
    if (query.status === 'error' && streamUserContent !== null) {
      setTurns((prev) => [
        ...prev,
        { id: nextId(), role: 'user', content: streamUserContent },
        {
          id: nextId(),
          role: 'assistant',
          content: `Failed: ${query.error ?? query.prepareError ?? 'unknown error'}`,
        },
      ]);
      setStreamUserContent(null);
    }
  }, [query.status, query.chunks, query.error, query.prepareError, streamUserContent]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [turns, query.chunks, streamUserContent]);

  const handleScopeChange = (next: AskScopeChip): void => {
    if (next === scope || busy) return;
    setScope(next);
    setTurns([]);
    setStreamUserContent(null);
    setAskError(null);
    setQuestion('');
  };

  const runAsk = useCallback(
    async (raw: string): Promise<void> => {
      const trimmed = raw.trim();
      if (!trimmed || busy || usableHighlights.length === 0 || provider === null) return;
      setAskError(null);
      modelSelection.clearSelectError();
      setStreamUserContent(trimmed);
      setQuestion('');
      try {
        await query.ask({
          question: trimmed,
          scopeLabel,
          scopeKind,
          highlights: usableHighlights,
          fetchPageContext,
          provider,
        });
      } catch (err) {
        setAskError((err as Error).message);
        setStreamUserContent(null);
        setTurns((prev) => [
          ...prev,
          { id: nextId(), role: 'user', content: trimmed },
          {
            id: nextId(),
            role: 'assistant',
            content: `Failed: ${(err as Error).message}`,
          },
        ]);
      }
    },
    [
      busy,
      usableHighlights,
      provider,
      query,
      scopeLabel,
      scopeKind,
      fetchPageContext,
      modelSelection,
    ],
  );

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    void runAsk(question);
  };

  const handleSuggestion = (text: string): void => {
    void runAsk(text);
  };

  const showEmpty = turns.length === 0 && streamUserContent === null;
  // Keep live assistant while streamUserContent is set — including done/error until finalize clears it.
  const showStreamingAssistant = streamUserContent !== null;
  const suggestionsDisabled =
    busy || usableHighlights.length === 0 || provider === null;

  return (
    <div
      className="ask-layout"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        minHeight: 0,
        background: 'var(--paper)',
      }}
      data-testid="ask-paid-shell"
    >
      <div className="ask-chrome">
        <div className="ask-scope-bar" role="tablist" aria-label="Ask scope">
          {(['page', 'domain', 'library'] as const).map((chip) => (
            <button
              key={chip}
              type="button"
              role="tab"
              aria-selected={scope === chip}
              className={`scope-chip${scope === chip ? ' active' : ''}`}
              disabled={busy}
              onClick={() => handleScopeChange(chip)}
              data-testid={`ask-scope-${chip}`}
            >
              {chip === 'page' ? 'Page' : chip === 'domain' ? 'Domain' : 'Library'}
            </button>
          ))}
        </div>
        <div
          className="ag-crumb u-mono"
          style={{ marginTop: 8, fontSize: 11, color: 'var(--ink-3)' }}
          data-testid="ask-breadcrumb"
        >
          {breadcrumb.segments.map((seg, i) => (
            <React.Fragment key={`${seg}-${i}`}>
              {i > 0 ? <span className="ag-sep"> › </span> : null}
              <span>{seg}</span>
            </React.Fragment>
          ))}
        </div>
      </div>

      <div
        ref={scrollRef}
        className={`ask-scroll${showEmpty ? '' : ' ask-thread'}`}
        style={showEmpty ? undefined : { padding: '12px 14px', gap: 16 }}
      >
        {showEmpty ? (
          <div className="ask-empty ae-center" data-testid="ask-empty-suggestions">
            <p className="ae-hello u-serif">{emptyHello}</p>
            <p className="ae-line">Questions search these notes only.</p>
            <div className="ae-cta">
              {SUGGESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="chip refine-chip"
                  disabled={suggestionsDisabled}
                  onClick={() => handleSuggestion(q)}
                  data-testid={`ask-suggestion-${q}`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {turns.map((t) => (
              <div key={t.id} className="ask-turn">
                <div className={t.role === 'user' ? 'at-user' : 'at-assistant'}>{t.content}</div>
              </div>
            ))}
            {streamUserContent !== null ? (
              <div className="ask-turn" data-testid="ask-streaming-turn">
                <div className="at-user">{streamUserContent}</div>
                {showStreamingAssistant ? (
                  <div className="at-assistant">
                    {query.chunks ? (
                      <>
                        {query.chunks}
                        {query.status === 'streaming' ? (
                          <span className="at-dots" aria-hidden="true">
                            …
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <span className="at-thinking u-mono" aria-live="polite">
                        Thinking
                        <span className="at-dots" aria-hidden="true">
                          <span /><span /><span />
                        </span>
                      </span>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>

      <form className="ask-composer" onSubmit={handleSubmit}>
        <div style={{ marginBottom: 8 }}>
          <AskModelChip
            options={modelSelection.options}
            activeProvider={modelSelection.activeProvider}
            activeLabel={modelSelection.activeLabel}
            onSelect={(p) => {
              void modelSelection.selectProvider(p);
            }}
            onManage={() => {
              onConnectAi?.();
            }}
            emptyCta="Add provider"
            manageLabel="Manage"
            disabled={busy}
            selectError={modelSelection.selectError}
          />
        </div>
        <div className="ac-shell">
          <input
            ref={inputRef}
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={placeholder}
            disabled={inputDisabled}
            autoComplete="off"
            aria-label="Ask question"
            data-testid="ask-composer-input"
          />
          <button
            type={busy ? 'button' : 'submit'}
            className={`ac-send${busy ? ' is-loading' : ''}`}
            aria-label={busy ? 'Stop' : 'Send'}
            disabled={busy ? false : submitDisabled}
            onClick={
              busy
                ? (e) => {
                    e.preventDefault();
                    query.abort();
                    setStreamUserContent(null);
                  }
                : undefined
            }
            data-testid="ask-composer-send"
          >
            {busy ? '·' : '↑'}
          </button>
        </div>
        {askError ? (
          <p className="u-mono" style={{ margin: '6px 4px 0', fontSize: 11, color: 'var(--ink-3)' }}>
            {askError}
          </p>
        ) : null}
      </form>

      <div className="ask-ground u-mono" data-testid="ask-ground">
        Scope: {libraryIsRecentOnly ? 'library (recent)' : scope} · {highlightCount}{' '}
        highlight{highlightCount === 1 ? '' : 's'}
      </div>
    </div>
  );
}

export function AskView({
  lockReason = 'guest',
  onSignIn,
  onUpgrade,
  onUpdatePayment,
  onConnectAi,
  initialScope,
  libraryDomain = null,
}: AskViewProps): React.ReactElement {
  if (lockReason) {
    return (
      <AskLockPage
        reason={lockReason}
        onSignIn={onSignIn}
        onUpgrade={onUpgrade}
        onUpdatePayment={onUpdatePayment}
        onConnectAi={onConnectAi}
      />
    );
  }

  return (
    <PaidAskShell
      initialScope={initialScope}
      libraryDomain={libraryDomain}
      onConnectAi={onConnectAi}
    />
  );
}
