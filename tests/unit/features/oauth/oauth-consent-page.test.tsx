/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const getAuthorizationDetails = vi.fn();
const approveAuthorization = vi.fn();
const denyAuthorization = vi.fn();

vi.mock('@/shared/auth/supabase-web-client', () => ({
  getWebSupabaseClient: () => ({
    auth: {
      oauth: {
        getAuthorizationDetails,
        approveAuthorization,
        denyAuthorization,
      },
    },
  }),
}));

vi.mock('@/features/auth/providers/WebAuthProvider', () => ({
  useWebAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
    user: {
      id: 'u1',
      email: 'reader@example.com',
      displayName: 'Reader',
      provider: 'email',
    },
  }),
}));

vi.mock('@/ui-system/components/primitives/Logo', () => ({
  Logo: () => <div data-testid="logo">_underscore</div>,
}));

import { OAuthConsentPage } from '@/features/oauth/views/OAuthConsentPage';

describe('OAuthConsentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthorizationDetails.mockResolvedValue({
      data: {
        authorization_id: 'auth-1',
        client: { name: 'Grok' },
        redirect_uri: 'http://127.0.0.1:39613/callback',
        scope: 'openid email offline_access highlights:read',
      },
      error: null,
    });
  });

  it('shows account, agent, plain permissions, and Allow access', async () => {
    render(
      <MemoryRouter initialEntries={['/oauth/consent?authorization_id=auth-1']}>
        <OAuthConsentPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByTestId('oauth-consent-ready')).toBeTruthy());

    expect(screen.getByText(/allow grok to access your library/i)).toBeTruthy();
    expect(screen.getByText('Your account')).toBeTruthy();
    expect(screen.getByText('Reader')).toBeTruthy();
    expect(screen.getByText('reader@example.com')).toBeTruthy();
    expect(screen.getByText('Requesting access')).toBeTruthy();
    expect(screen.getByText(/returns to 127\.0\.0\.1:39613/i)).toBeTruthy();
    expect(screen.getByText(/read your synced pro highlight library/i)).toBeTruthy();
    expect(screen.getByText(/stay connected until you revoke access/i)).toBeTruthy();
    expect(screen.queryByText('offline_access')).toBeNull();
    expect(screen.getByRole('button', { name: 'Allow access' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Deny' })).toBeTruthy();
    expect(screen.getByText(/never shared/i)).toBeTruthy();
  });
});
