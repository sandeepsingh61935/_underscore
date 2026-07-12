import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { McpTierCallout, mcpTierLabel } from '@/features/settings/components/McpTierCallout';

describe('mcpTierLabel', () => {
  it('shows local only for guests', () => {
    expect(mcpTierLabel(false, 'basic')).toBe('Guest · Local only');
  });

  it('shows pro branding when signed in', () => {
    expect(mcpTierLabel(true, 'pro')).toBe('Pro · Synced');
  });
});

describe('McpTierCallout', () => {
  it('shows sign-in upsell for guests', () => {
    render(<McpTierCallout isAuthenticated={false} currentMode="basic" onSignIn={vi.fn()} />);
    expect(screen.getByText('Sign in for full MCP')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign in to Pro' })).toBeTruthy();
  });

  it('renders nothing extra for pro without xai', () => {
    const { container } = render(<McpTierCallout isAuthenticated={true} currentMode="pro" />);
    expect(container.firstChild).toBeNull();
  });
});
