/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import { McpConnectionsHub } from '@/features/settings/components/McpConnectionsHub';

describe('McpConnectionsHub', () => {
  const base = {
    bridgeEnabled: false,
    token: '',
    activeAppIds: [] as const,
    onDismissLockMessage: vi.fn(),
    onLockedInteract: vi.fn(),
    onToggleBridge: vi.fn(),
    onTokenChange: vi.fn(),
    onTokenBlur: vi.fn(),
    onCopyToken: vi.fn(),
    onAddApp: vi.fn(),
    onOpenActive: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows locked upsell for Guest and routes Add to CTA', () => {
    render(
      <McpConnectionsHub
        {...base}
        mcpAllowed={false}
        isAuthenticated={false}
      />,
    );

    expect(screen.getByText('Included with Account (Paid)')).toBeTruthy();
    expect(screen.getByText('Sign in to continue')).toBeTruthy();
    expect(screen.getByText('Connections unlock with Account (Paid).')).toBeTruthy();
    expect(screen.queryByText('Models & providers')).toBeNull();

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
      />,
    );
    expect(screen.getByText('Upgrade in Settings')).toBeTruthy();
  });

  it('allows Add and toggle when Paid and has no Configure footer', () => {
    render(
      <McpConnectionsHub
        {...base}
        mcpAllowed
        isAuthenticated
      />,
    );

    expect(screen.queryByText('Models & providers')).toBeNull();
    expect(screen.getByText('Use your highlights in the agent you already use')).toBeTruthy();
    expect(screen.queryByText('Integrations', { selector: '.u-serif' })).toBeNull();

    screen.getByRole('button', { name: 'Add an AI app' }).click();
    expect(base.onAddApp).toHaveBeenCalled();

    screen.getByRole('switch', { name: 'Let AI apps read highlights' }).click();
    expect(base.onToggleBridge).toHaveBeenCalled();
  });

  it('lists Active apps after Check connection', () => {
    render(
      <McpConnectionsHub
        {...base}
        mcpAllowed
        isAuthenticated
        activeAppIds={['cursor']}
      />,
    );
    expect(screen.getByText('Cursor')).toBeTruthy();
    expect(screen.getByText('Connected')).toBeTruthy();
  });
});
