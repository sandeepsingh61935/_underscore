import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import {
  McpTierCallout,
  mcpTierLabel,
} from '@/features/settings/components/McpTierCallout';

describe('mcpTierLabel', () => {
  it('shows local only for guests', () => {
    expect(mcpTierLabel(false, 'basic')).toBe('Guest · Local only');
  });

  it('shows account branding when signed in', () => {
    expect(mcpTierLabel(true, 'pro')).toBe('Account (Free) · Synced');
    expect(mcpTierLabel(true, 'pro_xai')).toBe('Account (Paid) · Synced + AI');
  });
});

describe('McpTierCallout', () => {
  it('shows compact sign-in row for guests', () => {
    render(
      <McpTierCallout isAuthenticated={false} currentMode="basic" onSignIn={vi.fn()} />
    );
    expect(screen.getByText('Account sync and Integrations')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /Account sync and Integrations/i })
    ).toBeTruthy();
  });

  it('shows Account (Paid) upsell for Free accounts', () => {
    render(<McpTierCallout isAuthenticated={true} currentMode="pro" />);
    expect(screen.getByText('Integrations')).toBeTruthy();
    expect(screen.getByText(/Available with Account \(Paid\)/)).toBeTruthy();
  });

  it('shows ai bridge hint for Account (Paid)', () => {
    render(<McpTierCallout isAuthenticated={true} currentMode="pro_xai" />);
    expect(screen.getByText('AI tools via bridge')).toBeTruthy();
  });
});
