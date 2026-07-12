import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { McpTierCallout, mcpTierLabel } from '@/features/settings/components/McpTierCallout';

describe('mcpTierLabel', () => {
  it('shows local only for guests', () => {
    expect(mcpTierLabel(false, 'basic')).toBe('Basic · Local only');
  });

  it('shows pro branding when signed in', () => {
    expect(mcpTierLabel(true, 'pro')).toBe('Pro · Synced');
  });
});

describe('McpTierCallout', () => {
  it('shows compact sign-in row for guests', () => {
    render(<McpTierCallout isAuthenticated={false} currentMode="basic" onSignIn={vi.fn()} />);
    expect(screen.getByText('Pro sync and cloud MCP')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Pro sync and cloud MCP/i })).toBeTruthy();
  });

  it('renders nothing extra for pro without xai', () => {
    const { container } = render(<McpTierCallout isAuthenticated={true} currentMode="pro" />);
    expect(container.firstChild).toBeNull();
  });

  it('shows ai bridge hint for pro_xai', () => {
    render(<McpTierCallout isAuthenticated={true} currentMode="pro_xai" />);
    expect(screen.getByText('AI tools via bridge')).toBeTruthy();
  });
});
