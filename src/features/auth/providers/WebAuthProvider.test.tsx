import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';

import { WebAuthProvider, useWebAuth } from './WebAuthProvider';

const getSession = vi.fn();
const onAuthStateChange = vi.fn();
const signOut = vi.fn();
const unsubscribe = vi.fn();

vi.mock('@/shared/auth/supabase-web-client', () => ({
  getWebSupabaseClient: () => ({
    auth: {
      getSession,
      onAuthStateChange,
      signOut,
    },
  }),
}));

vi.mock('@/shared/auth/session-bridge', () => ({
  syncSessionToExtension: vi.fn().mockResolvedValue(undefined),
  clearExtensionSession: vi.fn().mockResolvedValue(undefined),
}));

function StatusProbe(): React.ReactElement {
  const { status, isAuthenticated, isLoading } = useWebAuth();
  return (
    <div
      data-od-id="probe"
      data-status={status}
      data-auth={String(isAuthenticated)}
      data-loading={String(isLoading)}
    />
  );
}

describe('WebAuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe } },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts loading then becomes authenticated when session exists', async () => {
    getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'a',
          refresh_token: 'r',
          user: { id: 'u1', email: 'a@b.co', user_metadata: {}, app_metadata: {} },
        },
      },
      error: null,
    });

    render(
      <WebAuthProvider>
        <StatusProbe />
      </WebAuthProvider>,
    );

    const el = () => document.querySelector('[data-od-id="probe"]') as HTMLElement;
    expect(el().getAttribute('data-status')).toBe('loading');

    await waitFor(() => {
      expect(el().getAttribute('data-status')).toBe('authenticated');
    });
    expect(el().getAttribute('data-auth')).toBe('true');
    expect(el().getAttribute('data-loading')).toBe('false');
  });

  it('becomes unauthenticated when session is null', async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null });

    render(
      <WebAuthProvider>
        <StatusProbe />
      </WebAuthProvider>,
    );

    await waitFor(() => {
      expect(document.querySelector('[data-od-id="probe"]')?.getAttribute('data-status')).toBe(
        'unauthenticated',
      );
    });
  });

  it('becomes unauthenticated when getSession errors', async () => {
    getSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'refresh_token_not_found', name: 'AuthApiError' },
    });

    render(
      <WebAuthProvider>
        <StatusProbe />
      </WebAuthProvider>,
    );

    await waitFor(() => {
      expect(document.querySelector('[data-od-id="probe"]')?.getAttribute('data-status')).toBe(
        'unauthenticated',
      );
    });
  });
});
