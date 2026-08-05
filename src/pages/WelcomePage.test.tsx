import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

vi.mock('@/core/context/AppProvider', () => ({
  useApp: () => ({ isAuthenticated: false }),
}));

import { WelcomePage } from './WelcomePage';

function wrap(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('WelcomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses welcome--web when no onStartClick (SPA)', () => {
    wrap(<WelcomePage />);
    const root = document.querySelector('[data-od-id="welcome"]');
    expect(root).toBeTruthy();
    expect(root?.classList.contains('welcome--web')).toBe(true);
    expect(root?.classList.contains('welcome--popup')).toBe(false);
    expect(root?.getAttribute('data-platform')).toBe('web');
    expect(screen.getByRole('heading', { name: /underscore/i })).toBeTruthy();
  });

  it('uses welcome--popup when onStartClick is provided', () => {
    wrap(<WelcomePage onStartClick={() => undefined} />);
    const root = document.querySelector('[data-od-id="welcome"]');
    expect(root?.classList.contains('welcome--popup')).toBe(true);
    expect(root?.classList.contains('welcome--web')).toBe(false);
    expect(root?.getAttribute('data-platform')).toBe('popup');
  });
});
