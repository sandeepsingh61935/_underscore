/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AiPanel } from './AiPanel';
import type { WebCaps } from '@/web/caps/resolveWebCaps';
import { getDefaultModelId, getProviderModels } from '@/shared/llm/provider-models';

vi.mock('@/shared/auth/supabase-web-client', () => ({
  getWebSupabaseClient: () => ({
    auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) },
  }),
}));

vi.mock('@/web/lib/syncWebAiPreferences', () => ({
  pullWebAiPreferences: vi.fn(async () => ({ state: { providers: {} }, source: 'local' })),
  pushWebAiPreferences: vi.fn(async (_s: unknown, _u: string, next: unknown) => ({ state: next })),
}));

vi.mock('@/shared/llm/model-discovery', () => ({
  fetchProviderModels: vi.fn(async () => ({ models: [] })),
}));

vi.mock('@/features/oauth/hooks/useOAuthGrants', () => ({
  useOAuthGrants: () => ({
    grants: [],
    isLoading: false,
    error: null,
    reload: vi.fn(),
    revoke: vi.fn(),
    isRevoking: false,
  }),
}));

const PAID: WebCaps = {
  flags: { sync: true, export: true, ai: true, mcp: true },
  planLabel: 'Paid',
  isGuest: false,
  isPastDue: false,
  isPaidActive: true,
};

const GUEST: WebCaps = {
  flags: { sync: false, export: false, ai: false, mcp: false },
  planLabel: 'Guest',
  isGuest: true,
  isPastDue: false,
  isPaidActive: false,
};

function renderAi(caps: WebCaps, isAuthenticated: boolean): void {
  render(
    <MemoryRouter>
      <AiPanel
        caps={caps}
        isAuthenticated={isAuthenticated}
        userId={isAuthenticated ? 'user-1' : null}
      />
    </MemoryRouter>,
  );
}

describe('AiPanel Models polish', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('opens provider setup with a full catalog picker, not a free-text-only model field', () => {
    renderAi(PAID, true);

    fireEvent.click(document.querySelector('[data-od-id="provider-openai-action"]')!);

    const picker = document.querySelector('[data-od-id="provider-model"]');
    expect(picker).toBeTruthy();
    expect(picker?.tagName).toBe('SELECT');
    const ids = Array.from(picker!.querySelectorAll('option')).map((o) => o.getAttribute('value'));
    expect(ids).toContain(getDefaultModelId('openai'));
    expect(ids.length).toBeGreaterThan(getProviderModels('openai').length);
    expect(ids).toContain('__custom__');
  });

  it('derives Custom from the model id instead of a separate flag', () => {
    localStorage.setItem(
      'underscore.web.llm',
      JSON.stringify({
        providers: {
          openai: { apiKey: 'sk-test', model: 'my-finetune', checkedAt: 1 },
        },
        defaultProvider: 'openai',
      }),
    );
    renderAi(PAID, true);
    fireEvent.click(document.querySelector('[data-od-id="provider-openai-action"]')!);
    const picker = document.querySelector('[data-od-id="provider-model"]') as HTMLSelectElement;
    expect(picker.value).toBe('__custom__');
    expect((document.querySelector('[data-od-id="provider-model-custom"]') as HTMLInputElement).value)
      .toBe('my-finetune');
  });

  it('Models tab copy never mentions MCP, OAuth, JWT, or Connect agent', () => {
    renderAi(PAID, true);
    const models = document.querySelector('[data-od-id="settings-configure-ai"]');
    expect(models).toBeTruthy();
    expect(models?.textContent ?? '').not.toMatch(/MCP|OAuth|JWT|Connect agent|remote URL/i);
    expect(models?.textContent ?? '').toMatch(/this device/i);
  });

  it('Integrations tab copy never mentions API keys, Ollama, or BYOK', () => {
    renderAi(PAID, true);
    fireEvent.click(document.querySelector('[data-od-id="ai-seg-integrations"]')!);
    const integrations = document.querySelector('[data-od-id="settings-connect-ai"]');
    expect(integrations).toBeTruthy();
    expect(integrations?.textContent ?? '').not.toMatch(/API key|Ollama|BYOK|Save & check/i);
  });

  it('guest Models shows sign-in and no provider setup action', () => {
    renderAi(GUEST, false);
    expect(document.querySelector('[data-od-id="models-signin-banner"]')).toBeTruthy();
    const actions = document.querySelectorAll('[data-od-id^="provider-"][data-od-id$="-action"]');
    expect(actions.length).toBe(0);
  });
});
