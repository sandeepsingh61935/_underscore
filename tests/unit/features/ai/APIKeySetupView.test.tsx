/**
 * @vitest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { APIKeySetupView } from '@/features/ai/views/APIKeySetupView';
import { MessageBusProvider } from '@/shared/contexts/MessageBusContext';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import {
  IPC_AI_GET_ACTIVE_PROVIDER,
  IPC_AI_GET_API_KEY_STATUS,
} from '@/shared/schemas/message-schemas';

function makeBus(): IMessageBus {
  return {
    send: vi.fn(
      async (_target, message: { type: string; payload: { provider?: string } }) => {
        if (message.type === IPC_AI_GET_ACTIVE_PROVIDER) {
          return { success: true, data: { provider: null } };
        }
        if (message.type === IPC_AI_GET_API_KEY_STATUS) {
          return {
            success: true,
            data: { configured: false, model: 'claude-sonnet-4-6' },
          };
        }
        return { success: false, error: `no handler for ${message.type}` };
      }
    ) as IMessageBus['send'],
    subscribe: vi.fn(() => () => undefined),
    publish: vi.fn(async () => undefined),
  };
}

function wrap(
  bus: IMessageBus
): ({ children }: { children: ReactNode }) => React.ReactElement {
  return ({ children }: { children: ReactNode }) =>
    React.createElement(MessageBusProvider, { messageBus: bus, children });
}

describe('APIKeySetupView', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', {
      runtime: { id: 'test-extension', sendMessage: vi.fn() },
      storage: {
        local: { get: vi.fn(async () => ({})), set: vi.fn(async () => undefined) },
      },
    });
  });

  it('opens a provider detail panel when a hub row is selected', async () => {
    render(<APIKeySetupView onClose={vi.fn()} />, { wrapper: wrap(makeBus()) });

    await screen.findByText('Providers');
    fireEvent.click(screen.getByRole('button', { name: /Anthropic/i }));

    await waitFor(() => {
      expect(screen.getByText('← Providers')).toBeInTheDocument();
    });
    expect(screen.getByText('Anthropic')).toBeInTheDocument();
    expect(screen.getByText('console.anthropic.com')).toBeInTheDocument();
  });

  it('returns to the hub from provider detail', async () => {
    render(<APIKeySetupView onClose={vi.fn()} />, { wrapper: wrap(makeBus()) });

    fireEvent.click(await screen.findByRole('button', { name: /OpenRouter/i }));
    fireEvent.click(await screen.findByText('← Providers'));

    await waitFor(() => {
      expect(screen.getByText('Providers')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Anthropic/i })).toBeInTheDocument();
  });
});
