/**
 * @file VaultSyncPanel.tsx
 * @description Settings panel for Local Vault Mirror Sync (Obsidian / Logseq) via File System Access API.
 */
import React from 'react';

import type { VaultConnectionState } from '@/web/hooks/useVaultSync';
import type { VaultSyncResult } from '@/web/services/vault-sync-service';

export interface VaultSyncPanelProps {
  isSupported: boolean;
  connectionState: VaultConnectionState;
  vaultName?: string | null;
  lastSyncedAt?: string | null;
  isSyncing?: boolean;
  syncResult?: VaultSyncResult | null;
  error?: string | null;
  onSelectFolder: () => void;
  onAuthorize: () => void;
  onDisconnect: () => void;
  onSyncNow: () => void;
  onFallbackDownload?: () => void;
}

export function formatSyncTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;

    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'recently';
  }
}

export function VaultSyncPanel({
  isSupported,
  connectionState,
  vaultName,
  lastSyncedAt,
  isSyncing = false,
  syncResult,
  error,
  onSelectFolder,
  onAuthorize,
  onDisconnect,
  onSyncNow,
  onFallbackDownload,
}: VaultSyncPanelProps): React.ReactElement {
  return (
    <div className="block" data-od-id="settings-vault-mirror-block">
      <p className="block-label">Local Vault Mirror (Obsidian / Logseq)</p>

      {/* State 1: Unsupported browser */}
      {!isSupported || connectionState === 'unsupported' ? (
        <div className="setting-row" data-od-id="vault-state-unsupported">
          <div className="grow">
            <div className="title">Chromium browser required</div>
            <div className="sub">
              Local folder sync requires a Chromium browser (Chrome, Edge, Brave, Arc). On
              this browser, you can download a markdown archive of your library.
            </div>
          </div>
          {onFallbackDownload ? (
            <button
              type="button"
              className="btn sm"
              data-od-id="vault-fallback-download"
              data-testid="vault-fallback-download"
              onClick={onFallbackDownload}
            >
              Download Markdown
            </button>
          ) : null}
        </div>
      ) : null}

      {/* State 2: Disconnected */}
      {isSupported && connectionState === 'disconnected' ? (
        <div className="setting-row" data-od-id="vault-state-disconnected">
          <div className="grow">
            <div className="title">Mirror to local folder</div>
            <div className="sub">
              Automatically save highlights and notes as Markdown files with YAML
              frontmatter into your Obsidian or Logseq vault.
            </div>
          </div>
          <button
            type="button"
            className="btn accent sm"
            data-od-id="vault-select-folder"
            data-testid="vault-select-folder"
            onClick={onSelectFolder}
          >
            Select Vault Folder
          </button>
        </div>
      ) : null}

      {/* State 3: Permission required */}
      {isSupported && connectionState === 'need-permission' ? (
        <div className="setting-row" data-od-id="vault-state-need-permission">
          <div className="grow">
            <div className="title">{vaultName || 'Selected Vault'}</div>
            <div className="sub">
              Browser permission is needed to update notes in this folder.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn accent sm"
              data-od-id="vault-authorize"
              data-testid="vault-authorize"
              onClick={onAuthorize}
            >
              Authorize Vault
            </button>
            <button
              type="button"
              className="btn sm ghost"
              data-od-id="vault-disconnect"
              data-testid="vault-disconnect"
              onClick={onDisconnect}
            >
              Disconnect
            </button>
          </div>
        </div>
      ) : null}

      {/* State 4: Connected & synced */}
      {isSupported && connectionState === 'connected' ? (
        <div className="setting-row" data-od-id="vault-state-connected">
          <div className="grow">
            <div className="title">{vaultName || 'Vault Connected'}</div>
            <div className="sub" data-od-id="vault-last-synced">
              {isSyncing ? (
                'Syncing notes to vault…'
              ) : lastSyncedAt ? (
                <>
                  Last synced: {formatSyncTime(lastSyncedAt)}
                  {syncResult
                    ? ` · ${syncResult.writtenPages + syncResult.skippedPages} files up to date`
                    : ''}
                </>
              ) : (
                'Connected and ready to mirror.'
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn sm"
              data-od-id="vault-sync-now"
              data-testid="vault-sync-now"
              disabled={isSyncing}
              onClick={onSyncNow}
            >
              {isSyncing ? '…' : 'Sync Now'}
            </button>
            <button
              type="button"
              className="btn sm ghost"
              data-od-id="vault-disconnect"
              data-testid="vault-disconnect"
              disabled={isSyncing}
              onClick={onDisconnect}
            >
              Disconnect
            </button>
          </div>
        </div>
      ) : null}

      {/* Non-blocking error notifications */}
      {error ? (
        <div
          className="setting-row"
          style={{ marginTop: 8 }}
          data-od-id="vault-sync-error"
          data-testid="vault-sync-error"
        >
          <div className="sub" style={{ color: 'var(--ink)' }}>
            Error: {error}
          </div>
        </div>
      ) : null}

      {syncResult && syncResult.errors.length > 0 ? (
        <div
          className="setting-row"
          style={{ marginTop: 8 }}
          data-od-id="vault-sync-error"
          data-testid="vault-sync-error"
        >
          <div className="sub" style={{ color: 'var(--ink)' }}>
            Write skipped for locked files:{' '}
            {syncResult.errors.map((e) => e.filePath).join(', ')}
          </div>
        </div>
      ) : null}
    </div>
  );
}
