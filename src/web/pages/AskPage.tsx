/**
 * @file AskPage.tsx
 * @description Product Ask — lock when !caps.ai; paid shell with threads +
 * grounding + composer. Turn lifecycle via useGroundedChatTurn (ADR-027/028).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { useGroundedChatTurn } from '@/features/ai/hooks/useGroundedChatTurn';
import { useBillingContextOptional } from '@/features/billing/BillingProvider';
import { freeEntitlement } from '@/shared/billing';
import type { ChatScope } from '@/shared/chat';
import { buildFallbackExcerpts } from '@/shared/llm/summarization-fallback';
import { resolveSettingsBillingCta } from '@/shared/utils/settings-billing-cta';
import { AskComposer } from '@/web/components/ask/AskComposer';
import { AskGroundingTree } from '@/web/components/ask/AskGroundingTree';
import { AskThreadSidebar } from '@/web/components/ask/AskThreadSidebar';
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
import { parseLibrarySelection } from '@/web/routing/librarySelection';
import { buildSettingsSearch } from '@/web/routing/settingsTab';

function scopeFromQuery(search: string): ChatScope {
  const sel = parseLibrarySelection(search);
  if (sel.domain && sel.section) {
    return { kind: 'section', domain: sel.domain, sectionKey: sel.section };
  }
  if (sel.domain) {
    return { kind: 'domain', domain: sel.domain };
  }
  return { kind: 'library' };
}

function countForScope(
  highlights: WebHighlight[],
  domains: WebDomainNode[],
  scope: ChatScope,
): number {
  if (scope.kind === 'library') return highlights.length;
  if (scope.kind === 'domain') {
    const d = domains.find((x) => x.domain === scope.domain);
    return d?.count ?? highlights.filter((h) => h.domain === scope.domain).length;
  }
  return highlights.filter(
    (h) => h.domain === scope.domain && h.path === scope.sectionKey,
  ).length;
}

function highlightsForScope(
  highlights: WebHighlight[],
  scope: ChatScope,
): WebHighlight[] {
  if (scope.kind === 'library') return highlights;
  if (scope.kind === 'domain') {
    return highlights.filter((h) => h.domain === scope.domain);
  }
  return highlights.filter(
    (h) => h.domain === scope.domain && h.path === scope.sectionKey,
  );
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
  initialScope,
  isAuthenticated,
  userId,
}: {
  highlights: WebHighlight[];
  domains: WebDomainNode[];
  initialScope: ChatScope;
  isAuthenticated: boolean;
  userId?: string | null;
}): React.ReactElement {
  const [composerScope, setComposerScope] = useState<ChatScope>(initialScope);
  const [draft, setDraft] = useState('');
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const modelSelection = useWebAskModelSelection({ isAuthenticated, userId });

  const chat = useWebChat({
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

  const activeThread = useMemo(
    () => chat.threads.find((t) => t.id === chat.activeThreadId) ?? null,
    [chat.activeThreadId, chat.threads],
  );

  useEffect(() => {
    if (activeThread) {
      setComposerScope(activeThread.scope);
      return;
    }
    setComposerScope(initialScope);
  }, [activeThread, initialScope]);

  const effectiveScope = activeThread?.scope ?? composerScope;
  const groundCount = countForScope(highlights, domains, effectiveScope);
  const needsKey = modelSelection.activeProvider === null;
  const busy = turn.busy;
  const error = prepareError || turn.error || chat.error;

  const beginNewWithScope = useCallback(
    (scope: ChatScope) => {
      if (busy) return;
      turn.abort();
      chat.newThread();
      setComposerScope(scope);
      setPrepareError(null);
      turn.clearError();
    },
    [busy, chat, turn],
  );

  const handleNewThread = useCallback(() => {
    beginNewWithScope(composerScope);
  }, [beginNewWithScope, composerScope]);

  const handleSelectThread = useCallback(
    (id: string) => {
      if (busy) return;
      turn.abort();
      void chat.selectThread(id);
      setPrepareError(null);
      turn.clearError();
    },
    [busy, chat, turn],
  );

  const handleSubmit = useCallback(() => {
    const q = draft.trim();
    if (!q || busy) return;
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

    const scoped = highlightsForScope(highlights, effectiveScope);
    const promptHighlights = toPromptHighlights(scoped);
    if (promptHighlights.length === 0) {
      setPrepareError('No highlights in this scope to ground the answer.');
      return;
    }

    setPrepareError(null);
    turn.clearError();
    const { excerpts } = buildFallbackExcerpts(promptHighlights);
    setDraft('');
    void turn.send({
      question: q,
      scope: effectiveScope,
      excerpts,
      provider: modelSelection.activeProvider,
    });
  }, [
    busy,
    draft,
    effectiveScope,
    highlights,
    modelSelection.activeProvider,
    needsKey,
    turn,
    userId,
  ]);

  return (
    <div className="ask-shell" data-od-id="ask">
      <div className="ask-projects" data-od-id="ask-projects">
        <AskThreadSidebar
          threads={chat.threads}
          activeThreadId={chat.activeThreadId}
          busy={busy}
          onNewThread={handleNewThread}
          onSelectThread={handleSelectThread}
          onDeleteThread={(id) => {
            void chat.deleteThread(id);
          }}
        />
        <div className="ask-projects-body">
          <AskGroundingTree
            domains={domains}
            scope={effectiveScope}
            locked={Boolean(activeThread)}
            busy={busy}
            onSelectScope={beginNewWithScope}
          />
        </div>
      </div>

      <div className="ask-chat" data-od-id="ask-chat">
        <AskTranscript
          messages={chat.messages}
          streamText={turn.streamText}
          inflightAssistantId={turn.inflightAssistantId}
          busy={busy}
          streamError={turn.error}
          onAbort={turn.abort}
        />
        <AskComposer
          scope={effectiveScope}
          groundCount={groundCount}
          draft={draft}
          onDraftChange={(v) => {
            setDraft(v);
            if (prepareError) setPrepareError(null);
          }}
          busy={busy}
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
      initialScope={initialScope}
      isAuthenticated={isAuthenticated}
      userId={user?.id ?? null}
    />
  );
}
