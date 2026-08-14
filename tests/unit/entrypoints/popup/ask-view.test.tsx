import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

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

vi.mock('@/features/ai/hooks/useAskModelSelection', () => ({
  useAskModelSelection: vi.fn(),
}));

vi.mock('@/features/ai/hooks/usePageContext', () => ({
  usePageContext: vi.fn(),
}));

vi.mock('@/features/ai/hooks/useExtensionChat', () => ({
  useExtensionChat: vi.fn(),
}));

vi.mock('@/features/ai/hooks/useGroundedChatTurn', () => ({
  useGroundedChatTurn: vi.fn(),
}));

vi.mock('@/shared/llm/prepare-highlight-excerpts', () => ({
  prepareHighlightExcerpts: vi.fn().mockResolvedValue({
    excerpts: [
      {
        id: 'h0',
        url: 'https://example.com',
        highlightText: 'x',
        pageTitle: 't',
        excerpt: 'x',
      },
    ],
    cacheNote: null,
    errorNote: null,
  }),
}));

import { useApp } from '@/core/context/PopupAppProvider';
import { useActiveLLMProvider } from '@/features/ai/hooks/useActiveLLMProvider';
import { useAskModelSelection } from '@/features/ai/hooks/useAskModelSelection';
import { useExtensionChat } from '@/features/ai/hooks/useExtensionChat';
import { useGroundedChatTurn } from '@/features/ai/hooks/useGroundedChatTurn';
import { usePageContext } from '@/features/ai/hooks/usePageContext';
import { useDashboardData } from '@/features/collections/hooks/useDashboardData';
import { useHighlightsByDomain } from '@/features/collections/hooks/useHighlightsByDomainFactory';
import { useCurrentTabContext } from '@/ui-system/hooks/useCurrentTabContext';
import { prepareHighlightExcerpts } from '@/shared/llm/prepare-highlight-excerpts';

type TurnMock = {
  phase: 'idle' | 'running';
  busy: boolean;
  error: string | null;
  streamText: string;
  inflightAssistantId: string | null;
  clearError: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  abort: ReturnType<typeof vi.fn>;
};

function mockPaidHooks(opts?: {
  highlightCount?: number;
  totalHighlights?: number;
  turn?: Partial<TurnMock>;
  messages?: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    status: 'completed' | 'streaming' | 'failed' | 'cancelled';
  }>;
}): TurnMock {
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

  vi.mocked(useAskModelSelection).mockReturnValue({
    options: [
      {
        provider: 'openai',
        modelId: 'gpt-4o-mini',
        providerLabel: 'OpenAI',
        modelLabel: 'gpt-4o-mini',
        label: 'OpenAI · gpt-4o-mini',
      },
    ],
    activeProvider: 'openai',
    activeLabel: 'OpenAI · gpt-4o-mini',
    selectProvider: vi.fn().mockResolvedValue(true),
    selectError: null,
    clearSelectError: vi.fn(),
    refresh: vi.fn(),
    ready: true,
  });

  vi.mocked(usePageContext).mockReturnValue({
    fetch: vi.fn().mockResolvedValue({
      success: true,
      data: { highlightExcerpts: [], cacheMissUrls: [] },
    }),
  });

  vi.mocked(useExtensionChat).mockReturnValue({
    status: 'ready',
    error: null,
    threads: [],
    activeThreadId: null,
    messages: (opts?.messages ?? []).map((m) => ({
      ...m,
      threadId: 't1',
      userId: 'u1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })),
    service: {} as never,
    refreshThreads: vi.fn(),
    selectThread: vi.fn(),
    newThread: vi.fn(),
    deleteThread: vi.fn(),
    applyTurnStarted: vi.fn(),
    applyStreamText: vi.fn(),
    applyTurnFinished: vi.fn(),
  });

  const turn: TurnMock = {
    phase: 'idle',
    busy: false,
    error: null,
    streamText: '',
    inflightAssistantId: null,
    clearError: vi.fn(),
    send: vi.fn().mockResolvedValue(undefined),
    abort: vi.fn(),
    ...opts?.turn,
  };

  vi.mocked(useGroundedChatTurn).mockReturnValue(
    turn as unknown as ReturnType<typeof useGroundedChatTurn>,
  );

  return turn;
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

  it('No model: Models & providers', () => {
    const onConnectAi = vi.fn();
    render(<AskView lockReason="no_model" onConnectAi={onConnectAi} />);

    expect(screen.getByTestId('ask-lock').getAttribute('data-lock')).toBe('no_model');
    expect(screen.getByText('No model selected')).toBeTruthy();
    expect(
      screen.getByText('Add a provider key under Settings → Models & providers.'),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Models & providers' }));
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
    expect(screen.getByTestId('ask-model-chip')).toBeTruthy();
    expect(screen.getByTestId('ask-model-chip-trigger').textContent).toMatch(/OpenAI/);
  });

  it('Paid model chip: Manage calls onConnectAi', () => {
    mockPaidHooks({ highlightCount: 5 });
    const onConnectAi = vi.fn();
    render(<AskView lockReason={null} onConnectAi={onConnectAi} />);

    fireEvent.click(screen.getByTestId('ask-model-chip-trigger'));
    fireEvent.click(screen.getByTestId('ask-model-chip-manage'));
    expect(onConnectAi).toHaveBeenCalledTimes(1);
  });

  it('Paid: switching scope updates ground footer label and starts new thread', () => {
    mockPaidHooks({ highlightCount: 5 });
    render(<AskView lockReason={null} />);

    fireEvent.click(screen.getByTestId('ask-scope-domain'));
    expect(screen.getByTestId('ask-ground').textContent).toMatch(/Scope: domain/);
    expect(screen.getByTestId('ask-breadcrumb').textContent).toBe('developer.mozilla.org');
    const chatMocks = vi.mocked(useExtensionChat).mock.results;
    const lastChat = chatMocks[chatMocks.length - 1]?.value as {
      newThread: ReturnType<typeof vi.fn>;
    };
    expect(lastChat.newThread).toHaveBeenCalled();

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

  it('While turn busy, composer shows Stop (not empty suggestions)', () => {
    mockPaidHooks({
      highlightCount: 5,
      turn: { busy: true, phase: 'running' },
      messages: [
        {
          id: 'u1',
          role: 'user',
          content: 'Hi',
          status: 'completed',
        },
        {
          id: 'a1',
          role: 'assistant',
          content: '',
          status: 'streaming',
        },
      ],
    });
    render(<AskView lockReason={null} />);

    expect(screen.queryByTestId('ask-empty-suggestions')).toBeNull();
    expect(screen.getByTestId('ask-composer-send').getAttribute('aria-label')).toBe(
      'Stop',
    );
  });

  it('Suggestion chips disabled when no usable highlights', () => {
    mockPaidHooks({ highlightCount: 0 });
    render(<AskView lockReason={null} />);

    expect(
      (screen.getByTestId('ask-suggestion-Summarize') as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('Submit prepares excerpts and sends grounded turn with section scope', async () => {
    const turn = mockPaidHooks({ highlightCount: 5 });
    render(<AskView lockReason={null} />);

    fireEvent.change(screen.getByTestId('ask-composer-input'), {
      target: { value: 'Summarize' },
    });
    fireEvent.submit(screen.getByTestId('ask-composer-input').closest('form')!);

    await waitFor(() => {
      expect(prepareHighlightExcerpts).toHaveBeenCalled();
      expect(turn.send).toHaveBeenCalled();
    });

    const sendArg = turn.send.mock.calls[0]?.[0] as {
      question: string;
      scope: { kind: string; domain?: string; sectionKey?: string };
      provider: string;
    };
    expect(sendArg.question).toBe('Summarize');
    expect(sendArg.provider).toBe('openai');
    expect(sendArg.scope.kind).toBe('section');
    expect(sendArg.scope.domain).toBe('developer.mozilla.org');
  });

  it('Shows completed transcript messages from chat session', () => {
    mockPaidHooks({
      highlightCount: 5,
      messages: [
        {
          id: 'm1',
          role: 'user',
          content: 'What is CSS?',
          status: 'completed',
        },
        {
          id: 'm2',
          role: 'assistant',
          content: 'Cascading Style Sheets.',
          status: 'completed',
        },
      ],
    });
    render(<AskView lockReason={null} />);

    expect(screen.queryByTestId('ask-empty-suggestions')).toBeNull();
    expect(screen.getByText('What is CSS?')).toBeTruthy();
    expect(screen.getByText('Cascading Style Sheets.')).toBeTruthy();
  });

  it('Abort while busy calls turn.abort', async () => {
    const turn = mockPaidHooks({
      highlightCount: 5,
      turn: { busy: true, phase: 'running' },
      messages: [
        {
          id: 'u1',
          role: 'user',
          content: 'Hi',
          status: 'completed',
        },
        {
          id: 'a1',
          role: 'assistant',
          content: '…',
          status: 'streaming',
        },
      ],
    });
    render(<AskView lockReason={null} />);

    fireEvent.click(screen.getByTestId('ask-composer-send'));
    expect(turn.abort).toHaveBeenCalled();
  });
});
