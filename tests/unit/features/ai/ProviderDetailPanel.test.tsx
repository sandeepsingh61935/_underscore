/**
 * @vitest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ProviderDetailPanel } from '@/features/ai/components/ProviderDetailPanel';
import { MessageBusProvider } from '@/shared/contexts/MessageBusContext';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import {
  IPC_AI_GET_API_KEY_STATUS,
  IPC_AI_HEALTH_CHECK,
  IPC_AI_LIST_PROVIDER_MODELS,
  IPC_AI_SET_API_KEY,
} from '@/shared/schemas/message-schemas';

vi.mock('@/shared/llm/check-provider-health', () => ({
  checkProviderHealthInBrowser: vi.fn(),
}));

import { checkProviderHealthInBrowser } from '@/shared/llm/check-provider-health';

/** OpenRouter's public catalog shape — mocked at the network boundary to avoid
 * racing the dynamic-import mock for the openrouter-models module. */
const OPENROUTER_CATALOG_RESPONSE = {
  data: [
    { id: 'free-a', name: 'Free A', pricing: { prompt: '0', completion: '0' } },
    { id: 'free-c', name: 'Free C', pricing: { prompt: '0', completion: '0' } },
    { id: 'paid-b', name: 'Paid B', pricing: { prompt: '0.001', completion: '0.002' } },
  ],
};

function makeBus(handlers: Record<string, (payload: unknown) => unknown>): IMessageBus {
  return {
    send: vi.fn(async (_target, message: { type: string; payload: unknown }) => {
      const handler = handlers[message.type];
      if (!handler) return { success: false, error: `no handler for ${message.type}` };
      return handler(message.payload);
    }) as IMessageBus['send'],
    subscribe: vi.fn(() => () => undefined),
    publish: vi.fn(async () => undefined),
  };
}

function wrap(bus: IMessageBus): ({ children }: { children: ReactNode }) => React.ReactElement {
  return ({ children }: { children: ReactNode }) =>
    React.createElement(MessageBusProvider, { messageBus: bus, children });
}

describe('ProviderDetailPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('chrome', {
      runtime: { id: 'test-extension', sendMessage: vi.fn() },
      storage: { local: { get: vi.fn(async () => ({})), set: vi.fn(async () => undefined) } },
    });
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => OPENROUTER_CATALOG_RESPONSE,
    })));
  });

  it('blocks selecting any OpenRouter model until the API key is verified (free included)', async () => {
    const bus = makeBus({
      [IPC_AI_GET_API_KEY_STATUS]: () => ({ success: true, data: { configured: false, model: 'free-a' } }),
    });

    render(<ProviderDetailPanel provider="openrouter" onBack={vi.fn()} onSaved={vi.fn()} />, { wrapper: wrap(bus) });

    await screen.findByText('Free A');
    // Free rows are listed for browsing but locked until a key is verified.
    expect(screen.getByText('Free A').closest('button')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Use this model' })).toBeDisabled();
    expect(screen.getByText('Verify key first')).toBeInTheDocument();

    fireEvent.click(screen.getByText('All'));
    await screen.findByText('Paid B');
    expect(screen.getByText('Paid B').closest('button')).toBeDisabled();
  });

  it('unlocks model selection and save once Ollama connects', async () => {
    vi.mocked(checkProviderHealthInBrowser).mockResolvedValue({ ok: true, model: 'llama3.2' });

    const bus = makeBus({
      [IPC_AI_GET_API_KEY_STATUS]: () => ({
        success: true,
        data: { configured: false, model: 'llama3.2', apiBase: 'http://localhost:11434' },
      }),
      [IPC_AI_LIST_PROVIDER_MODELS]: () => ({
        success: true,
        data: { models: [{ id: 'llama3.2', label: 'llama3.2' }] },
      }),
    });

    render(<ProviderDetailPanel provider="ollama" onBack={vi.fn()} onSaved={vi.fn()} />, { wrapper: wrap(bus) });

    await screen.findByRole('button', { name: /llama3\.2/ });
    expect(screen.getByRole('button', { name: 'Use this model' })).toBeDisabled();
    expect(screen.getByText('Connect first')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Connect' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Use this model' })).not.toBeDisabled();
    });
    expect(screen.queryByText('Connect first')).not.toBeInTheDocument();
  });

  it('keeps a newly selected free model instead of snapping back to the saved status model', async () => {
    const bus = makeBus({
      [IPC_AI_GET_API_KEY_STATUS]: () => ({ success: true, data: { configured: true, model: 'free-a' } }),
    });

    render(<ProviderDetailPanel provider="openrouter" onBack={vi.fn()} onSaved={vi.fn()} />, { wrapper: wrap(bus) });

    await screen.findByText(/Connected/);
    await screen.findByText('Free A');
    expect(screen.getByText('Free A').closest('button')).toHaveTextContent('●');

    fireEvent.click(screen.getByText('Free C'));

    await waitFor(() => {
      expect(screen.getByText('Free C').closest('button')).toHaveTextContent('●');
    });
    expect(screen.getByText('Free A').closest('button')).toHaveTextContent('○');
  });

  it('reconciles the OpenRouter selection when the filter no longer includes it', async () => {
    const bus = makeBus({
      [IPC_AI_GET_API_KEY_STATUS]: () => ({ success: true, data: { configured: true, model: 'free-a' } }),
    });

    render(<ProviderDetailPanel provider="openrouter" onBack={vi.fn()} onSaved={vi.fn()} />, { wrapper: wrap(bus) });

    // Wait for the already-configured status to settle before interacting —
    // otherwise the mount-reset effect can stomp a filter click made too early.
    await screen.findByText(/Connected/);
    fireEvent.click(screen.getByText('All'));
    fireEvent.click(await screen.findByText('Paid B'));
    await waitFor(() => {
      expect(screen.getByText('Paid B').closest('button')).toHaveTextContent('●');
    });
    expect(screen.getByRole('button', { name: 'Use this model' })).not.toBeDisabled();

    // Switching back to Free hides Paid B — the stale selection must reconcile, not silently block save.
    fireEvent.click(screen.getByText('Free'));

    await waitFor(() => {
      expect(screen.queryByText('Paid B')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Use this model' })).not.toBeDisabled();
  });

  it('shows a brief confirmation before returning to the hub on save', async () => {
    vi.mocked(checkProviderHealthInBrowser).mockResolvedValue({ ok: true, model: 'llama3.2' });
    const onSaved = vi.fn();

    const bus = makeBus({
      [IPC_AI_GET_API_KEY_STATUS]: () => ({
        success: true,
        data: { configured: true, model: 'llama3.2', apiBase: 'http://localhost:11434' },
      }),
      [IPC_AI_LIST_PROVIDER_MODELS]: () => ({
        success: true,
        data: { models: [{ id: 'llama3.2', label: 'llama3.2' }] },
      }),
      [IPC_AI_SET_API_KEY]: () => ({ success: true, data: { ok: true } }),
      [IPC_AI_HEALTH_CHECK]: () => ({ success: true, data: { ok: true, model: 'llama3.2' } }),
    });

    render(<ProviderDetailPanel provider="ollama" onBack={vi.fn()} onSaved={onSaved} />, { wrapper: wrap(bus) });

    await screen.findByRole('button', { name: /llama3\.2/ });
    fireEvent.click(await screen.findByRole('button', { name: 'Use this model' }));

    await screen.findByText('Active model updated');
    expect(onSaved).not.toHaveBeenCalled();

    await waitFor(() => expect(onSaved).toHaveBeenCalled(), { timeout: 2000 });
  });
});
