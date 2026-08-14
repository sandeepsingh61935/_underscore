/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import { ConnectToAiFlow } from '@/features/settings/components/ConnectToAiFlow';
import { MCP_BRIDGE_STORAGE_KEYS } from '@/shared/constants/mcp-bridge';

const reloadGrants = vi.fn();

vi.mock('@/features/oauth/hooks/useOAuthGrants', () => ({
  useOAuthGrants: () => ({
    grants: [],
    isLoading: false,
    error: null,
    reload: reloadGrants,
    revoke: vi.fn(),
    isRevoking: false,
  }),
}));

const storageLocal = {
  get: vi.fn(),
  set: vi.fn(),
};

const onChanged = {
  addListener: vi.fn(),
  removeListener: vi.fn(),
};

vi.stubGlobal('chrome', {
  storage: {
    local: storageLocal,
    onChanged,
  },
});

describe('ConnectToAiFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reloadGrants.mockReset();
    storageLocal.get.mockResolvedValue({
      [MCP_BRIDGE_STORAGE_KEYS.enabled]: false,
      [MCP_BRIDGE_STORAGE_KEYS.token]: '',
      [MCP_BRIDGE_STORAGE_KEYS.connectionState]: 'disconnected',
      [MCP_BRIDGE_STORAGE_KEYS.activeApps]: [],
    });
    storageLocal.set.mockResolvedValue(undefined);
  });

  it('pushes picker then setup with contextual back', async () => {
    const onDepth = vi.fn();
    const onExit = vi.fn();
    render(
      <ConnectToAiFlow
        isAuthenticated
        currentMode="pro_xai"
        isPaidActive
        onStackDepthChange={onDepth}
        onExit={onExit}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('mcp-connections-hub')).toBeTruthy());
    expect(screen.getByText('← Settings')).toBeTruthy();
    expect(screen.getByText('Integrations')).toBeTruthy();
    expect(screen.queryByText('Models & providers')).toBeNull();

    screen.getByRole('button', { name: 'Add an AI app' }).click();
    await waitFor(() => expect(screen.getByTestId('mcp-app-picker')).toBeTruthy());
    expect(screen.getByText('← Integrations')).toBeTruthy();
    expect(onDepth).toHaveBeenCalledWith(2);

    screen.getByRole('button', { name: 'Cursor' }).click();
    await waitFor(() => expect(screen.getByTestId('mcp-client-setup')).toBeTruthy());
    expect(screen.getByText('← Add an AI app')).toBeTruthy();
    expect(screen.getByText('Connect Cursor')).toBeTruthy();
    expect(screen.getByTestId('mcp-handoff-primary').textContent).toMatch(/open in cursor/i);

    screen.getByText('← Add an AI app').click();
    await waitFor(() => expect(screen.getByTestId('mcp-app-picker')).toBeTruthy());

    screen.getByText('← Integrations').click();
    await waitFor(() => expect(screen.getByTestId('mcp-connections-hub')).toBeTruthy());
    screen.getByText('← Settings').click();
    expect(onExit).toHaveBeenCalled();
  });

  it('does not treat a copied snippet or bridge handshake as Connected', async () => {
    storageLocal.get.mockResolvedValue({
      [MCP_BRIDGE_STORAGE_KEYS.enabled]: true,
      [MCP_BRIDGE_STORAGE_KEYS.token]: 'tok',
      [MCP_BRIDGE_STORAGE_KEYS.connectionState]: 'connected',
      [MCP_BRIDGE_STORAGE_KEYS.activeApps]: ['claude-code'],
    });

    render(
      <ConnectToAiFlow isAuthenticated currentMode="pro_xai" isPaidActive />,
    );

    await waitFor(() => expect(screen.getByTestId('mcp-connections-hub')).toBeTruthy());
    expect(screen.getByTestId('mcp-integrations-status').textContent).toBe('Ready');
    expect(screen.getByTestId('mcp-legacy-bridge-notice')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Run connection check' })).toBeNull();
    expect(screen.getByTestId('mcp-remote-url').textContent).toMatch(/mcp/i);
    expect(screen.queryByRole('button', { name: 'Connect' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Add an AI app' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Copy URL' })).toBeTruthy();
  });

  it('reloads grants when the window is focused', async () => {
    render(
      <ConnectToAiFlow isAuthenticated currentMode="pro_xai" isPaidActive />,
    );
    await waitFor(() => expect(screen.getByTestId('mcp-connections-hub')).toBeTruthy());
    reloadGrants.mockClear();
    window.dispatchEvent(new Event('focus'));
    expect(reloadGrants).toHaveBeenCalled();
  });
});
