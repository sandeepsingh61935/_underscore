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

  it('shows locked upsell for Guest and routes Host tips to CTA', () => {
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

    screen.getByRole('button', { name: 'Host tips' }).click();
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

  it('allows Host tips when Paid and has no Models footer or bridge toggle', () => {
    render(
      <McpConnectionsHub
        {...base}
        mcpAllowed
        isAuthenticated
      />,
    );

    expect(screen.queryByText('Models & providers')).toBeNull();
    expect(screen.getByText(/synced cloud library/)).toBeTruthy();
    expect(screen.getByTestId('mcp-integrations-status').textContent).toBe('Ready');
    expect(screen.queryByRole('switch')).toBeNull();

    screen.getByRole('button', { name: 'Host tips' }).click();
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
    expect(screen.getAllByText(/not “I copied the snippet”/).length).toBeGreaterThan(0);
    expect(screen.getByTestId('mcp-integrations-status').textContent).toBe('Ready');
  });
});
