import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { McpBridgeSetupGuide } from '@/features/settings/components/McpBridgeSetupGuide';

describe('McpBridgeSetupGuide', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it('starts collapsed when bridge is disabled', () => {
    render(
      <McpBridgeSetupGuide
        enabled={false}
        token=""
        connectionState="disconnected"
        isAuthenticated={false}
      />,
    );
    expect(screen.queryByText('Build the MCP server')).toBeNull();
  });

  it('auto-expands when enabled without a token', () => {
    render(
      <McpBridgeSetupGuide
        enabled={true}
        token=""
        connectionState="disconnected"
        isAuthenticated={false}
      />,
    );
    expect(screen.getByText('Build the MCP server')).toBeTruthy();
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('toggles setup steps on header click', () => {
    render(
      <McpBridgeSetupGuide
        enabled={false}
        token="abc"
        connectionState="connected"
        isAuthenticated={false}
      />,
    );

    const toggle = screen.getByRole('button', { name: /How to connect Cursor/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Restart Cursor MCP')).toBeTruthy();
  });
});
