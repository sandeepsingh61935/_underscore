import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

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

type ScopeQueryMock = {
  chunks: string;
  status: 'idle' | 'streaming' | 'done' | 'error';
  error: string | null;
  ask: ReturnType<typeof vi.fn>;
  isPreparing: boolean;
  prepareError: string | null;
  abort: ReturnType<typeof vi.fn>;
};

function mockPaidHooks(opts?: {
  highlightCount?: number;
  totalHighlights?: number;
  scopeQuery?: Partial<ScopeQueryMock>;
}): ScopeQueryMock {
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
      totalHighlights: opts?.totalHighlights ?? count,
      totalDomains: 1,
      thisWeekCount: count,
      todayCount: 0,
      withNotesCount: 0,
      withTagsCount: 0,
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

  const scopeQuery: ScopeQueryMock = {
    chunks: '',
    status: 'idle',
    error: null,
    ask: vi.fn().mockResolvedValue({ cacheNote: null, errorNote: null }),
    isPreparing: false,
    prepareError: null,
    abort: vi.fn(),
    ...opts?.scopeQuery,
  };

  vi.mocked(useScopeQuery).mockReturnValue(
    scopeQuery as unknown as ReturnType<typeof useScopeQuery>,
  );

  return scopeQuery;
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
    expect(screen.getByTestId('ask-ground').textContent).toMatch(/Scope: library \(recent\)/);
    expect(screen.getByTestId('ask-breadcrumb').textContent).toBe('Library');
  });

  it('Library scope uses recent count, not full vault total', () => {
    mockPaidHooks({ highlightCount: 3, totalHighlights: 99 });
    render(<AskView lockReason={null} />);

    fireEvent.click(screen.getByTestId('ask-scope-library'));
    expect(screen.getByTestId('ask-ground').textContent).toMatch(
      /Scope: library \(recent\) · 3 highlights/,
    );
    expect(screen.getByText('3 highlights in this scope')).toBeTruthy();
  });

  it('Suggestion chips disabled when streaming/preparing (busy)', () => {
    mockPaidHooks({
      highlightCount: 5,
      scopeQuery: { isPreparing: true, status: 'idle' },
    });
    render(<AskView lockReason={null} />);

    expect(
      (screen.getByTestId('ask-suggestion-Summarize') as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByTestId('ask-suggestion-List tags') as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('Suggestion chips disabled when no usable highlights', () => {
    mockPaidHooks({ highlightCount: 0 });
    render(<AskView lockReason={null} />);

    expect(
      (screen.getByTestId('ask-suggestion-Summarize') as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('Keeps live assistant answer visible through stream done until finalize', async () => {
    const answer = 'Scoped summary of CSS highlights.';
    let resolveAsk: (() => void) | undefined;
    const askPromise = new Promise<void>((resolve) => {
      resolveAsk = resolve;
    });

    const scopeState: ScopeQueryMock = {
      chunks: '',
      status: 'idle',
      error: null,
      ask: vi.fn().mockImplementation(async () => {
        scopeState.status = 'streaming';
        scopeState.chunks = answer;
        await askPromise;
        scopeState.status = 'done';
        return { cacheNote: null, errorNote: null };
      }),
      isPreparing: false,
      prepareError: null,
      abort: vi.fn(),
    };

    mockPaidHooks({ highlightCount: 5, scopeQuery: scopeState });
    const { rerender } = render(<AskView lockReason={null} />);

    fireEvent.change(screen.getByTestId('ask-composer-input'), {
      target: { value: 'Summarize' },
    });
    fireEvent.submit(screen.getByTestId('ask-composer-input').closest('form')!);

    // Re-render while streaming so hook values (chunks/status) surface
    mockPaidHooks({ highlightCount: 5, scopeQuery: scopeState });
    rerender(<AskView lockReason={null} />);

    expect(screen.getByTestId('ask-streaming-turn')).toBeTruthy();
    expect(screen.getByText(answer)).toBeTruthy();

    // Transition to done before finalize effect clears streamUserContent — answer must stay visible
    scopeState.status = 'done';
    mockPaidHooks({ highlightCount: 5, scopeQuery: scopeState });
    rerender(<AskView lockReason={null} />);

    expect(screen.getByText(answer)).toBeTruthy();

    await act(async () => {
      resolveAsk?.();
    });

    await waitFor(() => {
      expect(screen.getByText(answer)).toBeTruthy();
    });
  });

  it('Finalizes stream error into thread without blanking the assistant turn', async () => {
    const partial = 'Partial answer before failure';
    let resolveAsk: (() => void) | undefined;

    const scopeState: ScopeQueryMock = {
      chunks: '',
      status: 'idle',
      error: null,
      ask: vi.fn().mockImplementation(async () => {
        scopeState.status = 'streaming';
        scopeState.chunks = partial;
        await new Promise<void>((r) => {
          resolveAsk = r;
        });
        scopeState.status = 'error';
        scopeState.error = 'rate limited';
        return { cacheNote: null, errorNote: null };
      }),
      isPreparing: false,
      prepareError: null,
      abort: vi.fn(),
    };

    mockPaidHooks({ highlightCount: 5, scopeQuery: scopeState });
    const { rerender } = render(<AskView lockReason={null} />);

    fireEvent.change(screen.getByTestId('ask-composer-input'), {
      target: { value: 'Key themes' },
    });
    fireEvent.submit(screen.getByTestId('ask-composer-input').closest('form')!);

    mockPaidHooks({ highlightCount: 5, scopeQuery: scopeState });
    rerender(<AskView lockReason={null} />);
    expect(screen.getByText(partial)).toBeTruthy();

    // Surface error status with chunks still present (live assistant must cover this gap)
    scopeState.status = 'error';
    scopeState.error = 'rate limited';
    mockPaidHooks({ highlightCount: 5, scopeQuery: scopeState });
    rerender(<AskView lockReason={null} />);

    // After finalize: failure turn is present (never a blank assistant gap)
    expect(screen.getByText(/Failed: rate limited/)).toBeTruthy();
    expect(screen.getByText('Key themes')).toBeTruthy();

    await act(async () => {
      resolveAsk?.();
    });
  });
});
