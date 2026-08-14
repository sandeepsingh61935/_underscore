/**
 * Ask tab body — commercial locks + Paid grounded chat (ADR-028).
 * Thin client: scope + active thread transcript; full history on web.
 * Wireframe: ui_kits/extension/v3/screens-ask.jsx (+ billing AskLockedBilling).
 * Body-only: PopupShell owns chrome (ModeHeader + TabBar).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AskModelChip } from '@/features/ai/components/AskModelChip';
import { useAskModelSelection } from '@/features/ai/hooks/useAskModelSelection';
import { useExtensionChat } from '@/features/ai/hooks/useExtensionChat';
import { useGroundedChatTurn } from '@/features/ai/hooks/useGroundedChatTurn';
import { usePageContext } from '@/features/ai/hooks/usePageContext';
import { useDashboardData } from '@/features/collections/hooks/useDashboardData';
import { useHighlightsByDomain } from '@/features/collections/hooks/useHighlightsByDomainFactory';
import { useApp } from '@/core/context/PopupAppProvider';
import { getExtensionSupabaseClient } from '@/shared/auth/supabase-extension-client';
import { getWebAppOrigin } from '@/shared/auth/web-legal-urls';
import type { ChatScope, Place } from '@/shared/chat';
import {
  ProjectService,
  SupabaseProjectRepository,
} from '@/shared/chat';
import { DEFAULT_MODE } from '@/shared/constants/mode-storage';
import { prepareHighlightExcerpts } from '@/shared/llm/prepare-highlight-excerpts';
import type { PromptHighlight } from '@/shared/llm/prompts';
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

function openWebAsk(threadId?: string | null): void {
  const origin = getWebAppOrigin();
  if (!origin) return;
  const url = threadId
    ? `${origin}/ask?thread=${encodeURIComponent(threadId)}`
    : `${origin}/ask`;
  if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
    void chrome.tabs.create({ url });
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

function chipToPlace(
  chip: AskScopeChip,
  domain: string | undefined,
  sectionKey: string,
): Place | null {
  if (chip === 'domain') {
    if (!domain) return null;
    return { type: 'domain', domain };
  }
  if (chip === 'page') {
    if (!domain) return null;
    return { type: 'section', domain, sectionKey };
  }
  // library → project place resolved async
  return null;
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
  const { isAuthenticated, currentMode, user } = useApp();
  const userId = user?.id ?? null;
  const mode = currentMode || DEFAULT_MODE;
  const tab = useCurrentTabContext();
  const { data: dashboardData } = useDashboardData(mode, isAuthenticated);
  const domainHost = libraryDomain || tab.domain || undefined;
  const { highlights: domainHighlights } = useHighlightsByDomain(
    domainHost,
    isAuthenticated,
  );
  const modelSelection = useAskModelSelection();
  const provider = modelSelection.activeProvider;
  const { fetch: fetchPageContext } = usePageContext();

  const chat = useExtensionChat({
    userId,
    enabled: isAuthenticated && Boolean(userId),
  });

  const turn = useGroundedChatTurn({
    userId,
    service: chat.service,
    activeThreadId: chat.activeThreadId,
    messages: chat.messages,
    onTurnStarted: chat.applyTurnStarted,
    onStreamText: chat.applyStreamText,
    onTurnFinished: chat.applyTurnFinished,
  });

  const [scope, setScope] = useState<AskScopeChip>(
    libraryDomain ? 'domain' : initialScope,
  );
  const [question, setQuestion] = useState('');
  const [askError, setAskError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!libraryDomain) return;
    setScope('domain');
    setAskError(null);
    setQuestion('');
  }, [libraryDomain]);

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

  const highlightCount = scopedRaw.length;
  const libraryIsRecentOnly = scope === 'library';

  const promptHighlights: PromptHighlight[] = useMemo(
    () =>
      scopedRaw.map((h) => ({
        id: h.id,
        text: h.text,
        url: h.url,
        title:
          'domain' in h && typeof h.domain === 'string'
            ? h.domain
            : (tab.domain ?? ''),
      })),
    [scopedRaw, tab.domain],
  );

  const usableHighlights = useMemo(
    () => promptHighlights.filter((h) => h.text.trim().length > 0),
    [promptHighlights],
  );

  const openChipPlace = useCallback(async (): Promise<ChatScope | null> => {
    if (!userId || !chat.service) return null;
    if (scope === 'library') {
      const domains = [
        ...new Set(
          libraryHighlights
            .map((h) =>
              'domain' in h && typeof h.domain === 'string' ? h.domain : null,
            )
            .filter((d): d is string => Boolean(d)),
        ),
      ];
      if (domains.length === 0) return null;
      const projectSvc = new ProjectService(
        new SupabaseProjectRepository(getExtensionSupabaseClient()),
        chat.service,
      );
      const project = await projectSvc.createUntitledFromMembers(
        userId,
        domains.map((domain) => ({ kind: 'domain' as const, domain })),
      );
      const thread = await projectSvc.openProjectChat(userId, project);
      await chat.selectThread(thread.id);
      return thread.scope;
    }
    const place = chipToPlace(scope, domainHost, currentSectionKey);
    if (!place) return null;
    const thread = await chat.service.resolvePlaceChat(userId, place, {
      title:
        place.type === 'domain'
          ? place.domain
          : place.type === 'section'
            ? place.sectionKey
            : 'Project',
    });
    await chat.selectThread(thread.id);
    return thread.scope;
  }, [
    chat,
    currentSectionKey,
    domainHost,
    libraryHighlights,
    scope,
    userId,
  ]);

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

  const busy = preparing || turn.busy;
  const inputDisabled = busy;
  const submitDisabled =
    inputDisabled ||
    !question.trim() ||
    usableHighlights.length === 0 ||
    provider === null ||
    !userId;

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

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [chat.messages, turn.streamText, turn.inflightAssistantId]);

  const handleScopeChange = (next: AskScopeChip): void => {
    if (next === scope || busy) return;
    turn.abort();
    setScope(next);
    chat.newThread();
    setAskError(null);
    setQuestion('');
    turn.clearError();
  };

  const runAsk = useCallback(
    async (raw: string): Promise<void> => {
      const trimmed = raw.trim();
      if (
        !trimmed ||
        busy ||
        usableHighlights.length === 0 ||
        provider === null ||
        !userId
      ) {
        return;
      }
      setAskError(null);
      modelSelection.clearSelectError();
      setQuestion('');
      setPreparing(true);
      try {
        const chatScope = await openChipPlace();
        if (!chatScope) {
          setAskError('Could not open a place chat for this scope.');
          return;
        }
        const { excerpts, errorNote } = await prepareHighlightExcerpts(
          usableHighlights,
          fetchPageContext,
        );
        if (errorNote) {
          setAskError(errorNote);
        }
        await turn.send({
          question: trimmed,
          scope: chatScope,
          excerpts,
          provider,
        });
      } catch (err) {
        setAskError((err as Error).message);
      } finally {
        setPreparing(false);
      }
    },
    [
      busy,
      usableHighlights,
      provider,
      userId,
      modelSelection,
      fetchPageContext,
      turn,
      openChipPlace,
    ],
  );

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    void runAsk(question);
  };

  const handleSuggestion = (text: string): void => {
    void runAsk(text);
  };

  const messages = chat.messages;
  const showEmpty = messages.length === 0 && !turn.busy && !preparing;
  const suggestionsDisabled =
    busy || usableHighlights.length === 0 || provider === null || !userId;
  const displayError = askError || turn.error || chat.error;
  const webOrigin = getWebAppOrigin();

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
        {webOrigin ? (
          <button
            type="button"
            className="u-mono"
            style={{
              marginTop: 6,
              fontSize: 11,
              color: 'var(--accent)',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              textAlign: 'left',
            }}
            data-testid="ask-continue-web"
            onClick={() => openWebAsk(chat.activeThreadId)}
          >
            Continue in web
          </button>
        ) : null}
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
            {messages.map((m) => {
              const body =
                m.status === 'streaming' && turn.inflightAssistantId === m.id
                  ? turn.streamText || m.content
                  : m.content;
              const showThinking =
                m.role === 'assistant' &&
                m.status === 'streaming' &&
                turn.inflightAssistantId === m.id &&
                !body.trim();
              return (
                <div key={m.id} className="ask-turn" data-testid={`ask-msg-${m.id}`}>
                  <div className={m.role === 'user' ? 'at-user' : 'at-assistant'}>
                    {showThinking ? (
                      <span className="at-thinking u-mono" aria-live="polite">
                        Thinking
                        <span className="at-dots" aria-hidden="true">
                          <span />
                          <span />
                          <span />
                        </span>
                      </span>
                    ) : (
                      <>
                        {body}
                        {m.role === 'assistant' &&
                        m.status === 'streaming' &&
                        turn.inflightAssistantId === m.id ? (
                          <span className="at-dots" aria-hidden="true">
                            …
                          </span>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
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
                    turn.abort();
                    setPreparing(false);
                  }
                : undefined
            }
            data-testid="ask-composer-send"
          >
            {busy ? '·' : '↑'}
          </button>
        </div>
        {displayError ? (
          <p
            className="u-mono"
            style={{ margin: '6px 4px 0', fontSize: 11, color: 'var(--ink-3)' }}
          >
            {displayError}
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
