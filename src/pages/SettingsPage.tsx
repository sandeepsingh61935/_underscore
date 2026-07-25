import React, { useState } from 'react';

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
import { featureGateSubtitle } from '@/shared/utils/feature-gate-copy';
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
 * Settings Page
 * Implements exactly what the Settings component in ui_kits/extension/v2/screens-nav.jsx specifies.
 * AI section: Connect to AI (hub drill-in) then Configure AI providers (sibling).
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
  const isPaidActive =
    billing?.snapshot.isPaidActive ?? currentMode === 'pro_xai';
  const billingBusy = billing?.busy ?? false;
  const billingError = billing?.snapshot.error ?? null;
  const startCheckout = billing?.startCheckout;
  const openBillingPortal = billing?.openPortal;
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

  // onBack is still required on the interface for callers passing it to the shell's ModeHeader
  // _onBack is intentionally unused in the body-only version

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
      <div style={{ padding: '12px 16px 6px' }}>
        <div className="u-serif" style={{ fontSize: 'var(--step-3)', letterSpacing: '-0.02em' }}>Settings</div>
      </div>

      <div className="list-scroll" style={{ flex: 1, minHeight: 0 }}>
        <TypographySettings
          expanded={typographyExpanded}
          onToggle={() => setTypographyExpanded((v) => !v)}
        />

        <div className="u-caps" style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}>General</div>
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
        <Row title="Density" sub="Comfortable" right={monoTrailing('Edit')} />

        {isAuthenticated ? (
          <>
            <div className="u-caps" style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}>Library</div>
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

        <div className="u-caps" style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}>AI</div>
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

        <div className="u-caps" style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}>Account</div>
        <Row
          title={user?.email || 'Not signed in'}
          sub={
            user
              ? `${modeBranding.displayName} · ${modeBranding.tagline.toLowerCase()}`
              : 'Sync library across devices, export, AI'
          }
          right={
            isSigningOut ? (
              <Spinner size="sm" />
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                {user && (currentMode === 'pro' || currentMode === 'pro_xai') ? (
                  <span
                    className="u-mono"
                    data-testid="account-plan-pill"
                    style={{
                      fontSize: 'var(--step--2)',
                      padding: '2px 8px',
                      border: '1px solid var(--rule-soft)',
                      color: isPaidActive ? 'var(--accent)' : 'var(--ink-3)',
                    }}
                  >
                    {isPaidActive ? 'Paid' : 'Free'}
                  </span>
                ) : null}
                <button
                  type="button"
                  className="u-mono"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (user) {
                      void handleSignOut();
                    } else {
                      onSignIn?.();
                    }
                  }}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    fontSize: 'var(--step--2)',
                    color: user ? 'var(--ink-3)' : 'var(--accent)',
                    minHeight: 44,
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '0 4px',
                    textDecoration: user ? 'none' : 'underline',
                    textUnderlineOffset: 2,
                  }}
                >
                  {user ? 'Sign out' : 'Sign in'}
                </button>
              </span>
            )
          }
        />
        {user && billing ? (
          <Row
            title={isPaidActive ? 'Manage billing' : 'Upgrade to Account (Paid)'}
            sub={
              billingActionError || billingError
                ? billingActionError || billingError || undefined
                : isPaidActive
                  ? billingEntitlement.cancelAtPeriodEnd
                    ? 'Cancels at period end · invoices & payment method'
                    : 'Invoices, payment method, cancel'
                  : 'AI + agent connections · billed via Polar'
            }
            right={
              billingBusy ? (
                <Spinner size="sm" />
              ) : (
                <span
                  className="u-mono"
                  data-testid="billing-cta"
                  style={{ fontSize: 'var(--step--2)', color: 'var(--accent)' }}
                >
                  {isPaidActive ? 'Portal' : 'Upgrade'}
                </span>
              )
            }
            onClick={() => {
              setBillingActionError(null);
              const action = isPaidActive ? openBillingPortal : startCheckout;
              if (!action) return;
              void action().catch((e: unknown) => {
                setBillingActionError(
                  e instanceof Error ? e.message : 'Billing action failed'
                );
              });
            }}
          />
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
