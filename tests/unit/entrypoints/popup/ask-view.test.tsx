import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { AskView } from '@/entrypoints/popup/views/AskView';

vi.mock('@/core/context/PopupAppProvider', () => ({
  useApp: vi.fn(),
}));

vi.mock('@/ui-system/hooks/useCurrentTabContext', () => ({
  useCurrentTabContext: vi.fn(),
}));

vi.mock('@/features/collections/hooks/useDashboardData', () => ({
  useDashboardData: vi.fn(),
}));

vi.mock('@/features/collections/hooks/useHighlightsByDomainFactory', () => ({
  useHighlightsByDomain: vi.fn(),
}));

vi.mock('@/features/ai/hooks/useActiveLLMProvider', () => ({
  useActiveLLMProvider: vi.fn(),
}));

vi.mock('@/features/ai/hooks/usePageContext', () => ({
  usePageContext: vi.fn(),
}));

vi.mock('@/features/ai/hooks/useScopeQuery', () => ({
  useScopeQuery: vi.fn(),
}));

import { useApp } from '@/core/context/PopupAppProvider';
import { useActiveLLMProvider } from '@/features/ai/hooks/useActiveLLMProvider';
import { usePageContext } from '@/features/ai/hooks/usePageContext';
import { useScopeQuery } from '@/features/ai/hooks/useScopeQuery';
import { useDashboardData } from '@/features/collections/hooks/useDashboardData';
import { useHighlightsByDomain } from '@/features/collections/hooks/useHighlightsByDomainFactory';
import { useCurrentTabContext } from '@/ui-system/hooks/useCurrentTabContext';

function mockPaidHooks(opts?: { highlightCount?: number }): void {
  const count = opts?.highlightCount ?? 5;
  const highlights = Array.from({ length: count }, (_, i) => ({
    id: `h-${i}`,
    text: `Highlight ${i}`,
    url: 'https://developer.mozilla.org/en-US/docs/Web/CSS',
    path: '/en-US/docs/Web/CSS',
    domain: 'developer.mozilla.org',
    createdAt: new Date(),
  }));

  vi.mocked(useApp).mockReturnValue({
    currentMode: 'pro_xai',
    user: { id: 'u1', email: 'a@b.com' },
    isAuthenticated: true,
    dataProvider: {} as ReturnType<typeof useApp>['dataProvider'],
  } as ReturnType<typeof useApp>);

  vi.mocked(useCurrentTabContext).mockReturnValue({
    url: 'https://developer.mozilla.org/en-US/docs/Web/CSS',
    domain: 'developer.mozilla.org',
    path: '/en-US/docs/Web/CSS',
    title: 'CSS',
  });

  vi.mocked(useDashboardData).mockReturnValue({
    data: {
      totalHighlights: count,
      totalDomains: 1,
      thisWeekCount: count,
      recentHighlights: highlights,
    },
    isLoading: false,
    error: null,
  });

  vi.mocked(useHighlightsByDomain).mockReturnValue({
    highlights,
    isLoading: false,
    error: null,
  });

  vi.mocked(useActiveLLMProvider).mockReturnValue({
    provider: 'openai',
    refresh: vi.fn(),
  });

  vi.mocked(usePageContext).mockReturnValue({
    fetch: vi.fn().mockResolvedValue({ text: '', cacheNote: null, errorNote: null }),
  });

  vi.mocked(useScopeQuery).mockReturnValue({
    chunks: '',
    status: 'idle',
    error: null,
    ask: vi.fn().mockResolvedValue({ cacheNote: null, errorNote: null }),
    isPreparing: false,
    prepareError: null,
    abort: vi.fn(),
  } as unknown as ReturnType<typeof useScopeQuery>);
}

describe('AskView lock matrix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Guest: quiet lock + Sign in', () => {
    const onSignIn = vi.fn();
    render(<AskView lockReason="guest" onSignIn={onSignIn} />);

    expect(screen.getByTestId('ask-lock').getAttribute('data-lock')).toBe('guest');
    expect(screen.getByText('Sign in to use Ask')).toBeTruthy();
    expect(screen.getByText(/Answers use only highlights/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  it('Free: quiet lock + Upgrade', () => {
    const onUpgrade = vi.fn();
    render(<AskView lockReason="free" onUpgrade={onUpgrade} />);

    expect(screen.getByTestId('ask-lock').getAttribute('data-lock')).toBe('free');
    expect(screen.getByText('Ask needs Account (Paid)')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Upgrade' }));
    expect(onUpgrade).toHaveBeenCalledTimes(1);
  });

  it('Past due: Update payment', () => {
    const onUpdatePayment = vi.fn();
    render(<AskView lockReason="past_due" onUpdatePayment={onUpdatePayment} />);

    expect(screen.getByTestId('ask-lock').getAttribute('data-lock')).toBe('past_due');
    expect(screen.getByText('Payment past due')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Update payment' }));
    expect(onUpdatePayment).toHaveBeenCalledTimes(1);
  });

  it('No model: Connect to AI', () => {
    const onConnectAi = vi.fn();
    render(<AskView lockReason="no_model" onConnectAi={onConnectAi} />);

    expect(screen.getByTestId('ask-lock').getAttribute('data-lock')).toBe('no_model');
    expect(screen.getByText('No model selected')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Connect to AI' }));
    expect(onConnectAi).toHaveBeenCalledTimes(1);
  });

  it('Paid empty: scope chips, breadcrumb, suggestions, grounding footer', () => {
    mockPaidHooks({ highlightCount: 5 });
    render(<AskView lockReason={null} />);

    expect(screen.getByTestId('ask-paid-shell')).toBeTruthy();
    expect(screen.getByTestId('ask-scope-page')).toBeTruthy();
    expect(screen.getByTestId('ask-scope-domain')).toBeTruthy();
    expect(screen.getByTestId('ask-scope-library')).toBeTruthy();
    expect(screen.getByTestId('ask-breadcrumb').textContent).toMatch(/developer\.mozilla\.org/);
    expect(screen.getByTestId('ask-empty-suggestions')).toBeTruthy();
    expect(screen.getByText('5 highlights in this scope')).toBeTruthy();
    expect(screen.getByText('Questions search these notes only.')).toBeTruthy();
    expect(screen.getByTestId('ask-suggestion-Summarize')).toBeTruthy();
    expect(screen.getByTestId('ask-suggestion-List tags')).toBeTruthy();
    expect(screen.getByTestId('ask-suggestion-Key themes')).toBeTruthy();
    expect(screen.getByTestId('ask-ground').textContent).toMatch(/Scope: page · 5 highlights/);
    expect(screen.getByTestId('ask-composer-input')).toBeTruthy();
  });

  it('Paid: switching scope updates ground footer label', () => {
    mockPaidHooks({ highlightCount: 5 });
    render(<AskView lockReason={null} />);

    fireEvent.click(screen.getByTestId('ask-scope-domain'));
    expect(screen.getByTestId('ask-ground').textContent).toMatch(/Scope: domain/);
    expect(screen.getByTestId('ask-breadcrumb').textContent).toBe('developer.mozilla.org');

    fireEvent.click(screen.getByTestId('ask-scope-library'));
    expect(screen.getByTestId('ask-ground').textContent).toMatch(/Scope: library/);
    expect(screen.getByTestId('ask-breadcrumb').textContent).toBe('Library');
  });
});
