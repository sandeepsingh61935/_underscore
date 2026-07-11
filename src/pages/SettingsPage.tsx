import React, { useState } from 'react';

import { useApp } from '@/core/context/AppProvider';
import { ExportActions } from '@/features/collections/components/ExportActions';
import { DeleteConfirmDialog } from '@/features/collections/components/DeleteConfirmDialog';
import { useHighlightDelete } from '@/features/collections/hooks/use-highlight-delete';
import { useVaultLocked } from '@/features/collections/hooks/use-vault-locked';
import { formatSyncSubtitle, useSyncLibrary } from '@/features/collections/hooks/use-sync-library';
import { BasicTtlPicker } from '@/features/settings/components/BasicTtlPicker';
import { McpBridgeSettings } from '@/features/settings/components/McpBridgeSettings';
import { ConnectedAppsSettings } from '@/features/settings/components/ConnectedAppsSettings';
import { formatBasicTtlConfig } from '@/shared/constants/basic-ttl';
import { getModeBranding } from '@/shared/constants/mode-branding';
import { useBasicTtlOption } from '@/ui-system/hooks/useBasicTtlOption';
import { Row } from '@/ui-system/components/primitives/Row';
import { Spinner } from '@/ui-system/components/primitives/Spinner';

const TYPE_PRESETS = {
  editorial: {
    name: 'Editorial',
    note: 'Default · Serif display, serif body',
    serif: 'var(--serif)',
    sans: 'var(--sans)',
  },
  classic: {
    name: 'Classic',
    note: 'System fonts · No custom presets',
    serif: 'serif',
    sans: 'sans-serif',
  },
  modern: {
    name: 'Modern',
    note: 'Sans-only · Clean, utilitarian',
    serif: 'var(--sans)',
    sans: 'var(--sans)',
  },
} as const;

type TypePresetId = keyof typeof TYPE_PRESETS;

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
 */
export function SettingsPage({
  onBack: _onBack,
  onChangeMode,
  onConfigureAIProviders,
  onSignIn,
  onLogout,
}: SettingsPageProps): React.ReactElement {
  const { theme, setTheme, currentMode, user, logout: appLogout } = useApp();
  const logout = onLogout ?? appLogout;
  const { sync, isSyncing, lastResult, error: syncError, status: syncStatus } = useSyncLibrary();
  const { ttlConfig: basicTtlConfig } = useBasicTtlOption();
  const [typeId, setTypeId] = useState<TypePresetId>('editorial');
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [ttlExpanded, setTtlExpanded] = useState(false);
  const { deleteScope } = useHighlightDelete();
  const vaultLocked = useVaultLocked(Boolean(user));
  const [deleteLibraryOpen, setDeleteLibraryOpen] = useState(false);
  const [isDeletingLibrary, setIsDeletingLibrary] = useState(false);

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

  const handleAccountClick = (): void => {
    if (user && !isSigningOut) {
      void handleSignOut();
      return;
    }
    if (!user) {
      onSignIn?.();
    }
  };

  const handleToggleTheme = (): void => {
    const themes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme as 'light' | 'dark' | 'system');
    const nextTheme = themes[(currentIndex + 1) % themes.length] || 'system';
    setTheme(nextTheme);
  };

  const syncSubtitle = (() => {
    if (!user) return 'Sign in to sync with cloud';
    if (isSyncing) return 'Pulling highlights from database…';
    if (syncError) return syncError;
    if (syncStatus === 'success' && lastResult) return formatSyncSubtitle(lastResult);
    return 'Pull latest highlights from cloud';
  })();

  const handleSyncLibrary = async (): Promise<void> => {
    if (!user || isSyncing) return;
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

  const basicTtlLabel = formatBasicTtlConfig(basicTtlConfig);
  const modeBranding = getModeBranding(currentMode);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <div style={{ padding: '12px 16px 6px' }}>
        <div className="u-serif" style={{ fontSize: 'var(--step-3)', letterSpacing: '-0.02em' }}>Settings</div>
      </div>

      <div className="list-scroll" style={{ flex: 1 }}>
        <div className="u-caps" style={{ padding: '12px 16px 4px', color: 'var(--ink-3)' }}>Typography</div>
        {(Object.keys(TYPE_PRESETS) as TypePresetId[]).map((id) => {
          const p = TYPE_PRESETS[id];
          const active = id === typeId;
          return (
            <button
              key={id}
              onClick={() => setTypeId(id)}
              style={{
                all: 'unset',
                cursor: 'pointer',
                display: 'block',
                width: '100%',
                padding: '12px 16px',
                borderBottom: '1px solid var(--rule-soft)',
                background: active ? 'var(--paper-2)' : 'transparent',
                boxSizing: 'border-box'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div>
                  <div style={{ fontFamily: p.serif, fontSize: 'var(--step-1)', letterSpacing: '-0.01em' }}>{p.name}</div>
                  <div className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)', marginTop: 3, letterSpacing: '0.04em' }}>{p.note}</div>
                </div>
                {/* eslint-disable-next-line no-restricted-syntax */}
                <span className="u-mono" style={{ fontSize: 'var(--step--2)', color: active ? 'var(--accent)' : 'var(--ink-3)' }}>
                  {active ? '● selected' : '○'}
                </span>
              </div>
            </button>
          );
        })}
        <div className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-4)', padding: '6px 16px 10px', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          Applied uniformly across the app
        </div>

        <div className="u-caps" style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}>General</div>
        <Row
          title="Theme"
          sub="Match system"
          right={<span className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)', textTransform: 'capitalize' }}>{theme}</span>}
          onClick={handleToggleTheme}
        />
        <Row
          title="Mode"
          sub={`${modeBranding.displayName} · ${modeBranding.tagline.toLowerCase()}`}
          right={<span className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)' }}>Change</span>}
          onClick={onChangeMode}
        />
        {currentMode === 'basic' && (
          <>
            <Row
              title="Retention"
              sub="How long highlights stick around on this device"
              right={<span className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--accent)' }}>{basicTtlLabel}</span>}
              onClick={() => setTtlExpanded((v) => !v)}
            />
            {ttlExpanded && <BasicTtlPicker value={basicTtlConfig} />}
          </>
        )}
        <Row title="Density" sub="Comfortable" right={<span className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)' }}>Edit</span>} />

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
                  color: user ? 'var(--accent)' : 'var(--ink-3)',
                }}
              >
                {user ? 'Sync' : '—'}
              </span>
            )
          }
          onClick={user && !isSyncing ? handleSyncLibrary : undefined}
        />
        <Row
          title="Export library"
          sub={user ? 'Download all highlights as markdown or spreadsheet' : 'Sign in to export your library'}
          right={<ExportActions scope={{ kind: 'library' }} disabled={!user} />}
        />
        <Row
          title="Delete library"
          sub={
            vaultLocked
              ? 'Unlock vault in Settings before deleting'
              : 'Permanently remove all highlights on this device'
          }
          right={
            <span
              className="u-mono"
              style={{
                fontSize: 'var(--step--2)',
                color: vaultLocked ? 'var(--ink-3)' : 'var(--accent)',
              }}
            >
              {vaultLocked ? 'Locked' : 'Delete'}
            </span>
          }
          onClick={vaultLocked ? undefined : () => setDeleteLibraryOpen(true)}
        />

        <McpBridgeSettings
          isAuthenticated={Boolean(user)}
          currentMode={currentMode}
          onSignIn={onSignIn}
        />

        <ConnectedAppsSettings isAuthenticated={Boolean(user)} />

        <div className="u-caps" style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}>Account</div>
        <Row
          title={user?.email || 'Guest User'}
          sub={user ? 'Signed in' : 'Basic mode'}
          right={
            isSigningOut ? (
              <Spinner size="sm" />
            ) : (
              <span className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)' }}>
                {user ? 'Sign out' : 'Sign in'}
              </span>
            )
          }
          onClick={!isSigningOut ? handleAccountClick : undefined}
        />
        <Row
          title="Configure AI providers"
          sub="Set API keys for Anthropic or Ollama"
          right={<span className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)' }}>→</span>}
          onClick={onConfigureAIProviders}
        />
      </div>

      <DeleteConfirmDialog
        open={deleteLibraryOpen}
        onClose={() => setDeleteLibraryOpen(false)}
        title="Delete entire library?"
        message={
          user
            ? 'This permanently removes all highlights from this device and marks them deleted in the cloud. This cannot be undone.'
            : 'This permanently removes all highlights stored on this device in Basic mode. This cannot be undone.'
        }
        onConfirm={() => { void handleDeleteLibrary(); }}
        isConfirming={isDeletingLibrary}
        exportFooter={<ExportActions scope={{ kind: 'library' }} disabled={!user || vaultLocked} />}
      />
    </div>
  );
}
