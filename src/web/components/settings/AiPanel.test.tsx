/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AiPanel } from './AiPanel';
import type { WebCaps } from '@/web/caps/resolveWebCaps';

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

const FREE_WINDOW: WebCaps = {
  flags: { sync: true, export: true, ai: false, mcp: true },
  planLabel: 'Free',
  isGuest: false,
  isPastDue: false,
  isPaidActive: false,
  freeWindow: true,
};

const GUEST: WebCaps = {
  flags: { sync: false, export: false, ai: false, mcp: false },
  planLabel: 'Guest',
  isGuest: true,
  isPastDue: false,
  isPaidActive: false,
  freeWindow: true,
};

function renderAi(caps: WebCaps, isAuthenticated: boolean): void {
  render(
    <MemoryRouter>
      <AiPanel
        caps={caps}
        isAuthenticated={isAuthenticated}
        userId={isAuthenticated ? 'user-1' : null}
      />
    </MemoryRouter>
  );
}

describe('AiPanel Integrations-only', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows Integrations heading and early-access for free-window signed-in', () => {
    renderAi(FREE_WINDOW, true);
    expect(document.querySelector('[data-od-id="settings-ai"]')?.textContent).toMatch(
      /Integrations/i
    );
    expect(document.querySelector('[data-od-id="ai-early-access-banner"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="ai-seg-models"]')).toBeNull();
    expect(document.querySelector('[data-od-id="provider-openai"]')).toBeNull();
  });

  it('guest sees sign-in lock, not Models', () => {
    renderAi(GUEST, false);
    expect(document.querySelector('[data-od-id="ai-lock-banner"]')).toBeTruthy();
    expect(
      document.querySelector('[data-od-id="settings-ai-see-plan"]')?.textContent
    ).toMatch(/Sign in/i);
    expect(document.querySelector('[data-od-id="ai-seg-models"]')).toBeNull();
  });

  it('Integrations copy never mentions Ollama, BYOK, or Save & check', () => {
    renderAi(FREE_WINDOW, true);
    const root = document.querySelector('[data-od-id="settings-ai"]');
    expect(root?.textContent ?? '').not.toMatch(/Ollama|BYOK|Save & check/i);
  });
});
