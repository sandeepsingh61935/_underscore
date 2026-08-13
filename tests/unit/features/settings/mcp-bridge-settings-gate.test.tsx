/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import { MCP_BRIDGE_STORAGE_KEYS } from '@/shared/constants/mcp-bridge';
import { McpBridgeSettings } from '@/features/settings/components/McpBridgeSettings';

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

describe('McpBridgeSettings paid gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageLocal.get.mockResolvedValue({
      [MCP_BRIDGE_STORAGE_KEYS.enabled]: true,
      [MCP_BRIDGE_STORAGE_KEYS.token]: 'tok',
      [MCP_BRIDGE_STORAGE_KEYS.connectionState]: 'disconnected',
    });
    storageLocal.set.mockResolvedValue(undefined);
  });

  it('hard-cuts over an enabled bridge when mode is Account Free', async () => {
    render(
      <McpBridgeSettings isAuthenticated currentMode="pro" isPaidActive={false} />,
    );

    await waitFor(() => {
      expect(storageLocal.set).toHaveBeenCalledWith({
        [MCP_BRIDGE_STORAGE_KEYS.enabled]: false,
      });
    });

    expect(screen.getByText('Allow MCP bridge').closest('button')?.textContent).toContain(
      'Available with Account (Paid)',
    );
  });

  it('allows toggle when mode is Account Paid', async () => {
    storageLocal.get.mockResolvedValue({
      [MCP_BRIDGE_STORAGE_KEYS.enabled]: false,
      [MCP_BRIDGE_STORAGE_KEYS.token]: '',
      [MCP_BRIDGE_STORAGE_KEYS.connectionState]: 'disconnected',
    });

    render(
      <McpBridgeSettings isAuthenticated currentMode="pro_xai" isPaidActive />,
    );

    await waitFor(() => {
      expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('false');
    });

    screen.getByRole('switch').click();

    await waitFor(() => {
      expect(storageLocal.set).toHaveBeenCalledWith({
        [MCP_BRIDGE_STORAGE_KEYS.enabled]: true,
        [MCP_BRIDGE_STORAGE_KEYS.token]: '',
      });
    });
  });
});
