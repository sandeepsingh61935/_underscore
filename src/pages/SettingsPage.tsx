import React, { useState } from 'react';

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
import { SettingsKeyboardSection } from '@/features/settings/components/SettingsKeyboardSection';
import { SettingsLegalFooter } from '@/features/settings/components/SettingsLegalFooter';
import { SettingsLocalCard } from '@/features/settings/components/SettingsLocalCard';
import { SettingsModeSeg } from '@/features/settings/components/SettingsModeSeg';
import { SettingsStatusGlyph } from '@/features/settings/components/SettingsStatusGlyph';
import { SettingsThemeSeg } from '@/features/settings/components/SettingsThemeSeg';
import { TypographySettings } from '@/features/settings/components/TypographySettings';
import { freeEntitlement } from '@/shared/billing';
import { billingUpcomingCopy } from '@/shared/billing/billing-upcoming-copy';
import { DEFAULT_MODE } from '@/shared/constants/mode-storage';
import { resolveProductCaps } from '@/shared/entitlement/resolveProductCaps';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { resolveSettingsActionGates } from '@/shared/settings/settings-topic-ia';
import {
  deleteLibraryCopy,
  signOutCopy,
} from '@/shared/utils/confirm-dialog-copy';
import { featureGateSubtitle } from '@/shared/utils/feature-gate-copy';
import {
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
  onSignIn?: () => void;
  onLogout?: () => Promise<void>;
}

/**
 * Settings — stacked IA (no topic chips):
 * Account → Mode (Guest|Account) → Billing Upcoming → Appearance →
 * Data → Integrations → Session → Legal footer.
 * Billing code remains; Polar CTAs are not exposed.
 */
export function SettingsPage({
  onBack: _onBack,
  onChangeMode: _onChangeMode,
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
  const [typographyExpanded, setTypographyExpanded] = useState(false);
  const [libraryStatsOpen, setLibraryStatsOpen] = useState(false);
  const { deleteScope } = useHighlightDelete();
  const [deleteLibraryOpen, setDeleteLibraryOpen] = useState(false);
  const [isDeletingLibrary, setIsDeletingLibrary] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const isAuthenticated = Boolean(user);
  const exportGate = useModeFeature('export', isAuthenticated);
  const syncGate = useModeFeature('sync', isAuthenticated);
  const mcpGate = useMcpGate(
    isAuthenticated,
    isPaidActive,
    billing?.snapshot.entitlement.status === 'past_due',
  );
  const productCaps = resolveProductCaps({
    isAuthenticated,
    isPaidActive,
    billingStatus: billingEntitlement.status,
  });
  const settingsGates = resolveSettingsActionGates({
    surface: 'popup',
    isAuthenticated,
    caps: productCaps,
  });

  const upcoming = billingUpcomingCopy();

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

  const handleSelectGuest = (): void => {
    if (!isAuthenticated) {
      setMode('basic' as ModeType);
      return;
    }
    setSignOutOpen(true);
  };

  const handleSelectAccount = (): void => {
    if (!isAuthenticated) {
      onSignIn?.();
      return;
    }
    // Account mode: cloud pro (paid entitlement is separate / upcoming billing)
    if (currentMode === 'basic') {
      setMode('pro' as ModeType);
    }
  };

  if (connectOpen) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
        <ConnectToAiFlow
          isAuthenticated={isAuthenticated}
          currentMode={currentMode}
          isPaidActive={isPaidActive}
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
        {/* Account */}
        <div data-testid="settings-section-account-wrap">
          {!user ? (
            <div data-testid="settings-guest-card">
              <SettingsLocalCard
                onSignIn={onSignIn}
                onChooseFree={onSignIn}
              />
            </div>
          ) : null}

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
                sub="Synced"
              />
            </>
          ) : (
            <div data-testid="settings-section-account" hidden aria-hidden="true" />
          )}
        </div>

        {/* Mode — Guest | Account */}
        <SettingsModeSeg
          currentMode={currentMode}
          isAuthenticated={isAuthenticated}
          isPaidActive={isPaidActive}
          onSelectGuest={handleSelectGuest}
          onSelectAccount={handleSelectAccount}
        />

        {/* Billing — Upcoming stub (no Polar CTAs) */}
        <div data-testid="settings-section-billing">
          <div
            className="u-caps"
            style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}
          >
            {upcoming.title}
          </div>
          <Row title={upcoming.title} sub={upcoming.sub} />
        </div>

        {/* Appearance */}
        <div>
          <div
            className="u-caps"
            style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}
          >
            Appearance
          </div>
          <div data-testid="settings-section-typography">
            <TypographySettings
              expanded={typographyExpanded}
              onToggle={() => setTypographyExpanded((v) => !v)}
            />
          </div>
          <SettingsThemeSeg
            theme={theme}
            onChange={(t) => setTheme(t)}
          />
        </div>

        <SettingsKeyboardSection />

        {/* Data */}
        {isAuthenticated ? (
          <div data-testid="settings-section-data">
            <div
              className="u-caps"
              data-testid="settings-section-library"
              style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}
            >
              Data
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
            {settingsGates.canDeleteLibrary ? (
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
            ) : null}
          </div>
        ) : (
          <div data-testid="settings-section-data" hidden aria-hidden="true" />
        )}

        {/* Integrations */}
        <div data-testid="settings-section-integrations">
          <div
            className="u-caps"
            data-testid="settings-section-ai"
            style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}
          >
            Integrations
          </div>
          <Row
            title="Integrations"
            sub={
              settingsGates.canUseIntegrations
                ? 'Let agents use your library (MCP)'
                : settingsGates.integrationsLockReason ??
                  'Sign in to use account features'
            }
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
        </div>

        {/* Session */}
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

      <SettingsLegalFooter />

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
            onConfirm={() => {
              void handleDeleteLibrary();
            }}
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
            onConfirm={() => {
              void handleSignOut();
            }}
            isConfirming={isSigningOut}
          />
        );
      })()}
    </div>
  );
}
