import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { DeleteConfirmDialog } from '@/features/collections/components/DeleteConfirmDialog';
import { BtnText } from '@/ui-system/components/primitives/BtnText';
import { ConnectToAiFlow } from '@/features/settings/components/ConnectToAiFlow';
import { LibraryPulse } from '@/features/settings/components/LibraryPulse';
import { SettingsKeyboardSection } from '@/features/settings/components/SettingsKeyboardSection';
import { SettingsLegalFooter } from '@/features/settings/components/SettingsLegalFooter';
import { SettingsLocalCard } from '@/features/settings/components/SettingsLocalCard';
import { SettingsThemeSeg } from '@/features/settings/components/SettingsThemeSeg';
import { TypographySettings } from '@/features/settings/components/TypographySettings';
import { DEFAULT_MODE } from '@/shared/constants/mode-storage';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import type { ThemeType } from '@/shared/types/theme';
import { deleteLibraryCopy, signOutCopy } from '@/shared/utils/confirm-dialog-copy';
import type { WebHighlight, WebLibraryStats } from '@/web/hooks/useWebLibrary';
import type { ExportFormat } from '@/shared/highlight-export';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function countSavedSince(highlights: readonly WebHighlight[], sinceMs: number): number {
  return highlights.filter((h) => h.savedAt >= sinceMs).length;
}

/**
 * Phone settings — same section order and row copy as the extension Settings page.
 */
export function PhoneSettings({
  isAuthenticated,
  email,
  theme,
  onThemeChange,
  highlights,
  stats,
  onRefresh,
  refreshing,
  refreshError,
  canExport,
  onExport,
  onDeleteLibrary,
  onSignOut,
  canUseIntegrations,
  integrationsLockReason,
  isPaidActive,
}: {
  isAuthenticated: boolean;
  email: string | null;
  theme: ThemeType;
  onThemeChange: (theme: ThemeType) => void;
  highlights: readonly WebHighlight[];
  stats: WebLibraryStats;
  onRefresh: () => Promise<void>;
  refreshing: boolean;
  refreshError: string | null;
  canExport: boolean;
  onExport: (format: ExportFormat) => void;
  onDeleteLibrary: () => Promise<boolean>;
  onSignOut: () => Promise<void>;
  canUseIntegrations: boolean;
  integrationsLockReason?: string;
  isPaidActive: boolean;
}): React.ReactElement {
  const navigate = useNavigate();
  const { currentMode } = useApp();
  const [typographyExpanded, setTypographyExpanded] = useState(false);
  const [libraryStatsOpen, setLibraryStatsOpen] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const now = Date.now();
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);
  const todayCount = countSavedSince(highlights, todayStart);
  const weekCount = stats.thisWeekCount || countSavedSince(highlights, now - WEEK_MS);
  const domainCount = new Set(highlights.map((h) => h.domain)).size;

  const goSignIn = (): void => {
    void navigate('/sign-in', { state: { from: '/settings' } });
  };

  if (keyboardOpen) {
    return (
      <div
        data-od-id="settings-keyboard-page"
        style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
      >
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--rule-soft)' }}>
          <button
            type="button"
            className="u-mono"
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
        <div
          className="list-scroll screen-scroll"
          style={{ flex: 1, minHeight: 0, overflow: 'auto' }}
        >
          <div style={{ padding: '12px 16px 4px' }}>
            <h1 className="settings-title">Keyboard</h1>
            <p
              className="u-sans"
              style={{
                margin: '6px 0 0',
                fontSize: 'var(--step--1)',
                color: 'var(--ink-3)',
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
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <ConnectToAiFlow
          isAuthenticated={isAuthenticated}
          currentMode={(currentMode ?? DEFAULT_MODE) as ModeType}
          isPaidActive={isPaidActive}
          onSignIn={goSignIn}
          onExit={() => setConnectOpen(false)}
        />
      </div>
    );
  }

  const mergeSubtitle = refreshing
    ? 'Merging'
    : refreshError
      ? refreshError
      : 'Library matches cloud';

  return (
    <div
      data-od-id="settings-page"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
    >
      <div className="settings-head" data-od-id="settings-head">
        <h2 className="settings-title" data-od-id="settings-title">
          Settings
        </h2>
      </div>
      <div
        className="list-scroll screen-scroll"
        style={{ flex: 1, minHeight: 0, overflow: 'auto' }}
      >
        {!isAuthenticated ? (
          <SettingsLocalCard onSignIn={goSignIn} onChooseFree={goSignIn} />
        ) : (
          <>
            <div
              className="u-caps"
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
                <div className="title">{email || 'Signed in'}</div>
                <div className="sub">Synced</div>
              </div>
            </div>
          </>
        )}

        <div data-od-id="settings-section-appearance">
          <div
            className="u-caps"
            style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}
          >
            Appearance
          </div>
          <TypographySettings
            expanded={typographyExpanded}
            onToggle={() => setTypographyExpanded((open) => !open)}
          />
          <SettingsThemeSeg theme={theme} onChange={onThemeChange} />
        </div>

        <div data-od-id="settings-section-keyboard-entry">
          <div
            className="u-caps"
            style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}
          >
            Help
          </div>
          <button
            type="button"
            className="row"
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

        <div data-od-id="settings-section-data">
          <div
            className="u-caps"
            style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}
          >
            Data
          </div>
          {isAuthenticated ? (
            <LibraryPulse
              totalHighlights={stats.highlightCount}
              thisWeekCount={weekCount}
              todayCount={todayCount}
              totalDomains={domainCount}
              withNotesCount={stats.notesCount}
              withTagsCount={stats.tagCount}
              expanded={libraryStatsOpen}
              onToggle={() => setLibraryStatsOpen((open) => !open)}
            />
          ) : null}
          <div className="row" style={{ cursor: 'default' }} data-od-id="settings-sync">
            <div>
              <div className="title">Merge from account</div>
              <div className="sub">
                {isAuthenticated
                  ? mergeSubtitle
                  : 'Sign in to upload or merge your library'}
              </div>
            </div>
            <span className="row-end">
              <BtnText
                data-od-id="settings-sync-btn"
                muted={!isAuthenticated || refreshing}
                disabled={!isAuthenticated || refreshing}
                aria-label="Merge from account"
                onClick={() => {
                  void onRefresh();
                }}
              >
                {refreshing ? 'Merging' : 'Merge'}
              </BtnText>
            </span>
          </div>
          <div
            className="row"
            style={{ cursor: 'default' }}
            data-od-id="settings-upload-device"
          >
            <div>
              <div className="title">Upload from this device</div>
              <div className="sub">
                Add guest highlights on this device to your account
              </div>
            </div>
            <span className="row-end">
              <BtnText muted disabled aria-label="Upload from this device">
                Upload
              </BtnText>
            </span>
          </div>
          <div className="row" style={{ cursor: 'default' }} data-od-id="settings-export">
            <div>
              <div className="title">Download</div>
              <div className="sub">Markdown or spreadsheet</div>
            </div>
            <span className="row-end">
              <span className="export-inline" data-od-id="export-actions">
                <BtnText
                  muted={!canExport || highlights.length === 0}
                  disabled={!canExport || highlights.length === 0}
                  aria-label="Export library as Markdown"
                  onClick={() => onExport('md')}
                >
                  MD
                </BtnText>
                <BtnText
                  muted={!canExport || highlights.length === 0}
                  disabled={!canExport || highlights.length === 0}
                  aria-label="Export library as Spreadsheet"
                  onClick={() => onExport('xlsx')}
                >
                  XLSX
                </BtnText>
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
                disabled={!isAuthenticated || highlights.length === 0}
                onClick={() => setDeleteOpen(true)}
              >
                Delete
              </button>
            </span>
          </div>
        </div>

        <div data-od-id="settings-section-integrations">
          <div
            className="u-caps"
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
                {canUseIntegrations
                  ? 'Let agents use your library (MCP)'
                  : (integrationsLockReason ?? 'Sign in to use account features')}
              </div>
            </div>
            <span className="row-end">
              <button
                type="button"
                className="btn-text"
                aria-label={
                  canUseIntegrations ? 'Open Integrations' : 'Integrations locked'
                }
                onClick={() => setConnectOpen(true)}
              >
                ›
              </button>
            </span>
          </div>
        </div>

        {isAuthenticated ? (
          <>
            <div
              className="u-caps"
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
                <div className="title">This browser</div>
                <div className="sub">Your account stays signed in on other devices</div>
              </div>
              <span className="row-end">
                <button
                  type="button"
                  className="btn ghost sm danger"
                  aria-label="Sign out"
                  disabled={signingOut}
                  onClick={() => setSignOutOpen(true)}
                >
                  {signingOut ? 'Signing out' : 'Sign out'}
                </button>
              </span>
            </div>
          </>
        ) : null}

        <SettingsLegalFooter
          onOpenLegal={(doc) => {
            const path =
              doc === 'privacy' ? '/privacy' : doc === 'terms' ? '/terms' : '/help';
            void navigate(path);
          }}
        />
      </div>

      <DeleteConfirmDialog
        open={deleteOpen}
        onClose={() => {
          if (!deleting) setDeleteOpen(false);
        }}
        {...deleteLibraryCopy(isAuthenticated)}
        isConfirming={deleting}
        onConfirm={() => {
          setDeleting(true);
          void onDeleteLibrary().finally(() => {
            setDeleting(false);
            setDeleteOpen(false);
          });
        }}
      />
      <DeleteConfirmDialog
        open={signOutOpen}
        onClose={() => {
          if (!signingOut) setSignOutOpen(false);
        }}
        {...signOutCopy()}
        isConfirming={signingOut}
        onConfirm={() => {
          setSigningOut(true);
          void onSignOut().finally(() => {
            setSigningOut(false);
            setSignOutOpen(false);
          });
        }}
      />
    </div>
  );
}
