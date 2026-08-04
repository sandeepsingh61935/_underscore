import React, { useEffect, useState } from 'react';

import { useApp } from '@/core/context/AppProvider';
import { ExportActions } from '@/features/collections/components/ExportActions';
import { DeleteConfirmDialog } from '@/features/collections/components/DeleteConfirmDialog';
import { useHighlightDelete } from '@/features/collections/hooks/use-highlight-delete';
import { formatSyncSubtitle, useSyncLibrary } from '@/features/collections/hooks/use-sync-library';
import { useBillingContextOptional } from '@/features/billing/BillingProvider';
import { ConnectToAiFlow } from '@/features/settings/components/ConnectToAiFlow';
import { SettingsStatusGlyph } from '@/features/settings/components/SettingsStatusGlyph';
import { TypographySettings } from '@/features/settings/components/TypographySettings';
import { getModeBranding } from '@/shared/constants/mode-branding';
import { freeEntitlement } from '@/shared/billing';
import { resolveAccountPillLabel } from '@/shared/utils/account-pill';
import { featureGateSubtitle } from '@/shared/utils/feature-gate-copy';
import { resolveSettingsBillingCta } from '@/shared/utils/settings-billing-cta';
import {
  useConfigureAiProvidersGate,
  useMcpGate,
  useModeFeature,
} from '@/ui-system/hooks/useModeFeature';
import { Row } from '@/ui-system/components/primitives/Row';
import { Spinner } from '@/ui-system/components/primitives/Spinner';

export interface SettingsPageProps {
  onBack?: () => void;
  onChangeMode?: () => void;
  onConfigureAIProviders?: () => void;
  onSignIn?: () => void;
  onLogout?: () => Promise<void>;
}

/**
 * Settings Page — v3 product section order (PRD):
 * head → Guest card or Account → Billing CTAs/Sync → banners →
 * Typography → Theme → Library tools → AI (gated) → Sign out
 */
export function SettingsPage({
  onBack: _onBack,
  onChangeMode,
  onConfigureAIProviders,
  onSignIn,
  onLogout,
}: SettingsPageProps): React.ReactElement {
  const {
    theme,
    setTheme,
    currentMode,
    user,
    logout: appLogout,
  } = useApp();
  const billing = useBillingContextOptional();
  const billingEntitlement = billing?.snapshot.entitlement ?? freeEntitlement();
  // While billing loads, prefer stored mode so paid users do not flash Free.
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
  /** Post-checkout confidence banner: payment succeeded; paid may lag webhook. */
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
    // After URL stripped, keep success_active briefly if we just became paid
    if (isPaidActive && billingReturn?.kind === 'success_pending') {
      setBillingReturn({ kind: 'success_active' });
    }
  }, [isPaidActive, billingReturn?.kind]);
  const logout = onLogout ?? appLogout;
  const { sync, isSyncing, lastResult, error: syncError, status: syncStatus } = useSyncLibrary();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [billingActionError, setBillingActionError] = useState<string | null>(null);
  const [typographyExpanded, setTypographyExpanded] = useState(false);
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
    setIsSigningOut(true);
    try {
      await logout();
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleToggleTheme = (): void => {
    const themes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme as 'light' | 'dark' | 'system');
    const nextTheme = themes[(currentIndex + 1) % themes.length] || 'system';
    setTheme(nextTheme);
  };

  const syncSubtitle = (() => {
    if (!syncGate.allowed) return featureGateSubtitle(syncGate.reason);
    if (!user) return featureGateSubtitle('AUTH_REQUIRED');
    if (isSyncing) return 'Pulling highlights from database…';
    if (syncError) return syncError;
    if (syncStatus === 'success' && lastResult) return formatSyncSubtitle(lastResult);
    return 'Pull latest highlights from cloud';
  })();

  const handleSyncLibrary = async (): Promise<void> => {
    if (!syncGate.allowed || !user || isSyncing) return;
    await sync();
  };

  const handleDeleteLibrary = async (): Promise<void> => {
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

  const modeBranding = getModeBranding(currentMode);
  const monoTrailing = (label: string): React.ReactElement => (
    <span className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)' }}>
      {label}
    </span>
  );

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
      {/* 1. Head */}
      <div style={{ padding: '12px 16px 6px' }}>
        <div className="u-serif" style={{ fontSize: 'var(--step-3)', letterSpacing: '-0.02em' }}>Settings</div>
      </div>

      <div className="list-scroll" style={{ flex: 1, minHeight: 0 }} data-testid="settings-scroll">
        {/* 2. Guest card or Account */}
        <div
          className="u-caps"
          data-testid="settings-section-account"
          style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}
        >
          Account
        </div>
        {!user ? (
          <div
            data-testid="settings-guest-card"
            style={{
              margin: '0 16px 10px',
              padding: '14px 16px',
              border: '1px solid var(--rule)',
              background: 'var(--paper-2)',
            }}
          >
            <div className="u-serif" style={{ fontSize: 'var(--step-1)', marginBottom: 4 }}>
              Guest
            </div>
            <div
              className="u-sans"
              style={{
                fontSize: 'var(--step--1)',
                color: 'var(--ink-3)',
                lineHeight: 1.5,
                marginBottom: 12,
              }}
            >
              Local only on this device. Sign in to sync library across devices, export, and use AI.
            </div>
            <button
              type="button"
              className="u-mono"
              aria-label="Sign in"
              onClick={() => onSignIn?.()}
              style={{
                all: 'unset',
                cursor: 'pointer',
                fontSize: 'var(--step--2)',
                color: 'var(--accent)',
                minHeight: 44,
                display: 'inline-flex',
                alignItems: 'center',
                textDecoration: 'underline',
                textUnderlineOffset: 2,
              }}
            >
              Sign in
            </button>
          </div>
        ) : (
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
                      planPill === 'Paid'
                        ? 'var(--accent)'
                        : planPill === 'Past due'
                          ? 'var(--accent)'
                          : 'var(--ink-3)',
                  }}
                >
                  {planPill}
                </span>
              )
            }
          />
        )}

        {/* 3. Billing CTAs / Sync */}
        {user && billing && billingCta ? (
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
                  <span
                    className="u-mono"
                    data-testid="billing-cta"
                    data-billing-kind={billingCta.kind}
                    style={{ fontSize: 'var(--step--2)', color: 'var(--accent)' }}
                  >
                    {billingCta.ctaLabel}
                  </span>
                )
              }
              onClick={handleBillingCta}
            />
            {billingCta.showSync ? (
              <Row
                title="Refresh subscription status"
                sub="Already paid? Pull status from Polar and update this account."
                right={
                  billingBusy ? (
                    <Spinner size="sm" />
                  ) : (
                    <span
                      className="u-mono"
                      data-testid="billing-sync-cta"
                      style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)' }}
                    >
                      Sync
                    </span>
                  )
                }
                onClick={() => {
                  setBillingActionError(null);
                  void billing.syncFromPolar().catch((e: unknown) => {
                    setBillingActionError(
                      e instanceof Error ? e.message : 'Sync failed'
                    );
                  });
                }}
              />
            ) : null}
          </>
        ) : null}

        {/* 4. Banners (post-checkout / cancel) */}
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

        {/* 5. Typography */}
        <div data-testid="settings-section-typography">
          <TypographySettings
            expanded={typographyExpanded}
            onToggle={() => setTypographyExpanded((v) => !v)}
          />
        </div>

        {/* 6. Theme (+ Mode) */}
        <div
          className="u-caps"
          data-testid="settings-section-general"
          style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}
        >
          General
        </div>
        <Row
          title="Theme"
          sub="Match system"
          right={
            <span
              className="u-mono"
              style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)', textTransform: 'capitalize' }}
            >
              {theme}
            </span>
          }
          onClick={handleToggleTheme}
        />
        <Row
          title="Mode"
          sub={isAuthenticated ? `${modeBranding.displayName} · ${modeBranding.tagline.toLowerCase()}` : 'Guest'}
          right={monoTrailing(isAuthenticated ? 'Change' : 'Local')}
          onClick={isAuthenticated ? onChangeMode : undefined}
        />

        {/* 7. Library tools */}
        {isAuthenticated ? (
          <>
            <div
              className="u-caps"
              data-testid="settings-section-library"
              style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}
            >
              Library
            </div>
            <Row
              title="Sync library"
              sub={syncSubtitle}
              right={
                isSyncing ? (
                  <Spinner size="sm" />
                ) : (
                  <span
                    className="u-mono"
                    style={{
                      fontSize: 'var(--step--2)',
                      color: syncGate.allowed && user ? 'var(--accent)' : 'var(--ink-3)',
                    }}
                  >
                    {syncGate.allowed && user ? 'Sync' : '—'}
                  </span>
                )
              }
              onClick={syncGate.allowed && !isSyncing ? handleSyncLibrary : undefined}
            />
            <Row
              title="Export library"
              sub={
                exportGate.allowed && user
                  ? 'Download all highlights as markdown or spreadsheet'
                  : featureGateSubtitle(exportGate.reason)
              }
              right={<ExportActions scope={{ kind: 'library' }} disabled={!exportGate.allowed} />}
            />
            <Row
              title="Delete library"
              sub="Permanently remove all highlights on this device"
              right={
                <span
                  className="u-mono"
                  style={{
                    fontSize: 'var(--step--2)',
                    color: 'var(--accent)',
                  }}
                >
                  Delete
                </span>
              }
              onClick={() => setDeleteLibraryOpen(true)}
            />
          </>
        ) : null}

        {/* 8. AI (gated) */}
        <div
          className="u-caps"
          data-testid="settings-section-ai"
          style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}
        >
          AI
        </div>
        <Row
          title="Connect to AI"
          sub="External agents"
          right={
            <SettingsStatusGlyph
              kind={mcpGate.allowed ? 'chevron' : 'lock'}
              label={mcpGate.allowed ? 'Open' : 'Locked'}
            />
          }
          onClick={() => setConnectOpen(true)}
        />
        <Row
          title="Configure AI providers"
          sub="In-app models"
          right={
            <SettingsStatusGlyph
              kind={aiSetupGate.allowed ? 'chevron' : 'lock'}
              label={aiSetupGate.allowed ? 'Open' : 'Locked'}
            />
          }
          onClick={aiSetupGate.allowed ? onConfigureAIProviders : undefined}
        />

        {/* 9. Sign out */}
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
              sub="End this session on this device"
              aria-label="Sign out"
              right={
                isSigningOut ? (
                  <Spinner size="sm" />
                ) : (
                  <span
                    className="u-mono"
                    style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)' }}
                  >
                    Sign out
                  </span>
                )
              }
              onClick={() => {
                if (!isSigningOut) void handleSignOut();
              }}
            />
          </>
        ) : null}
      </div>

      <DeleteConfirmDialog
        open={deleteLibraryOpen}
        onClose={() => setDeleteLibraryOpen(false)}
        title="Delete entire library?"
        message={
          user
            ? 'This permanently removes all highlights from this device and marks them deleted in the cloud. This cannot be undone.'
            : 'This permanently removes all highlights stored on this device as a guest. This cannot be undone.'
        }
        onConfirm={() => { void handleDeleteLibrary(); }}
        isConfirming={isDeletingLibrary}
        exportFooter={<ExportActions scope={{ kind: 'library' }} disabled={!exportGate.allowed} />}
      />
    </div>
  );
}
