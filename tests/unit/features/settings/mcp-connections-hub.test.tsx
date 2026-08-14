/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import { McpConnectionsHub } from '@/features/settings/components/McpConnectionsHub';

describe('McpConnectionsHub', () => {
  const base = {
    status: 'ready' as const,
    remoteUrl: 'https://underscore-mcp.example/mcp',
    connectedApps: [] as const,
    onDismissLockMessage: vi.fn(),
    onLockedInteract: vi.fn(),
    onCopyUrl: vi.fn(),
    onAddApp: vi.fn(),
    onOpenActive: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows locked upsell for Guest and routes Add an AI app to CTA', () => {
    render(
      <McpConnectionsHub
        {...base}
        mcpAllowed={false}
        isAuthenticated={false}
        status="off"
      />,
    );

    expect(screen.getByText('Included with Account (Paid)')).toBeTruthy();
    expect(screen.getByText('Sign in to continue')).toBeTruthy();
    expect(screen.getByText('Connections unlock with Account (Paid).')).toBeTruthy();
    expect(screen.queryByText('Models & providers')).toBeNull();
    expect(screen.queryByTestId('mcp-server-details')).toBeNull();

    screen.getByRole('button', { name: 'Add an AI app' }).click();
    expect(base.onLockedInteract).toHaveBeenCalled();
    expect(base.onAddApp).not.toHaveBeenCalled();
  });

  it('shows Free upgrade CTA when signed in but locked', () => {
    render(
      <McpConnectionsHub
        {...base}
        mcpAllowed={false}
        isAuthenticated
        status="off"
      />,
    );
    expect(screen.getByText('Upgrade in Settings')).toBeTruthy();
  });

  it('allows Add an AI app when Paid and has no Models footer or bridge toggle', () => {
    render(
      <McpConnectionsHub
        {...base}
        mcpAllowed
        isAuthenticated
      />,
    );

    expect(screen.queryByText('Models & providers')).toBeNull();
    expect(screen.getByText(/oauth happens in your agent/i)).toBeTruthy();
    expect(screen.getByTestId('mcp-integrations-status').textContent).toBe('Ready');
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Connect' })).toBeNull();

    screen.getByRole('button', { name: 'Add an AI app' }).click();
    expect(base.onAddApp).toHaveBeenCalled();
  });

  it('does not list Connected apps from a copied snippet', () => {
    render(
      <McpConnectionsHub
        {...base}
        mcpAllowed
        isAuthenticated
        connectedApps={[]}
      />,
    );
    expect(screen.getByTestId('mcp-integrations-status').textContent).toBe('Ready');
    expect(screen.getByText(/nothing connected yet/i)).toBeTruthy();
    expect(screen.queryByText(/copied the snippet/i)).toBeNull();
  });

  it('exposes Copy URL under Server details, not a primary Connect', () => {
    render(
      <McpConnectionsHub
        {...base}
        mcpAllowed
        isAuthenticated
      />,
    );

    expect(screen.queryByRole('button', { name: 'Connect' })).toBeNull();
    expect(screen.getByTestId('mcp-server-details')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Copy URL' })).toBeTruthy();
    expect(screen.getByText(/Authorization: Bearer/i)).toBeTruthy();
    const hub = screen.getByTestId('mcp-connections-hub').textContent ?? '';
    expect(hub).not.toMatch(/get_session/i);
    expect(hub).not.toMatch(/copied the snippet/i);

    screen.getByRole('button', { name: 'Copy URL' }).click();
    expect(base.onCopyUrl).toHaveBeenCalled();
  });

  it('keeps Add an AI app when already Connected', () => {
    render(
      <McpConnectionsHub
        {...base}
        mcpAllowed
        isAuthenticated
        status="connected"
        connectedApps={[{ id: 'c1', title: 'ChatGPT', sub: 'openid' }]}
      />,
    );
    expect(screen.getByTestId('mcp-integrations-status').textContent).toBe('Connected');
    expect(screen.getAllByText('ChatGPT').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Add an AI app' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Connect' })).toBeNull();
  });

  it('says the agent reached Cloud MCP when Connected with no grants', () => {
    render(
      <McpConnectionsHub
        {...base}
        mcpAllowed
        isAuthenticated
        status="connected"
        connectedApps={[]}
      />,
    );
    expect(screen.getByText(/your agent reached cloud mcp/i)).toBeTruthy();
    expect(screen.queryByText(/approved oauth client/i)).toBeNull();
  });
});
