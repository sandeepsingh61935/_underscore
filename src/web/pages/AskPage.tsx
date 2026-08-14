/**
 * @file AskPage.tsx
 * @description Place-based Ask — domain/section/project singletons + grounded turns.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { useGroundedChatTurn } from '@/features/ai/hooks/useGroundedChatTurn';
import { useBillingContextOptional } from '@/features/billing/BillingProvider';
import { freeEntitlement } from '@/shared/billing';
import {
  highlightsForPlace,
  placeToScope,
  scopeToPlace,
  summarizeMembers,
  type ChatProject,
  type Place,
} from '@/shared/chat';
import { noopPageContextFetch } from '@/shared/llm/noop-page-context-fetch';
import { prepareHighlightExcerpts } from '@/shared/llm/prepare-highlight-excerpts';
import { resolveSettingsBillingCta } from '@/shared/utils/settings-billing-cta';
import { AskComposer } from '@/web/components/ask/AskComposer';
import { AskPlaceRail } from '@/web/components/ask/AskPlaceRail';
import { AskTranscript } from '@/web/components/ask/AskTranscript';
import { resolveWebCaps } from '@/web/caps/resolveWebCaps';
import { resolveWebPaidActive } from '@/web/caps/resolveWebPaidActive';
import {
  useWebLibrary,
  type WebDomainNode,
  type WebHighlight,
} from '@/web/hooks/useWebLibrary';
import { useWebAskModelSelection } from '@/web/hooks/useWebAskModelSelection';
import { useWebChat } from '@/web/hooks/useWebChat';
import { useWebProjects } from '@/web/hooks/useWebProjects';
import { parseLibrarySelection } from '@/web/routing/librarySelection';
import { buildSettingsSearch } from '@/web/routing/settingsTab';

function placeFromQuery(search: string): Place | null {
  const sel = parseLibrarySelection(search);
  if (sel.domain && sel.section) {
    return {
      type: 'section',
      domain: sel.domain,
      sectionKey: sel.section,
    };
  }
  if (sel.domain) {
    return { type: 'domain', domain: sel.domain };
  }
  return null;
}

function toPlaceHighlights(list: WebHighlight[]) {
  return list.map((h) => ({
    id: h.id,
    domain: h.domain,
    path: h.path,
    text: h.quote,
    url: `https://${h.domain}${h.path.startsWith('/') ? h.path : `/${h.path}`}`,
  }));
}

function toPromptHighlights(
  list: Array<{
    id: string;
    domain: string;
    path: string;
    text: string;
    url?: string;
  }>,
) {
  return list
    .filter((h) => h.text.trim().length > 0)
    .map((h) => ({
      id: h.id,
      text: h.text,
      url: h.url ?? `https://${h.domain}`,
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
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 8,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
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
  initialPlace,
  isAuthenticated,
  userId,
}: {
  highlights: WebHighlight[];
  domains: WebDomainNode[];
  initialPlace: Place | null;
  isAuthenticated: boolean;
  userId?: string | null;
}): React.ReactElement {
  const [activePlace, setActivePlace] = useState<Place | null>(initialPlace);
  const [draft, setDraft] = useState('');
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const modelSelection = useWebAskModelSelection({ isAuthenticated, userId });

  const chat = useWebChat({
    userId,
    enabled: isAuthenticated && Boolean(userId),
  });

  const projects = useWebProjects({
    userId,
    enabled: isAuthenticated && Boolean(userId),
    chatService: chat.service,
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

  const activeProject: ChatProject | null = useMemo(() => {
    if (!activePlace || activePlace.type !== 'project') return null;
    return projects.projects.find((p) => p.id === activePlace.projectId) ?? null;
  }, [activePlace, projects.projects]);

  const effectiveScope = useMemo(() => {
    // No library chat identity — require an explicit place for scope.
    if (!activePlace) {
      return { kind: 'domain' as const, domain: '—' };
    }
    return placeToScope(activePlace);
  }, [activePlace]);

  const placeHighlights = useMemo(() => {
    if (!activePlace) return [];
    const members =
      activePlace.type === 'project' ? activeProject?.members : undefined;
    return highlightsForPlace(
      toPlaceHighlights(highlights),
      activePlace,
      members,
    );
  }, [activePlace, activeProject?.members, highlights]);

  const groundCount = placeHighlights.length;
  const needsKey = modelSelection.activeProvider === null;
  const busy = turn.busy || opening;
  const error = prepareError || turn.error || chat.error || projects.error;

  const openPlace = useCallback(
    async (place: Place) => {
      if (!userId || !chat.service) {
        setPrepareError('Sign in required for place chat.');
        return;
      }
      setOpening(true);
      setPrepareError(null);
      turn.clearError();
      turn.abort();
      try {
        const title =
          place.type === 'domain'
            ? place.domain
            : place.type === 'section'
              ? place.sectionKey
              : activeProject?.title;
        const thread = await chat.service.resolvePlaceChat(userId, place, {
          title,
        });
        setActivePlace(place);
        await chat.selectThread(thread.id);
      } catch (err) {
        setPrepareError((err as Error).message || 'Failed to open place');
      } finally {
        setOpening(false);
      }
    },
    [activeProject?.title, chat, turn, userId],
  );

  // Open initial place from URL / library selection once service is ready
  useEffect(() => {
    if (!initialPlace || !chat.service || !userId) return;
    if (activePlace) return;
    void openPlace(initialPlace);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot open
  }, [chat.service, userId, initialPlace]);

  // Sync place from active thread (e.g. after turn creates thread)
  useEffect(() => {
    const t = chat.threads.find((x) => x.id === chat.activeThreadId);
    if (!t) return;
    const p = scopeToPlace(t.scope);
    if (p) setActivePlace(p);
  }, [chat.activeThreadId, chat.threads]);

  const handleCreateProject = useCallback(() => {
    if (busy || !userId) return;
    void (async () => {
      try {
        setPrepareError(null);
        turn.clearError();
        turn.abort();
        // Project row only — chat thread created on first send (faster create).
        const p = await projects.createUntitled([]);
        setActivePlace({ type: 'project', projectId: p.id });
        chat.newThread();
      } catch (err) {
        setPrepareError((err as Error).message || 'Failed to create project');
      }
    })();
  }, [busy, chat, projects, turn, userId]);

  const handleClearChat = useCallback(() => {
    if (busy || !userId || !chat.activeThreadId || !chat.service) return;
    void (async () => {
      try {
        await chat.service!.clearConversation(userId, chat.activeThreadId!);
        await chat.selectThread(chat.activeThreadId);
      } catch (err) {
        setPrepareError((err as Error).message || 'Failed to clear chat');
      }
    })();
  }, [busy, chat, userId]);

  const handleDeleteProject = useCallback(
    (projectId: string) => {
      if (busy) return;
      void (async () => {
        await projects.remove(projectId);
        if (activePlace?.type === 'project' && activePlace.projectId === projectId) {
          setActivePlace(null);
          chat.newThread();
        }
      })();
    },
    [activePlace, busy, chat, projects],
  );

  const handleSubmit = useCallback(() => {
    const q = draft.trim();
    if (!q || busy) return;
    if (!activePlace) {
      setPrepareError('Select a domain or project first.');
      return;
    }
    if (needsKey || !modelSelection.activeProvider) {
      setPrepareError(
        'Add a provider key on this device (Settings → Models & providers).',
      );
      return;
    }
    if (!userId || !chat.service) {
      setPrepareError('Sign in required to save chat history.');
      return;
    }

    const promptHighlights = toPromptHighlights(placeHighlights);
    if (promptHighlights.length === 0) {
      setPrepareError('No highlights in this place to ground the answer.');
      return;
    }

    setPrepareError(null);
    turn.clearError();
    setDraft('');
    void (async () => {
      try {
        // Lazily ensure place thread (deferred on New project until first message).
        if (!chat.activeThreadId) {
          await openPlace(activePlace);
        }
        const { excerpts, errorNote } = await prepareHighlightExcerpts(
          promptHighlights,
          noopPageContextFetch,
        );
        if (errorNote) setPrepareError(errorNote);
        await turn.send({
          question: q,
          scope: placeToScope(activePlace),
          excerpts,
          provider: modelSelection.activeProvider!,
        });
      } catch (err) {
        setPrepareError((err as Error).message || 'Failed to prepare grounding');
      }
    })();
  }, [
    activePlace,
    busy,
    chat,
    draft,
    modelSelection.activeProvider,
    needsKey,
    openPlace,
    placeHighlights,
    turn,
    userId,
  ]);

  const groundNote =
    activePlace?.type === 'project'
      ? summarizeMembers(activeProject?.members ?? [])
      : null;

  return (
    <div className="ask-shell" data-od-id="ask">
      <div className="ask-projects" data-od-id="ask-projects">
        <AskPlaceRail
          domains={domains}
          projects={projects.projects}
          activePlace={activePlace}
          busy={busy}
          onSelectPlace={(p) => {
            void openPlace(p);
          }}
          onCreateProject={handleCreateProject}
          onClearChat={handleClearChat}
          onDeleteProject={handleDeleteProject}
        />
        {activePlace?.type === 'project' ? (
          <div className="ask-projects-body" style={{ padding: '8px 12px' }}>
            <p className="u-kicker" style={{ color: 'var(--ink-3)' }}>
              Project grounding
            </p>
            <p className="composer-note" style={{ marginTop: 4 }}>
              {groundNote}
              {activeProject?.members.length === 0
                ? ' Add domains from the library (coming soon: member editor). Create multi-domain projects via multi-select later.'
                : null}
            </p>
            {domains.length > 0 ? (
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {domains.map((d) => {
                  const on = activeProject?.members.some(
                    (m) => m.kind === 'domain' && m.domain === d.domain,
                  );
                  return (
                    <button
                      key={d.domain}
                      type="button"
                      className={`chip refine-chip${on ? ' active' : ''}`}
                      disabled={busy || !activeProject}
                      data-testid={`ask-member-toggle-${d.domain}`}
                      onClick={() => {
                        if (!activeProject || !userId) return;
                        const members = on
                          ? activeProject.members.filter(
                              (m) =>
                                !(m.kind === 'domain' && m.domain === d.domain),
                            )
                          : [
                              ...activeProject.members,
                              { kind: 'domain' as const, domain: d.domain },
                            ];
                        void projects.setMembers(activeProject.id, members);
                      }}
                    >
                      {on ? '− ' : '+ '}
                      {d.domain}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="ask-chat" data-od-id="ask-chat">
        {!activePlace ? (
          <div className="ask-quiet" data-od-id="ask-pick-place">
            <span>Select a domain or project to open its chat.</span>
          </div>
        ) : (
          <AskTranscript
            messages={chat.messages}
            streamText={turn.streamText}
            inflightAssistantId={turn.inflightAssistantId}
            busy={busy}
            streamError={turn.error}
            onAbort={turn.abort}
          />
        )}
        <AskComposer
          scope={effectiveScope}
          groundCount={groundCount}
          draft={draft}
          onDraftChange={(v) => {
            setDraft(v);
            if (prepareError) setPrepareError(null);
          }}
          busy={busy || !activePlace}
          needsKey={needsKey}
          error={error}
          modelOptions={modelSelection.options}
          activeProvider={modelSelection.activeProvider}
          activeLabel={modelSelection.activeLabel}
          selectError={modelSelection.selectError}
          onSelectProvider={(p) => {
            void modelSelection.selectProvider(p);
          }}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}

export function AskPage(): React.ReactElement {
  const { isAuthenticated, user } = useApp();
  const billing = useBillingContextOptional();
  const location = useLocation();

  const entitlement = billing?.snapshot.entitlement ?? freeEntitlement();
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
    void billing.startCheckout().catch(() => undefined);
  }, [billing]);

  const handleUpdatePayment = useCallback(() => {
    if (!billing) return;
    void billing.openPortal().catch(() => undefined);
  }, [billing]);

  const onPrimaryBilling = useCallback(() => {
    if (!billing || !billingCta) return;
    if (billingCta.action === 'portal') {
      void billing.openPortal().catch(() => undefined);
      return;
    }
    void billing.startCheckout().catch(() => undefined);
  }, [billing, billingCta]);

  const initialPlace = useMemo(
    () => placeFromQuery(location.search),
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
        <div
          className="state-box"
          data-od-id="error-state"
          style={{ gridColumn: '1 / -1' }}
        >
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
      initialPlace={initialPlace}
      isAuthenticated={isAuthenticated}
      userId={user?.id ?? null}
    />
  );
}
