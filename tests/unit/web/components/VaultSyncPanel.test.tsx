/**
 * @file VaultSyncPanel.test.tsx
 * @description Component tests for VaultSyncPanel across all 4 display states.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VaultSyncPanel } from '@/web/components/settings/VaultSyncPanel';

describe('VaultSyncPanel', () => {
  it('renders browser unsupported state with friendly warning and fallback download', () => {
    const handleFallbackDownload = vi.fn();
    render(
      <VaultSyncPanel
        isSupported={false}
        connectionState="unsupported"
        onSelectFolder={vi.fn()}
        onAuthorize={vi.fn()}
        onDisconnect={vi.fn()}
        onSyncNow={vi.fn()}
        onFallbackDownload={handleFallbackDownload}
      />
    );

    expect(screen.getByText(/Local Vault Mirror/i)).toBeTruthy();
    expect(screen.getByText('Chromium browser required')).toBeTruthy();
    const downloadBtn = screen.getByTestId('vault-fallback-download');
    expect(downloadBtn).toBeTruthy();
    fireEvent.click(downloadBtn);
    expect(handleFallbackDownload).toHaveBeenCalled();
  });

  it('renders disconnected state with Select Vault Folder button', () => {
    const handleSelect = vi.fn();
    render(
      <VaultSyncPanel
        isSupported={true}
        connectionState="disconnected"
        onSelectFolder={handleSelect}
        onAuthorize={vi.fn()}
        onDisconnect={vi.fn()}
        onSyncNow={vi.fn()}
      />
    );

    const selectBtn = screen.getByTestId('vault-select-folder');
    expect(selectBtn).toBeTruthy();
    expect(selectBtn.textContent).toMatch(/Select Vault Folder/i);
    fireEvent.click(selectBtn);
    expect(handleSelect).toHaveBeenCalled();
  });

  it('renders permission required state with Authorize Vault button', () => {
    const handleAuthorize = vi.fn();
    render(
      <VaultSyncPanel
        isSupported={true}
        connectionState="need-permission"
        vaultName="ObsidianNotes"
        onSelectFolder={vi.fn()}
        onAuthorize={handleAuthorize}
        onDisconnect={vi.fn()}
        onSyncNow={vi.fn()}
      />
    );

    expect(screen.getByText(/ObsidianNotes/i)).toBeTruthy();
    const authBtn = screen.getByTestId('vault-authorize');
    expect(authBtn).toBeTruthy();
    expect(authBtn.textContent).toMatch(/Authorize Vault/i);
    fireEvent.click(authBtn);
    expect(handleAuthorize).toHaveBeenCalled();
  });

  it('renders connected state with vault name, last sync, Sync Now, and Disconnect button', () => {
    const handleSync = vi.fn();
    const handleDisconnect = vi.fn();
    render(
      <VaultSyncPanel
        isSupported={true}
        connectionState="connected"
        vaultName="ObsidianNotes"
        lastSyncedAt="2026-09-03T12:00:00.000Z"
        onSelectFolder={vi.fn()}
        onAuthorize={vi.fn()}
        onDisconnect={handleDisconnect}
        onSyncNow={handleSync}
      />
    );

    expect(screen.getByText(/ObsidianNotes/i)).toBeTruthy();
    const syncBtn = screen.getByTestId('vault-sync-now');
    expect(syncBtn).toBeTruthy();
    fireEvent.click(syncBtn);
    expect(handleSync).toHaveBeenCalled();

    const disconnectBtn = screen.getByTestId('vault-disconnect');
    expect(disconnectBtn).toBeTruthy();
    fireEvent.click(disconnectBtn);
    expect(handleDisconnect).toHaveBeenCalled();
  });

  it('displays non-blocking error notification when write operations fail', () => {
    render(
      <VaultSyncPanel
        isSupported={true}
        connectionState="connected"
        vaultName="ObsidianNotes"
        syncResult={{
          totalPages: 2,
          writtenPages: 1,
          skippedPages: 0,
          failedPages: 1,
          errors: [{ filePath: 'example.com/locked.md', error: 'File locked' }],
          lastSyncedAt: new Date().toISOString(),
        }}
        onSelectFolder={vi.fn()}
        onAuthorize={vi.fn()}
        onDisconnect={vi.fn()}
        onSyncNow={vi.fn()}
      />
    );

    expect(screen.getByTestId('vault-sync-error')).toBeTruthy();
    expect(screen.getByText(/locked\.md/i)).toBeTruthy();
  });
});
