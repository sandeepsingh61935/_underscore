import React, { useState } from 'react';

import { useApp } from '@/core/context/AppProvider';
import { useBillingContextOptional } from '@/features/billing/BillingProvider';
import { DeleteConfirmDialog } from '@/features/collections/components/DeleteConfirmDialog';
import { ExportActions } from '@/features/collections/components/ExportActions';
import { useHighlightDelete } from '@/features/collections/hooks/use-highlight-delete';
import {
  formatLastSyncedAt,
  formatSyncSubtitle,
  useSyncLibrary,
} from '@/features/collections/hooks/use-sync-library';
import {
  formatUploadSubtitle,
  useUploadFromDevice,
} from '@/features/collections/hooks/use-upload-from-device';
import { useDashboardData } from '@/features/collections/hooks/useDashboardData';
import { ConnectToAiFlow } from '@/features/settings/components/ConnectToAiFlow';
import { LibraryPulse } from '@/features/settings/components/LibraryPulse';
import { SettingsKeyboardSection } from '@/features/settings/components/SettingsKeyboardSection';
import { SettingsLegalFooter } from '@/features/settings/components/SettingsLegalFooter';
import { SettingsLocalCard } from '@/features/settings/components/SettingsLocalCard';
import { SettingsThemeSeg } from '@/features/settings/components/SettingsThemeSeg';
import { TypographySettings } from '@/features/settings/components/TypographySettings';
import { HelpPage } from '@/pages/HelpPage';
import { PrivacyPage } from '@/pages/PrivacyPage';
import { TermsPage } from '@/pages/TermsPage';
import { freeEntitlement } from '@/shared/billing';
import { DEFAULT_MODE } from '@/shared/constants/mode-storage';
import { resolveProductCaps } from '@/shared/entitlement/resolveProductCaps';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { resolveSettingsActionGates } from '@/shared/settings/settings-topic-ia';
import { deleteLibraryCopy, signOutCopy } from '@/shared/utils/confirm-dialog-copy';
import { featureGateSubtitle } from '@/shared/utils/feature-gate-copy';
import { Spinner } from '@/ui-system/components/primitives/Spinner';
import { useMcpGate, useModeFeature } from '@/ui-system/hooks/useModeFeature';

export interface SettingsPageProps {
  onBack?: () => void;
  /** @deprecated Mode is inline on Settings; kept for callers. */
  onChangeMode?: () => void;
  onSignIn?: () => void;
  onLogout?: () => Promise<void>;
}

/**
 * Settings — prototype parity: viewSettings()
 * Order: Account → Appearance → Help/Keyboard → Data → Integrations → Session → About
 * No Mode control. No Billing UI. Pixel-parity with
 * open-design/.od/projects/77039981-726c-431d-8a7a-ae9f169bba0c prototype.
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
    user,
    logout: appLogout,
    isAuthenticated: appAuthenticated,
  } = useApp();
  const modeForDashboard = (currentMode ?? DEFAULT_MODE) as ModeType;
  const { data: dashboardData, isLoading: dashboardLoading } = useDashboardData(
    modeForDashboard,
    appAuthenticated
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
  const {
    upload: uploadFromDevice,
    isUploading,
    lastResult: uploadResult,
    error: uploadError,
    status: uploadStatus,
  } = useUploadFromDevice();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [typographyExpanded, setTypographyExpanded] = useState(false);
  const [libraryStatsOpen, setLibraryStatsOpen] = useState(false);
  const { deleteScope } = useHighlightDelete();
  const [deleteLibraryOpen, setDeleteLibraryOpen] = useState(false);
  const [isDeletingLibrary, setIsDeletingLibrary] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [legalDoc, setLegalDoc] = useState<'privacy' | 'terms' | 'help' | null>(null);
  const isAuthenticated = Boolean(user);
  const syncGate = useModeFeature('sync', isAuthenticated);
  const mcpGate = useMcpGate(
    isAuthenticated,
    isPaidActive,
    billing?.snapshot.entitlement.status === 'past_due'
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

  const transferLocked = !syncGate.allowed || !user;
  const transferLockSubtitle = !user
    ? 'Sign in to upload or merge your library'
    : featureGateSubtitle(syncGate.reason);

  const syncSubtitle = ((): string => {
    if (transferLocked) return transferLockSubtitle;
    if (isSyncing) {
      const pct =
        progressPercent !== null && progressPercent !== undefined
          ? ` · ${progressPercent}%`
          : '';
      return `Merging${pct}`;
    }
    if (syncError) return syncError;
    if (syncStatus === 'success' && lastResult) {
      const detail = formatSyncSubtitle(lastResult);
      const when = formatLastSyncedAt(lastSyncedAt);
      return detail === 'Library matches cloud' ? when : `${detail} · ${when}`;
    }
    return formatLastSyncedAt(lastSyncedAt);
  })();

  const uploadSubtitle = ((): string => {
    if (transferLocked) return transferLockSubtitle;
    if (isUploading) return 'Uploading';
    if (uploadError) return uploadError;
    if (uploadStatus === 'success' && uploadResult) {
      return formatUploadSubtitle(uploadResult);
    }
    return 'Add guest highlights on this device to your account';
  })();

  const handleSyncLibrary = async (): Promise<void> => {
    if (transferLocked || isSyncing || isUploading) return;
    await sync();
  };

  const handleUploadFromDevice = async (): Promise<void> => {
    if (transferLocked || isSyncing || isUploading) return;
    await uploadFromDevice();
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

  if (keyboardOpen) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
        }}
        data-testid="settings-keyboard-page"
        data-od-id="settings-keyboard-page"
      >
        <div
          style={{
            padding: '10px 16px',
            borderBottom: '1px solid var(--rule-soft)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <button
            type="button"
            className="u-mono"
            data-testid="settings-keyboard-back"
            data-od-id="settings-keyboard-back"
            onClick={() => setKeyboardOpen(false)}
            style={{
              all: 'unset',
              cursor: 'pointer',
              fontSize: 'var(--step--2)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--ink-3)',
            }}
          >
            ← Settings
          </button>
        </div>
        <div className="list-scroll screen-scroll" style={{ flex: 1, minHeight: 0 }}>
          <div className="popup-page-title-wrap" style={{ paddingBottom: 4 }}>
            <h1 className="popup-page-title">Keyboard</h1>
            <p
              className="u-sans"
              style={{
                margin: '6px 0 0',
                fontSize: 'var(--step--1)',
                color: 'var(--ink-3)',
                lineHeight: 1.45,
              }}
            >
              Shortcuts while highlighting on a page.
            </p>
          </div>
          <SettingsKeyboardSection hideHeading />
        </div>
      </div>
    );
  }

  if (connectOpen) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
        }}
      >
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

  if (legalDoc) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
        }}
        data-testid="settings-legal-page"
        data-od-id="legal-page"
      >
        <div
          style={{
            padding: '10px 16px',
            borderBottom: '1px solid var(--rule-soft)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <button
            type="button"
            className="u-mono"
            data-testid="settings-legal-back"
            data-od-id="legal-back"
            onClick={() => setLegalDoc(null)}
            style={{
              all: 'unset',
              cursor: 'pointer',
              fontSize: 'var(--step--2)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--ink-3)',
            }}
          >
            ← Settings
          </button>
        </div>
        <div
          className="list-scroll screen-scroll"
          style={{ flex: 1, minHeight: 0, padding: '0' }}
        >
          {legalDoc === 'privacy' ? (
            <PrivacyPage />
          ) : legalDoc === 'terms' ? (
            <TermsPage />
          ) : (
            <HelpPage />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="screen-enter"
      data-od-id="settings-page"
      data-testid="settings-page"
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      <div className="settings-head" data-od-id="settings-head">
        <h2
          className="settings-title"
          data-od-id="settings-title"
          data-testid="settings-title"
        >
          Settings
        </h2>
      </div>

      <div
        className="list-scroll screen-scroll"
        style={{ flex: 1, minHeight: 0 }}
        data-testid="settings-scroll"
        data-od-id="settings-scroll"
      >
        {/* Account */}
        <div
          data-od-id="settings-section-account-wrap"
          data-testid="settings-section-account-wrap"
        >
          {!user ? (
            <div data-testid="settings-guest-card">
              <SettingsLocalCard onSignIn={onSignIn} onChooseFree={onSignIn} />
            </div>
          ) : null}

          {user ? (
            <>
              <div
                className="u-caps"
                data-testid="settings-section-account"
                data-od-id="settings-section-account"
                style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}
              >
                Account
              </div>
              <div
                className="row"
                style={{ cursor: 'default' }}
                data-od-id="settings-account-row"
              >
                <div>
                  <div className="title">{user.email || 'Signed in'}</div>
                  <div className="sub">Synced</div>
                </div>
              </div>
            </>
          ) : (
            <div data-testid="settings-section-account" hidden aria-hidden="true" />
          )}
        </div>

        {/* Appearance */}
        <div
          data-od-id="settings-section-appearance"
          data-testid="settings-section-appearance"
        >
          <div
            className="u-caps"
            style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}
          >
            Appearance
          </div>
          <div
            data-testid="settings-section-typography"
            data-od-id="settings-section-typography"
          >
            <TypographySettings
              expanded={typographyExpanded}
              onToggle={() => setTypographyExpanded((v) => !v)}
            />
          </div>
          <SettingsThemeSeg theme={theme} onChange={(t) => setTheme(t)} />
        </div>

        {/* Help → Keyboard - subpage entry */}
        <div
          data-testid="settings-section-keyboard-entry"
          data-od-id="settings-section-keyboard-entry"
        >
          <div
            className="u-caps"
            style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}
          >
            Help
          </div>
          <button
            type="button"
            className="row"
            data-action="open-keyboard"
            data-testid="settings-open-keyboard"
            data-od-id="settings-open-keyboard"
            onClick={() => setKeyboardOpen(true)}
          >
            <div>
              <div className="title">Keyboard</div>
              <div className="sub">Shortcuts on pages you highlight</div>
            </div>
            <span className="trail" aria-hidden="true">
              ›
            </span>
          </button>
        </div>

        {/* Data — always visible (guest has Download/Delete; signed-in adds stats+sync) */}
        <div data-testid="settings-section-data" data-od-id="settings-section-data">
          <div
            className="u-caps"
            data-testid="settings-section-library"
            data-od-id="settings-section-library"
            style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}
          >
            Data
          </div>
          {isAuthenticated ? (
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
          ) : null}
          <div
            className="row"
            style={{ cursor: 'default' }}
            data-od-id="settings-sync"
          >
            <div>
              <div className="title">Merge from account</div>
              <div className="sub">{syncSubtitle}</div>
            </div>
            <span className="row-end">
              {isSyncing ? (
                <button
                  type="button"
                  className="btn ghost sm"
                  disabled
                  data-testid="settings-sync-btn"
                  data-od-id="settings-sync-btn"
                  aria-busy="true"
                >
                  <span
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    data-testid="sync-progress"
                  >
                    <span className="state-dot-spin" aria-hidden="true" />
                    <span className="u-mono" style={{ fontSize: 'var(--step--2)' }}>
                      {progressPercent !== null ? `${progressPercent}%` : '…'}
                    </span>
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn ghost sm"
                  data-testid="settings-sync-btn"
                  data-od-id="settings-sync-btn"
                  disabled={transferLocked || isUploading}
                  aria-label="Merge from account"
                  onClick={() => {
                    void handleSyncLibrary();
                  }}
                >
                  Merge
                </button>
              )}
            </span>
          </div>
          {isSyncing ? (
            <div
              data-testid="sync-progress-bar"
              data-od-id="sync-progress-bar"
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
          <div
            className="row"
            style={{ cursor: 'default' }}
            data-od-id="settings-upload-device"
          >
            <div>
              <div className="title">Upload from this device</div>
              <div className="sub">{uploadSubtitle}</div>
            </div>
            <span className="row-end">
              <button
                type="button"
                className="btn ghost sm"
                data-testid="settings-upload-btn"
                data-od-id="settings-upload-btn"
                disabled={transferLocked || isSyncing || isUploading}
                aria-label="Upload from this device"
                aria-busy={isUploading}
                onClick={() => {
                  void handleUploadFromDevice();
                }}
              >
                {isUploading ? 'Uploading' : 'Upload'}
              </button>
            </span>
          </div>
          <div className="row" style={{ cursor: 'default' }} data-od-id="settings-export">
            <div>
              <div className="title">Download</div>
              <div className="sub">Markdown or spreadsheet</div>
            </div>
            <span className="row-end">
              <span data-od-id="export-actions">
                <ExportActions scope={{ kind: 'library' }} variant="inline" />
              </span>
            </span>
          </div>
          <div
            className="row"
            style={{ cursor: 'default' }}
            data-od-id="settings-delete-lib"
          >
            <div>
              <div className="title">Delete library</div>
            </div>
            <span className="row-end">
              <button
                type="button"
                className="btn ghost sm danger"
                aria-label="Delete library"
                data-testid="settings-delete-library"
                data-od-id="settings-delete-lib-btn"
                onClick={() => setDeleteLibraryOpen(true)}
              >
                Delete
              </button>
            </span>
          </div>
        </div>

        {/* Integrations */}
        <div
          data-testid="settings-section-integrations"
          data-od-id="settings-section-integrations"
        >
          <div
            className="u-caps"
            data-testid="settings-section-ai"
            data-od-id="settings-section-ai"
            style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}
          >
            Integrations
          </div>
          <div
            className="row"
            style={{ cursor: 'default' }}
            data-od-id="settings-connect-ai"
          >
            <div>
              <div className="title">Integrations</div>
              <div className="sub">
                {settingsGates.canUseIntegrations
                  ? 'Let agents use your library (MCP)'
                  : (settingsGates.integrationsLockReason ??
                    'Sign in to use account features')}
              </div>
            </div>
            <span className="row-end">
              <button
                type="button"
                className="btn-text"
                data-action="open-connect"
                data-testid="settings-open-connect"
                data-od-id="settings-open-connect"
                aria-label={mcpGate.allowed ? 'Open Integrations' : 'Integrations locked'}
                onClick={() => setConnectOpen(true)}
              >
                {mcpGate.allowed ? (
                  '›'
                ) : (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 12 12"
                    aria-hidden="true"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ display: 'block' }}
                  >
                    <rect x="2.5" y="5.5" width="7" height="5" rx="1" />
                    <path d="M4 5.5V4a2 2 0 0 1 4 0v1.5" />
                  </svg>
                )}
              </button>
            </span>
          </div>
        </div>

        {/* Session */}
        {user ? (
          <>
            <div
              className="u-caps"
              data-testid="settings-section-session"
              data-od-id="settings-section-session"
              style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}
            >
              Session
            </div>
            <div
              className="row"
              style={{ cursor: 'default' }}
              data-od-id="settings-session"
            >
              <div>
                <div className="title">Sign out</div>
              </div>
              <span className="row-end">
                <button
                  type="button"
                  className="btn ghost sm"
                  aria-label="Sign out"
                  data-testid="settings-sign-out"
                  data-od-id="settings-sign-out"
                  disabled={isSigningOut}
                  onClick={() => {
                    if (!isSigningOut) setSignOutOpen(true);
                  }}
                >
                  {isSigningOut ? <Spinner size="sm" /> : 'Sign out'}
                </button>
              </span>
            </div>
          </>
        ) : null}

        {/* About — prototype aboutBlock inside scroll; in extension internal viewLegal, in web window.open */}
        <div data-testid="settings-legal-wrapper">
          <SettingsLegalFooter onOpenLegal={(doc) => setLegalDoc(doc)} />
        </div>
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
            onConfirm={() => {
              void handleDeleteLibrary();
            }}
            isConfirming={isDeletingLibrary}
            exportFooter={<ExportActions scope={{ kind: 'library' }} />}
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
