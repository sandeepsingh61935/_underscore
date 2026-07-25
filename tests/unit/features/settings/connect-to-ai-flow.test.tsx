/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import { ConnectToAiFlow } from '@/features/settings/components/ConnectToAiFlow';
import { MCP_BRIDGE_STORAGE_KEYS } from '@/shared/constants/mcp-bridge';

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
        onStackDepthChange={onDepth}
        onExit={onExit}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('mcp-connections-hub')).toBeTruthy());
    expect(screen.getByText('← Settings')).toBeTruthy();
    expect(screen.getByText('Connect to AI')).toBeTruthy();
    expect(screen.queryByText('Configure AI providers')).toBeNull();

    screen.getByRole('button', { name: 'Add an AI app' }).click();
    await waitFor(() => expect(screen.getByTestId('mcp-app-picker')).toBeTruthy());
    expect(screen.getByText('← Connect to AI')).toBeTruthy();
    expect(onDepth).toHaveBeenCalledWith(2);

    screen.getByRole('button', { name: 'Cursor' }).click();
    await waitFor(() => expect(screen.getByTestId('mcp-client-setup')).toBeTruthy());
    expect(screen.getByText('← Add an AI app')).toBeTruthy();
    expect(screen.getByText('Connect Cursor')).toBeTruthy();

    screen.getByText('← Add an AI app').click();
    await waitFor(() => expect(screen.getByTestId('mcp-app-picker')).toBeTruthy());

    screen.getByText('← Connect to AI').click();
    await waitFor(() => expect(screen.getByTestId('mcp-connections-hub')).toBeTruthy());
    screen.getByText('← Settings').click();
    expect(onExit).toHaveBeenCalled();
  });

  it('marks Active after Check connection when bridge is connected', async () => {
    storageLocal.get.mockResolvedValue({
      [MCP_BRIDGE_STORAGE_KEYS.enabled]: true,
      [MCP_BRIDGE_STORAGE_KEYS.token]: 'tok',
      [MCP_BRIDGE_STORAGE_KEYS.connectionState]: 'connected',
      [MCP_BRIDGE_STORAGE_KEYS.activeApps]: [],
    });

    render(
      <ConnectToAiFlow isAuthenticated currentMode="pro_xai" />,
    );

    await waitFor(() => expect(screen.getByTestId('mcp-connections-hub')).toBeTruthy());
    screen.getByRole('button', { name: 'Add an AI app' }).click();
    await waitFor(() => expect(screen.getByTestId('mcp-app-picker')).toBeTruthy());
    screen.getByRole('button', { name: 'Claude Code' }).click();
    await waitFor(() => expect(screen.getByTestId('mcp-client-setup')).toBeTruthy());
    screen.getByRole('button', { name: 'Run connection check' }).click();

    await waitFor(() => {
      expect(screen.getByText(/can read highlights/)).toBeTruthy();
    });
    expect(storageLocal.set).toHaveBeenCalledWith({
      [MCP_BRIDGE_STORAGE_KEYS.activeApps]: ['claude-code'],
    });
  });
});
