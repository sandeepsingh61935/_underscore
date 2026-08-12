/**
 * @file AskPage.tsx
 * @description Product Ask — OD viewAsk parity: lock when !caps.ai;
 * paid shell with threads + grounding + composer (ADR-027 stream, ADR-028 history).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { AskModelChip } from '@/features/ai/components/AskModelChip';
import { useLLMStream } from '@/features/ai/hooks/useLLMStream';
import { useBillingContextOptional } from '@/features/billing/BillingProvider';
import { freeEntitlement } from '@/shared/billing';
import {
  assembleChatRequest,
  scopeKindForPrompt,
  scopeLabel as chatScopeLabel,
  type ChatScope,
} from '@/shared/chat';
import { buildFallbackExcerpts } from '@/shared/llm/summarization-fallback';
import { resolveSettingsBillingCta } from '@/shared/utils/settings-billing-cta';
import { resolveWebCaps } from '@/web/caps/resolveWebCaps';
import { resolveWebPaidActive } from '@/web/caps/resolveWebPaidActive';
import {
  useWebLibrary,
  type WebDomainNode,
  type WebHighlight,
} from '@/web/hooks/useWebLibrary';
import { useWebAskModelSelection } from '@/web/hooks/useWebAskModelSelection';
import { useWebChat } from '@/web/hooks/useWebChat';
import { parseLibrarySelection } from '@/web/routing/librarySelection';
import { buildSettingsSearch } from '@/web/routing/settingsTab';

type AskScope = 'library' | 'domain' | 'section';

type ScopeState = {
  scope: AskScope;
  domain: string | null;
  section: string | null;
};

function toChatScope(state: ScopeState): ChatScope {
  if (state.scope === 'section' && state.domain && state.section) {
    return { kind: 'section', domain: state.domain, sectionKey: state.section };
  }
  if (state.scope === 'domain' && state.domain) {
    return { kind: 'domain', domain: state.domain };
  }
  return { kind: 'library' };
}

function scopeStateFromChat(scope: ChatScope): ScopeState {
  if (scope.kind === 'section') {
    return { scope: 'section', domain: scope.domain, section: scope.sectionKey };
  }
  if (scope.kind === 'domain') {
    return { scope: 'domain', domain: scope.domain, section: null };
  }
  return { scope: 'library', domain: null, section: null };
}

function shortPath(p: string): string {
  const parts = String(p).split('/').filter(Boolean);
  return parts.length ? parts[parts.length - 1]! : p;
}

function scopeFromQuery(search: string): ScopeState {
  const sel = parseLibrarySelection(search);
  if (sel.domain && sel.section) {
    return { scope: 'section', domain: sel.domain, section: sel.section };
  }
  if (sel.domain) {
    return { scope: 'domain', domain: sel.domain, section: null };
  }
  return { scope: 'library', domain: null, section: null };
}

function countForScope(
  highlights: WebHighlight[],
  domains: WebDomainNode[],
  scope: ScopeState,
): number {
  if (scope.scope === 'library') return highlights.length;
  if (scope.scope === 'domain' && scope.domain) {
    const d = domains.find((x) => x.domain === scope.domain);
    return d?.count ?? highlights.filter((h) => h.domain === scope.domain).length;
  }
  if (scope.scope === 'section' && scope.domain && scope.section) {
    return highlights.filter(
      (h) => h.domain === scope.domain && h.path === scope.section,
    ).length;
  }
  return highlights.length;
}

function groundLabel(scope: ScopeState): string {
  if (scope.scope === 'section' && scope.section) return shortPath(scope.section);
  if (scope.scope === 'domain' && scope.domain) return scope.domain;
  return 'Library';
}

function placeholderFor(scope: AskScope): string {
  if (scope === 'section') return 'Chat this section…';
  if (scope === 'domain') return 'Chat this domain…';
  return 'Chat your library…';
}

function highlightsForScope(
  highlights: WebHighlight[],
  scope: ScopeState,
): WebHighlight[] {
  if (scope.scope === 'library') return highlights;
  if (scope.scope === 'domain' && scope.domain) {
    return highlights.filter((h) => h.domain === scope.domain);
  }
  if (scope.scope === 'section' && scope.domain && scope.section) {
    return highlights.filter(
      (h) => h.domain === scope.domain && h.path === scope.section,
    );
  }
  return highlights;
}

function toPromptHighlights(list: WebHighlight[]) {
  return list
    .filter((h) => h.quote.trim().length > 0)
    .map((h) => ({
      id: h.id,
      text: h.quote,
      url: `https://${h.domain}${h.path.startsWith('/') ? h.path : `/${h.path}`}`,
      title: h.path || h.domain,
    }));
}

function LockIcon(): React.ReactElement {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden="true"
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function AskLockPanel({
  isGuest,
  isPastDue,
  busy,
  onUpgrade,
  onUpdatePayment,
}: {
  isGuest: boolean;
  isPastDue: boolean;
  busy: boolean;
  onUpgrade: () => void;
  onUpdatePayment: () => void;
}): React.ReactElement {
  const planHref = `/settings?${buildSettingsSearch('plan')}`;

  return (
    <div data-od-id="ask-lock">
      <div className="lock-panel">
        <div className="icon" aria-hidden="true">
          <LockIcon />
        </div>
        <h3>Chat · Account (Paid)</h3>
        <p>
          {isPastDue
            ? 'Payment past due. Update billing in Polar to restore Chat. Answers ground only on your saved highlights.'
            : 'Answers ground only on your saved highlights. Upgrade via Polar — no card form in-app.'}
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {isGuest ? (
            <>
              <Link to="/sign-in" className="btn primary" data-od-id="ask-signin">
                Sign in
              </Link>
              <Link to={planHref} className="btn ghost" data-od-id="ask-see-plan">
                See plan
              </Link>
            </>
          ) : isPastDue ? (
            <>
              <button
                type="button"
                className="btn accent"
                data-od-id="ask-update-payment"
                data-billing-kind="update_payment"
                disabled={busy}
                onClick={onUpdatePayment}
              >
                Update payment
              </button>
              <Link to={planHref} className="btn ghost" data-od-id="ask-plan-details">
                Plan details
              </Link>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn accent"
                data-od-id="ask-upgrade"
                data-billing-kind="upgrade"
                disabled={busy}
                onClick={onUpgrade}
              >
                Upgrade
              </button>
              <Link to={planHref} className="btn ghost" data-od-id="ask-plan-details">
                Plan details
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PaidAskShell({
  highlights,
  domains,
  initialScope,
  isAuthenticated,
  userId,
}: {
  highlights: WebHighlight[];
  domains: WebDomainNode[];
  initialScope: ScopeState;
  isAuthenticated: boolean;
  userId?: string | null;
}): React.ReactElement {
  const [scope, setScope] = useState<ScopeState>(initialScope);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    if (initialScope.domain) return { [initialScope.domain]: true };
    return {};
  });
  const navigate = useNavigate();
  const [draft, setDraft] = useState('');
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const modelSelection = useWebAskModelSelection({ isAuthenticated, userId });
  const stream = useLLMStream();
  const chat = useWebChat({
    userId,
    enabled: isAuthenticated && Boolean(userId),
  });
  const inflightAssistantId = useRef<string | null>(null);
  const turnSubmitting = useRef(false);
  const [turnBusy, setTurnBusy] = useState(false);
  const prevStreamStatus = useRef(stream.status);
  const streamRef = useRef(stream);
  const chatRef = useRef(chat);
  streamRef.current = stream;
  chatRef.current = chat;

  // Keep composer scope in sync when URL query changes (new chat only).
  useEffect(() => {
    if (chat.activeThreadId) return;
    setScope(initialScope);
    if (initialScope.domain) {
      setExpanded((prev) => ({ ...prev, [initialScope.domain!]: true }));
    }
  }, [chat.activeThreadId, initialScope.scope, initialScope.domain, initialScope.section]);

  // When opening a thread, lock composer scope to the thread.
  const activeThread = useMemo(
    () => chat.threads.find((t) => t.id === chat.activeThreadId) ?? null,
    [chat.activeThreadId, chat.threads],
  );

  useEffect(() => {
    if (!activeThread) return;
    const next = scopeStateFromChat(activeThread.scope);
    setScope(next);
    if (next.domain) {
      setExpanded((prev) => ({ ...prev, [next.domain!]: true }));
    }
  }, [activeThread]);

  const clearTurnBusy = useCallback(() => {
    turnSubmitting.current = false;
    setTurnBusy(false);
  }, []);

  // Stream → finalize assistant row (ADR-028 write path).
  useEffect(() => {
    const prev = prevStreamStatus.current;
    prevStreamStatus.current = stream.status;
    const assistantId = inflightAssistantId.current;
    if (!assistantId) return;

    if (stream.status === 'streaming') {
      chat.patchLocalMessage(assistantId, { content: stream.chunks, status: 'streaming' });
      return;
    }

    if (stream.status === 'done' && prev === 'streaming') {
      inflightAssistantId.current = null;
      void chat
        .finalizeTurn({
          assistantMessageId: assistantId,
          content: stream.chunks,
          status: 'completed',
          provider: modelSelection.activeProvider ?? undefined,
        })
        .then(() => clearTurnBusy())
        .catch((err: Error) => {
          chat.patchLocalMessage(assistantId, {
            content: stream.chunks,
            status: 'completed',
          });
          clearTurnBusy();
          setPrepareError(err.message || 'Failed to save answer');
        });
      return;
    }

    if (stream.status === 'error' && prev === 'streaming') {
      inflightAssistantId.current = null;
      void chat
        .finalizeTurn({
          assistantMessageId: assistantId,
          content: stream.chunks,
          status: 'failed',
          provider: modelSelection.activeProvider ?? undefined,
        })
        .catch(() => undefined)
        .finally(() => clearTurnBusy());
    }

    if (stream.status === 'idle' && prev === 'streaming') {
      // abort()
      inflightAssistantId.current = null;
      void chat
        .finalizeTurn({
          assistantMessageId: assistantId,
          content: stream.chunks,
          status: 'cancelled',
          provider: modelSelection.activeProvider ?? undefined,
        })
        .catch(() => undefined)
        .finally(() => clearTurnBusy());
    }
  }, [chat, clearTurnBusy, modelSelection.activeProvider, stream.chunks, stream.status]);

  // Unmount / hard leave: cancel in-flight assistant so it is not stuck streaming.
  useEffect(() => {
    return () => {
      const assistantId = inflightAssistantId.current;
      if (!assistantId) return;
      inflightAssistantId.current = null;
      const chunks = streamRef.current.chunks;
      streamRef.current.abort();
      void chatRef.current
        .finalizeTurn({
          assistantMessageId: assistantId,
          content: chunks,
          status: 'cancelled',
        })
        .catch(() => undefined);
    };
  }, []);

  const cancelInflightIfAny = useCallback(() => {
    const assistantId = inflightAssistantId.current;
    if (!assistantId && stream.status !== 'streaming' && !turnBusy) return;
    if (assistantId) {
      inflightAssistantId.current = null;
      const chunks = stream.chunks;
      stream.abort();
      void chat
        .finalizeTurn({
          assistantMessageId: assistantId,
          content: chunks,
          status: 'cancelled',
          provider: modelSelection.activeProvider ?? undefined,
        })
        .catch(() => undefined)
        .finally(() => clearTurnBusy());
    } else if (stream.status === 'streaming') {
      stream.abort();
      clearTurnBusy();
    }
  }, [chat, clearTurnBusy, modelSelection.activeProvider, stream, turnBusy]);

  const groundCount = countForScope(highlights, domains, scope);
  const ground = groundLabel(scope);
  const aiSettingsHref = `/settings?${buildSettingsSearch('ai')}`;
  const needsKey = modelSelection.activeProvider === null;
  const busy = stream.status === 'streaming' || turnBusy;
  const streamError = prepareError || stream.error || chat.error;
  const hasTranscript = chat.messages.length > 0 || busy;

  const selectLibrary = useCallback(() => {
    if (busy) return;
    cancelInflightIfAny();
    if (chat.activeThreadId) chat.newThread();
    setScope({ scope: 'library', domain: null, section: null });
    setPrepareError(null);
  }, [busy, cancelInflightIfAny, chat]);

  const selectDomain = useCallback(
    (domain: string) => {
      if (busy) return;
      cancelInflightIfAny();
      if (chat.activeThreadId) chat.newThread();
      setScope({ scope: 'domain', domain, section: null });
      setExpanded((prev) => ({ ...prev, [domain]: true }));
      setPrepareError(null);
    },
    [busy, cancelInflightIfAny, chat],
  );

  const selectSection = useCallback(
    (domain: string, path: string) => {
      if (busy) return;
      cancelInflightIfAny();
      if (chat.activeThreadId) chat.newThread();
      setScope({ scope: 'section', domain, section: path });
      setExpanded((prev) => ({ ...prev, [domain]: true }));
      setPrepareError(null);
    },
    [busy, cancelInflightIfAny, chat],
  );

  const toggleDomain = useCallback((domain: string) => {
    setExpanded((prev) => ({ ...prev, [domain]: !prev[domain] }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const q = draft.trim();
      if (!q || busy || turnSubmitting.current) return;
      if (needsKey || !modelSelection.activeProvider) {
        setPrepareError(
          'Add a provider key on this device (Settings → Models & providers).',
        );
        return;
      }
      if (!userId) {
        setPrepareError('Sign in required to save chat history.');
        return;
      }

      setPrepareError(null);

      const chatScope = activeThread ? activeThread.scope : toChatScope(scope);
      const scopeForHighlights = activeThread
        ? scopeStateFromChat(activeThread.scope)
        : scope;
      const scoped = highlightsForScope(highlights, scopeForHighlights);
      const promptHighlights = toPromptHighlights(scoped);
      if (promptHighlights.length === 0) {
        setPrepareError('No highlights in this scope to ground the answer.');
        return;
      }

      turnSubmitting.current = true;
      setTurnBusy(true);

      try {
        // Prior completed turns only (React state not yet updated by beginTurn).
        const history = chat.messages.filter((m) => m.status === 'completed');

        const turn = await chat.beginTurn({
          question: q,
          scope: chatScope,
          provider: modelSelection.activeProvider,
        });
        inflightAssistantId.current = turn.assistantMessage.id;
        setDraft('');

        // Web has no extension page-context cache — ground on quote excerpts only.
        const { excerpts } = buildFallbackExcerpts(promptHighlights);

        try {
          stream.start({
            request: assembleChatRequest({
              scope: {
                scopeLabel: chatScopeLabel(chatScope),
                scopeKind: scopeKindForPrompt(chatScope),
                highlightCount: promptHighlights.length,
              },
              excerpts,
              history,
              question: q,
            }),
            provider: modelSelection.activeProvider,
          });
        } catch (streamErr) {
          inflightAssistantId.current = null;
          void chat
            .finalizeTurn({
              assistantMessageId: turn.assistantMessage.id,
              content: '',
              status: 'failed',
              provider: modelSelection.activeProvider,
            })
            .catch(() => undefined);
          clearTurnBusy();
          throw streamErr;
        }
      } catch (err) {
        inflightAssistantId.current = null;
        clearTurnBusy();
        setPrepareError((err as Error).message || 'Could not prepare question');
      }
    },
    [
      activeThread,
      busy,
      chat,
      clearTurnBusy,
      draft,
      highlights,
      modelSelection.activeProvider,
      needsKey,
      scope,
      stream,
      userId,
    ],
  );

  const handleAbort = useCallback(() => {
    stream.abort();
  }, [stream]);

  return (
    <div className="ask-shell" data-od-id="ask">
      <div className="ask-projects" data-od-id="ask-projects">
        <div className="ask-projects-head">
          <h1 data-od-id="ask-title">Chat</h1>
          <button
            type="button"
            className="btn ghost sm"
            data-od-id="ask-new-thread"
            style={{ marginTop: 8 }}
            disabled={busy}
            onClick={() => {
              cancelInflightIfAny();
              chat.newThread();
              setPrepareError(null);
            }}
          >
            New chat
          </button>
        </div>

        <div className="ask-projects-body" data-od-id="ask-thread-list">
          {chat.threads.length > 0 ? (
            <ul className="ask-thread-list" aria-label="Chats">
              {chat.threads.map((t) => {
                const active = t.id === chat.activeThreadId;
                return (
                  <li key={t.id} className="ask-thread-row">
                    <button
                      type="button"
                      className={`tree-item ask-thread-item${active ? ' active' : ''}`}
                      data-od-id={`ask-thread-${t.id}`}
                      aria-current={active ? 'true' : undefined}
                      disabled={busy}
                      onClick={() => {
                        cancelInflightIfAny();
                        void chat.selectThread(t.id);
                        setPrepareError(null);
                      }}
                    >
                      <span className="tree-label">{t.title}</span>
                    </button>
                    <button
                      type="button"
                      className="ask-thread-delete"
                      data-od-id={`ask-thread-delete-${t.id}`}
                      aria-label={`Delete ${t.title}`}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        void chat.deleteThread(t.id);
                      }}
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="composer-note" style={{ padding: '0 6px' }}>
              No saved chats yet.
            </p>
          )}

          <p
            className="u-kicker"
            style={{ margin: '16px 6px 8px', color: 'var(--ink-3)' }}
          >
            Grounding
          </p>
          <div role="tree" aria-label="Grounding">
            <div className="tree-row">
              <span className="tree-chev-slot" aria-hidden="true" />
              <button
                type="button"
                className={`tree-item${scope.scope === 'library' && !chat.activeThreadId ? ' active' : ''}`}
                data-od-id="ask-proj-all"
                role="treeitem"
                aria-selected={scope.scope === 'library'}
                onClick={selectLibrary}
              >
                <span className="folder-ico" aria-hidden="true">
                  ◈
                </span>
                <span className="tree-label">Library</span>
              </button>
            </div>

            {domains.map((d) => {
              const open = !!expanded[d.domain];
              const activeDom = scope.scope === 'domain' && scope.domain === d.domain;
              const domId = d.domain.replace(/\./g, '-');
              return (
                <div key={d.domain} className="tree-group" data-tree-group={d.domain}>
                  <div className="tree-row">
                    <button
                      type="button"
                      className={`tree-toggle${open ? ' open' : ''}`}
                      aria-label={`${open ? 'Collapse' : 'Expand'} ${d.domain}`}
                      aria-expanded={open}
                      onClick={() => toggleDomain(d.domain)}
                    >
                      <svg
                        className="tree-chevron"
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M4 2.5 8 6 4 9.5"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className={`tree-item${activeDom ? ' active' : ''}`}
                      data-od-id={`ask-proj-${domId}`}
                      role="treeitem"
                      aria-selected={activeDom}
                      onClick={() => selectDomain(d.domain)}
                    >
                      <span className="folder-ico" aria-hidden="true">
                        {d.domain.slice(0, 1)}
                      </span>
                      <span className="tree-label">{d.domain}</span>
                    </button>
                  </div>
                  <div
                    className={`tree-children${open ? ' is-open' : ''}`}
                    data-tree-children
                  >
                    <div className="tree-children-inner">
                      {d.sections.map((s) => {
                        const activeSec =
                          scope.scope === 'section' &&
                          scope.domain === d.domain &&
                          scope.section === s.path;
                        return (
                          <button
                            key={s.path}
                            type="button"
                            className={`tree-item is-child${activeSec ? ' active' : ''}`}
                            role="treeitem"
                            aria-selected={activeSec}
                            onClick={() => selectSection(d.domain, s.path)}
                          >
                            <span className="tree-label">{s.path}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="ask-chat" data-od-id="ask-chat">
        {hasTranscript ? (
          <div className="ask-thread" data-od-id="ask-transcript">
            {chat.messages.map((m) => {
              if (m.role === 'user') {
                return (
                  <div
                    key={m.id}
                    className="bubble-user"
                    data-od-id="ask-user-bubble"
                  >
                    {m.content}
                  </div>
                );
              }
              const body =
                m.status === 'streaming' &&
                inflightAssistantId.current === m.id
                  ? stream.chunks || m.content
                  : m.content;
              return (
                <div
                  key={m.id}
                  className="bubble-ai"
                  data-od-id="ask-answer"
                  data-status={m.status}
                >
                  {m.status === 'streaming' && !body ? (
                    <span data-od-id="ask-streaming" aria-live="polite">
                      …
                    </span>
                  ) : (
                    <span style={{ whiteSpace: 'pre-wrap' }}>{body}</span>
                  )}
                  {m.status === 'failed' ? (
                    <p className="composer-note" style={{ marginTop: 8 }}>
                      Failed{stream.error ? `: ${stream.error}` : ''}
                    </p>
                  ) : null}
                </div>
              );
            })}
            {busy ? (
              <button
                type="button"
                className="btn ghost sm"
                data-od-id="ask-abort"
                style={{ alignSelf: 'flex-start' }}
                onClick={handleAbort}
              >
                Stop
              </button>
            ) : null}
          </div>
        ) : (
          <div className="ask-quiet" data-od-id="ask-empty">
            <span>Ask grounded questions about your library.</span>
          </div>
        )}
        <form
          className="ask-composer"
          data-od-id="ask-composer"
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
        >
          <div className="ask-composer-inner">
            <div
              className="scope-pill"
              data-od-id="ask-ground"
              title="Answers use only this scope"
            >
              <span>{ground}</span>
              <span className="n">{groundCount}</span>
            </div>
            <div className="composer-note" data-od-id="ask-model-label">
              <AskModelChip
                options={modelSelection.options}
                activeProvider={modelSelection.activeProvider}
                activeLabel={
                  needsKey ? 'Add provider' : modelSelection.activeLabel
                }
                onSelect={(p) => {
                  void modelSelection.selectProvider(p);
                }}
                onManage={() => {
                  navigate(aiSettingsHref);
                }}
                emptyCta="Add provider"
                manageLabel="Manage"
                selectError={modelSelection.selectError}
              />
            </div>
            <div className="composer-shell">
              <textarea
                id="ask-input"
                data-od-id="ask-input"
                rows={1}
                placeholder={
                  needsKey
                    ? 'Add a model key to chat…'
                    : placeholderFor(scope.scope)
                }
                aria-label="Question"
                value={draft}
                disabled={busy}
                onChange={(e) => {
                  setDraft(e.target.value);
                  if (prepareError) setPrepareError(null);
                }}
              />
              <button
                type="submit"
                className="ask-send-btn"
                data-od-id="ask-send"
                aria-label="Send question"
                disabled={!draft.trim() || busy || needsKey}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 19V5" />
                  <path d="m5 12 7-7 7 7" />
                </svg>
              </button>
            </div>
            {streamError ? (
              <p
                className="composer-note"
                data-od-id="ask-stream-error"
                role="alert"
                style={{ color: 'var(--ink-2)', marginTop: 8 }}
              >
                {streamError}
              </p>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Ask product page. Guest/Free/past_due → lock; Paid → grounding + composer.
 * Streams via browser ILlmRuntime (no chrome).
 */
export function AskPage(): React.ReactElement {
  const { isAuthenticated, user } = useApp();
  const billing = useBillingContextOptional();
  const location = useLocation();

  const entitlement = billing?.snapshot.entitlement ?? freeEntitlement();
  // Never demote paid on load error — match Settings billing gate.
  const isPaidActive = resolveWebPaidActive(billing?.snapshot);

  const caps = useMemo(
    () =>
      resolveWebCaps({
        isAuthenticated,
        isPaidActive,
        billingStatus: entitlement.status,
      }),
    [isAuthenticated, isPaidActive, entitlement.status],
  );

  const lib = useWebLibrary({
    isAuthenticated,
    planLabel: caps.planLabel,
  });

  const billingCta = billing
    ? resolveSettingsBillingCta({
        isPaidActive,
        status: entitlement.status,
        cancelAtPeriodEnd: entitlement.cancelAtPeriodEnd,
      })
    : null;

  const handleUpgrade = useCallback(() => {
    if (!billing) return;
    void billing.startCheckout().catch(() => {
      /* surface via absence of navigation; page stays locked */
    });
  }, [billing]);

  const handleUpdatePayment = useCallback(() => {
    if (!billing) return;
    void billing.openPortal().catch(() => {
      /* portal open failed; stay on lock */
    });
  }, [billing]);

  // Prefer explicit billing matrix action when present.
  const onPrimaryBilling = useCallback(() => {
    if (!billing || !billingCta) return;
    if (billingCta.action === 'portal') {
      void billing.openPortal().catch(() => undefined);
      return;
    }
    void billing.startCheckout().catch(() => undefined);
  }, [billing, billingCta]);

  const initialScope = useMemo(
    () => scopeFromQuery(location.search),
    [location.search],
  );

  if (!caps.flags.ai) {
    return (
      <AskLockPanel
        isGuest={caps.isGuest}
        isPastDue={caps.isPastDue}
        busy={billing?.busy ?? false}
        onUpgrade={
          billingCta?.action === 'checkout' ? onPrimaryBilling : handleUpgrade
        }
        onUpdatePayment={
          billingCta?.action === 'portal' ? onPrimaryBilling : handleUpdatePayment
        }
      />
    );
  }

  if (lib.status === 'loading') {
    return (
      <div className="ask-shell" data-od-id="ask">
        <div
          className="skeleton-stage"
          data-od-id="loading-state"
          aria-busy="true"
          aria-label="Loading"
          style={{ padding: 24, gridColumn: '1 / -1' }}
        >
          <div
            className="skeleton sk-line"
            style={{ width: '28%', height: 24, marginBottom: 16 }}
          />
          <div
            className="skeleton"
            style={{ height: 280, borderRadius: 'var(--r-lg)' }}
          />
        </div>
      </div>
    );
  }

  if (lib.status === 'error') {
    return (
      <div className="ask-shell" data-od-id="ask">
        <div className="state-box" data-od-id="error-state" style={{ gridColumn: '1 / -1' }}>
          <h3>Chat is offline</h3>
          <p>{lib.error || 'Try again in a moment.'}</p>
          <div className="actions">
            <button
              type="button"
              className="btn primary sm"
              onClick={() => {
                void lib.refresh();
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PaidAskShell
      highlights={lib.highlights}
      domains={lib.domains}
      initialScope={initialScope}
      isAuthenticated={isAuthenticated}
      userId={user?.id ?? null}
    />
  );
}
