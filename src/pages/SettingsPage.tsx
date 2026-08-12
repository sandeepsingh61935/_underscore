import React, { useEffect, useState } from 'react';

import { useApp } from '@/core/context/AppProvider';
import { ExportActions } from '@/features/collections/components/ExportActions';
import { DeleteConfirmDialog } from '@/features/collections/components/DeleteConfirmDialog';
import { useDashboardData } from '@/features/collections/hooks/useDashboardData';
import { useHighlightDelete } from '@/features/collections/hooks/use-highlight-delete';
import {
  formatLastSyncedAt,
  formatSyncSubtitle,
  useSyncLibrary,
} from '@/features/collections/hooks/use-sync-library';
import { useBillingContextOptional } from '@/features/billing/BillingProvider';
import { ConnectToAiFlow } from '@/features/settings/components/ConnectToAiFlow';
import { LibraryPulse } from '@/features/settings/components/LibraryPulse';
import { SettingsLocalCard } from '@/features/settings/components/SettingsLocalCard';
import { SettingsModeSeg } from '@/features/settings/components/SettingsModeSeg';
import { SettingsStatusGlyph } from '@/features/settings/components/SettingsStatusGlyph';
import { SettingsThemeSeg } from '@/features/settings/components/SettingsThemeSeg';
import { TypographySettings } from '@/features/settings/components/TypographySettings';
import { getModeBranding } from '@/shared/constants/mode-branding';
import { freeEntitlement } from '@/shared/billing';
import { DEFAULT_MODE } from '@/shared/constants/mode-storage';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { resolveAccountPillLabel } from '@/shared/utils/account-pill';
import {
  deleteLibraryCopy,
  signOutCopy,
} from '@/shared/utils/confirm-dialog-copy';
import { featureGateSubtitle } from '@/shared/utils/feature-gate-copy';
import { resolveSettingsBillingCta } from '@/shared/utils/settings-billing-cta';
import {
  useConfigureAiProvidersGate,
  useMcpGate,
  useModeFeature,
} from '@/ui-system/hooks/useModeFeature';
import { BtnText } from '@/ui-system/components/primitives/BtnText';
import { Row } from '@/ui-system/components/primitives/Row';
import { Spinner } from '@/ui-system/components/primitives/Spinner';

export interface SettingsPageProps {
  onBack?: () => void;
  /** @deprecated Mode is inline on Settings; kept for callers. */
  onChangeMode?: () => void;
  onConfigureAIProviders?: () => void;
  onSignIn?: () => void;
  onLogout?: () => Promise<void>;
}

/**
 * Settings — Open Design extension mockup order:
 * head → local card (guest) → Mode segments → Typography → Appearance/Theme →
 * Account/billing (signed-in) → Library (pulse + tools) → AI → Sign out
 */
export function SettingsPage({
  onBack: _onBack,
  onChangeMode: _onChangeMode,
  onConfigureAIProviders,
  onSignIn,
  onLogout,
}: SettingsPageProps): React.ReactElement {
  const {
    theme,
    setTheme,
    currentMode,
    setMode,
    user,
    logout: appLogout,
    isAuthenticated: appAuthenticated,
  } = useApp();
  const modeForDashboard = (currentMode ?? DEFAULT_MODE) as ModeType;
  const { data: dashboardData, isLoading: dashboardLoading } = useDashboardData(
    modeForDashboard,
    appAuthenticated,
  );
  const billing = useBillingContextOptional();
  const billingEntitlement = billing?.snapshot.entitlement ?? freeEntitlement();
  const billingReady = billing?.snapshot.loadState === 'ready';
  const isPaidActive = billing
    ? billingReady
      ? billing.snapshot.isPaidActive
      : currentMode === 'pro_xai' || billing.snapshot.isPaidActive
    : currentMode === 'pro_xai';
  const billingBusy = billing?.busy ?? false;
  const billingError = billing?.snapshot.error ?? null;
  const startCheckout = billing?.startCheckout;
  const openBillingPortal = billing?.openPortal;
  type BillingReturnBanner =
    | { kind: 'success_pending' }
    | { kind: 'success_active' }
    | { kind: 'cancel' }
    | null;
  const [billingReturn, setBillingReturn] = useState<BillingReturnBanner>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const flag = new URLSearchParams(window.location.search).get('billing');
    if (flag === 'success') {
      setBillingReturn(
        isPaidActive ? { kind: 'success_active' } : { kind: 'success_pending' }
      );
      return;
    }
    if (flag === 'cancel') {
      setBillingReturn({ kind: 'cancel' });
      return;
    }
    if (isPaidActive && billingReturn?.kind === 'success_pending') {
      setBillingReturn({ kind: 'success_active' });
    }
  }, [isPaidActive, billingReturn?.kind]);
  const logout = onLogout ?? appLogout;
  const {
    sync,
    isSyncing,
    lastResult,
    error: syncError,
    status: syncStatus,
    progressPercent,
    lastSyncedAt,
  } = useSyncLibrary();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [billingActionError, setBillingActionError] = useState<string | null>(null);
  const [typographyExpanded, setTypographyExpanded] = useState(false);
  const [libraryStatsOpen, setLibraryStatsOpen] = useState(false);
  const { deleteScope } = useHighlightDelete();
  const [deleteLibraryOpen, setDeleteLibraryOpen] = useState(false);
  const [isDeletingLibrary, setIsDeletingLibrary] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const isAuthenticated = Boolean(user);
  const exportGate = useModeFeature('export', isAuthenticated);
  const syncGate = useModeFeature('sync', isAuthenticated);
  const aiSetupGate = useConfigureAiProvidersGate(isAuthenticated);
  const mcpGate = useMcpGate(isAuthenticated);

  const planPill = resolveAccountPillLabel({
    modeId: currentMode,
    isAuthenticated,
    isPaidActive,
    billingStatus: billingEntitlement.status,
  });

  const billingCta = billing
    ? resolveSettingsBillingCta({
        isPaidActive,
        status: billingEntitlement.status,
        cancelAtPeriodEnd: billingEntitlement.cancelAtPeriodEnd,
      })
    : null;

  const handleSignOut = async (): Promise<void> => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await logout();
      setSignOutOpen(false);
    } finally {
      setIsSigningOut(false);
    }
  };

  const syncSubtitle = ((): string => {
    if (!syncGate.allowed) return featureGateSubtitle(syncGate.reason);
    if (!user) return featureGateSubtitle('AUTH_REQUIRED');
    if (isSyncing) {
      const pct =
        progressPercent !== null && progressPercent !== undefined
          ? ` · ${progressPercent}%`
          : '';
      return `Syncing${pct}`;
    }
    if (syncError) return syncError;
    if (syncStatus === 'success' && lastResult) {
      const detail = formatSyncSubtitle(lastResult);
      const when = formatLastSyncedAt(lastSyncedAt);
      return detail === 'Library matches cloud' ? when : `${detail} · ${when}`;
    }
    return formatLastSyncedAt(lastSyncedAt);
  })();

  const handleSyncLibrary = async (): Promise<void> => {
    if (!syncGate.allowed || !user || isSyncing) return;
    await sync();
  };

  const handleDeleteLibrary = async (): Promise<void> => {
    if (isDeletingLibrary) return;
    setIsDeletingLibrary(true);
    try {
      await deleteScope({ scope: 'library' });
      setDeleteLibraryOpen(false);
    } finally {
      setIsDeletingLibrary(false);
    }
  };

  const handleBillingCta = (): void => {
    if (!billingCta) return;
    setBillingActionError(null);
    const action =
      billingCta.action === 'portal' ? openBillingPortal : startCheckout;
    if (!action) return;
    void action().catch((e: unknown) => {
      setBillingActionError(
        e instanceof Error ? e.message : 'Billing action failed'
      );
    });
  };

  const handleSelectGuest = (): void => {
    if (!isAuthenticated) return;
    // Guest while signed-in → sign-out confirm (transition kind: sign_out)
    setSignOutOpen(true);
  };

  const handleSelectFree = (): void => {
    if (!isAuthenticated) {
      onSignIn?.();
      return;
    }
    // Paid → Free allowed; Free stays Free
    setMode('pro' as ModeType);
  };

  const handleSelectPaid = (): void => {
    if (!isAuthenticated) {
      onSignIn?.();
      return;
    }
    // Entitled paid: Free → Paid is a mode write (not checkout)
    if (isPaidActive) {
      setMode('pro_xai' as ModeType);
      return;
    }
    // Free user: Free → Paid requires billing upgrade
    setBillingActionError(null);
    if (startCheckout) {
      void startCheckout().catch((e: unknown) => {
        setBillingActionError(
          e instanceof Error ? e.message : 'Billing action failed'
        );
      });
      return;
    }
    handleBillingCta();
  };

  const modeBranding = getModeBranding(currentMode);

  if (connectOpen) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
        <ConnectToAiFlow
          isAuthenticated={isAuthenticated}
          currentMode={currentMode}
          onSignIn={onSignIn}
          onExit={() => setConnectOpen(false)}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <div style={{ padding: '12px 16px 6px' }}>
        <div className="u-serif" style={{ fontSize: 'var(--step-3)', letterSpacing: '-0.02em' }}>
          Settings
        </div>
      </div>

      <div className="list-scroll" style={{ flex: 1, minHeight: 0 }} data-testid="settings-scroll">
        {/* 1. Local card (guest) — Open Design mockup */}
        {!user ? (
          <div data-testid="settings-guest-card">
            <SettingsLocalCard
              onSignIn={onSignIn}
              onChooseFree={onSignIn}
            />
          </div>
        ) : null}

        {/* 2. Mode / Plan segments — always */}
        <SettingsModeSeg
          currentMode={currentMode}
          isAuthenticated={isAuthenticated}
          isPaidActive={isPaidActive}
          onSelectGuest={handleSelectGuest}
          onSelectFree={handleSelectFree}
          onSelectPaid={handleSelectPaid}
        />

        {/* 3. Typography */}
        <div data-testid="settings-section-typography">
          <TypographySettings
            expanded={typographyExpanded}
            onToggle={() => setTypographyExpanded((v) => !v)}
          />
        </div>

        {/* 4. Appearance / Theme segments */}
        <SettingsThemeSeg
          theme={theme}
          onChange={(t) => setTheme(t)}
        />

        {/* 5. Account + billing (signed-in) */}
        {user ? (
          <>
            <div
              className="u-caps"
              data-testid="settings-section-account"
              style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}
            >
              Account
            </div>
            <Row
              title={user.email || 'Signed in'}
              sub={`${modeBranding.displayName} · ${modeBranding.tagline.toLowerCase()}`}
              right={
                planPill === 'Guest' ? null : (
                  <span
                    className="u-mono"
                    data-testid="account-plan-pill"
                    style={{
                      fontSize: 'var(--step--2)',
                      padding: '2px 8px',
                      border: '1px solid var(--rule-soft)',
                      color:
                        planPill === 'Paid' || planPill === 'Past due'
                          ? 'var(--accent)'
                          : 'var(--ink-3)',
                    }}
                  >
                    {planPill}
                  </span>
                )
              }
            />
            {billing && billingCta ? (
              <>
                <Row
                  title={billingCta.title}
                  sub={
                    billingActionError || billingError
                      ? billingActionError || billingError || undefined
                      : billingCta.sub
                  }
                  right={
                    billingBusy ? (
                      <Spinner size="sm" />
                    ) : (
                      <button
                        type="button"
                        className={
                          billingCta.kind === 'upgrade'
                            ? 'btn accent sm'
                            : 'btn ghost sm'
                        }
                        data-testid="billing-cta"
                        data-billing-kind={billingCta.kind}
                        onClick={handleBillingCta}
                      >
                        {billingCta.ctaLabel}
                      </button>
                    )
                  }
                />
                {billingCta.showSync ? (
                  <Row
                    title="Refresh status"
                    sub={undefined}
                    right={
                      billingBusy ? (
                        <Spinner size="sm" />
                      ) : (
                        <button
                          type="button"
                          className="btn ghost sm"
                          data-testid="billing-sync-cta"
                          onClick={() => {
                            setBillingActionError(null);
                            void billing.syncFromPolar().catch((e: unknown) => {
                              setBillingActionError(
                                e instanceof Error ? e.message : 'Refresh failed'
                              );
                            });
                          }}
                        >
                          Refresh
                        </button>
                      )
                    }
                  />
                ) : null}
              </>
            ) : null}
          </>
        ) : (
          /* Anchor for section-order tests when guest: account region is local card */
          <div data-testid="settings-section-account" hidden aria-hidden="true" />
        )}

        {user && billingReturn ? (
          <div
            data-testid="billing-return-banner"
            role="status"
            style={{
              margin: '0 16px 10px',
              padding: '14px 16px',
              border: '1px solid var(--rule)',
              background: 'var(--paper-2)',
            }}
          >
            <div
              className="u-serif"
              style={{
                fontSize: 'var(--step-1)',
                color:
                  billingReturn.kind === 'cancel' ? 'var(--ink)' : 'var(--accent)',
                marginBottom: 6,
              }}
            >
              {billingReturn.kind === 'cancel'
                ? 'Checkout canceled'
                : 'Payment successful'}
            </div>
            <div
              className="u-sans"
              style={{
                fontSize: 'var(--step--1)',
                color: 'var(--ink-3)',
                lineHeight: 1.5,
              }}
            >
              {billingReturn.kind === 'cancel'
                ? 'No charge was made. You can upgrade anytime from above.'
                : billingReturn.kind === 'success_active'
                  ? 'Your account is upgraded to Account (Paid). AI and agent connections are unlocked. You can close this tab and reopen the extension — it will show Paid for the same login.'
                  : 'Your payment went through. We are activating Account (Paid) now — this usually takes a few seconds. Use Sync above if status stays Free, then reopen the extension with the same account.'}
            </div>
            {billingReturn.kind === 'success_pending' ? (
              <div
                className="u-mono"
                style={{
                  marginTop: 10,
                  fontSize: 'var(--step--2)',
                  color: 'var(--ink-3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Spinner size="sm" />
                Confirming subscription…
              </div>
            ) : null}
            {billingReturn.kind === 'success_active' ? (
              <div
                className="u-mono"
                data-testid="account-plan-pill-banner"
                style={{
                  marginTop: 10,
                  display: 'inline-block',
                  fontSize: 'var(--step--2)',
                  padding: '2px 8px',
                  border: '1px solid var(--rule-soft)',
                  color: 'var(--accent)',
                }}
              >
                Account (Paid)
              </div>
            ) : null}
          </div>
        ) : null}

        {/* 6. Library pulse + tools */}
        {isAuthenticated ? (
          <>
            <div
              className="u-caps"
              data-testid="settings-section-library"
              style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}
            >
              Library
            </div>
            <LibraryPulse
              totalHighlights={dashboardData?.totalHighlights ?? 0}
              thisWeekCount={dashboardData?.thisWeekCount ?? 0}
              todayCount={dashboardData?.todayCount ?? 0}
              totalDomains={dashboardData?.totalDomains ?? 0}
              withNotesCount={dashboardData?.withNotesCount ?? 0}
              withTagsCount={dashboardData?.withTagsCount ?? 0}
              loading={dashboardLoading && !dashboardData}
              expanded={libraryStatsOpen}
              onToggle={() => setLibraryStatsOpen((o) => !o)}
            />
            <Row
              title="Library sync"
              sub={syncSubtitle}
              right={
                <button
                  type="button"
                  className="btn ghost sm"
                  data-testid="settings-sync-btn"
                  disabled={!syncGate.allowed || !user || isSyncing}
                  aria-label="Sync library"
                  aria-busy={isSyncing}
                  onClick={() => {
                    void handleSyncLibrary();
                  }}
                >
                  {isSyncing ? (
                    <span
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      data-testid="sync-progress"
                    >
                      <Spinner size="sm" />
                      <span className="u-mono" style={{ fontSize: 'var(--step--2)' }}>
                        {progressPercent !== null ? `${progressPercent}%` : '…'}
                      </span>
                    </span>
                  ) : (
                    'Sync'
                  )}
                </button>
              }
            />
            {isSyncing ? (
              <div
                data-testid="sync-progress-bar"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressPercent ?? 0}
                style={{
                  margin: '0 16px 8px',
                  height: 3,
                  background: 'var(--rule-soft)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${progressPercent ?? 8}%`,
                    background: 'var(--accent)',
                    transition: 'width 120ms linear',
                  }}
                />
              </div>
            ) : null}
            <Row
              title="Export"
              sub={
                exportGate.allowed && user
                  ? undefined
                  : featureGateSubtitle(exportGate.reason)
              }
              right={
                <ExportActions scope={{ kind: 'library' }} disabled={!exportGate.allowed} />
              }
            />
            <Row
              title="Delete library"
              sub={undefined}
              right={
                <button
                  type="button"
                  className="btn ghost sm danger"
                  aria-label="Delete library"
                  onClick={() => setDeleteLibraryOpen(true)}
                >
                  Delete
                </button>
              }
            />
          </>
        ) : null}

        {/* 7. AI — Models & providers | Integrations (IA standard 2026-08-12) */}
        <div
          className="u-caps"
          data-testid="settings-section-ai"
          style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}
        >
          AI
        </div>
        <Row
          title="Models & providers"
          sub="Keys for Ask"
          right={
            <BtnText
              aria-label={
                aiSetupGate.allowed
                  ? 'Open Models & providers'
                  : 'Models & providers locked'
              }
              disabled={!aiSetupGate.allowed}
              muted={!aiSetupGate.allowed}
              onClick={() => {
                if (aiSetupGate.allowed) onConfigureAIProviders?.();
              }}
            >
              <SettingsStatusGlyph
                kind={aiSetupGate.allowed ? 'chevron' : 'lock'}
                label={aiSetupGate.allowed ? 'Open' : 'Locked'}
              />
            </BtnText>
          }
        />
        <Row
          title="Integrations"
          sub="Let agents use your library"
          right={
            <BtnText
              aria-label={mcpGate.allowed ? 'Open Integrations' : 'Integrations locked'}
              onClick={() => setConnectOpen(true)}
            >
              <SettingsStatusGlyph
                kind={mcpGate.allowed ? 'chevron' : 'lock'}
                label={mcpGate.allowed ? 'Open' : 'Locked'}
              />
            </BtnText>
          }
        />

        {/* 8. Session */}
        {user ? (
          <>
            <div
              className="u-caps"
              data-testid="settings-section-session"
              style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}
            >
              Session
            </div>
            <Row
              title="Sign out"
              sub={undefined}
              right={
                <button
                  type="button"
                  className="btn ghost sm"
                  aria-label="Sign out"
                  disabled={isSigningOut}
                  onClick={() => {
                    if (!isSigningOut) setSignOutOpen(true);
                  }}
                >
                  {isSigningOut ? <Spinner size="sm" /> : 'Sign out'}
                </button>
              }
            />
          </>
        ) : null}
      </div>

      {(() => {
        const copy = deleteLibraryCopy(Boolean(user));
        return (
          <DeleteConfirmDialog
            open={deleteLibraryOpen}
            onClose={() => setDeleteLibraryOpen(false)}
            severity={copy.severity}
            title={copy.title}
            message={copy.message}
            note={copy.note}
            strongNames={copy.strongNames}
            confirmLabel={copy.confirmLabel}
            cancelLabel={copy.cancelLabel}
            onConfirm={() => { void handleDeleteLibrary(); }}
            isConfirming={isDeletingLibrary}
            exportFooter={
              <ExportActions scope={{ kind: 'library' }} disabled={!exportGate.allowed} />
            }
          />
        );
      })()}

      {(() => {
        const copy = signOutCopy();
        return (
          <DeleteConfirmDialog
            open={signOutOpen}
            onClose={() => setSignOutOpen(false)}
            severity={copy.severity}
            title={copy.title}
            message={copy.message}
            note={copy.note}
            strongNames={copy.strongNames}
            confirmLabel={copy.confirmLabel}
            cancelLabel={copy.cancelLabel}
            onConfirm={() => { void handleSignOut(); }}
            isConfirming={isSigningOut}
          />
        );
      })()}
    </div>
  );
}
