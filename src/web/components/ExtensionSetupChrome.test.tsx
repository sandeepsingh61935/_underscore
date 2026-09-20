import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { DEFAULT_EXTENSION_NOTICE_PREFS } from '@/web/lib/extension-notice-prefs';
import { resolveExtensionNotice } from '@/web/lib/resolve-extension-notice';

import {
  ExtensionSetupRemnant,
  ExtensionSetupStrip,
} from './ExtensionSetupChrome';

function wrap(ui: React.ReactElement, initial = '/home') {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/home" element={ui} />
        <Route path="/install" element={<div data-od-id="install-ok">Install</div>} />
        <Route path="/sign-in" element={<div data-od-id="signin-ok">Sign in</div>} />
      </Routes>
    </MemoryRouter>
  );
}

const policy = {
  isMobileViewport: false,
  prefs: { ...DEFAULT_EXTENSION_NOTICE_PREFS },
};

describe('ExtensionSetupChrome', () => {
  it('signed-in missing strip: body + install + hide, no sign-in', () => {
    const onDismiss = vi.fn();
    const view = resolveExtensionNotice({
      ...policy,
      presence: 'missing',
      isAuthenticated: true,
    });
    expect(view.surface).toBe('strip');
    if (view.surface !== 'strip') return;
    wrap(<ExtensionSetupStrip view={view} from="/home" onDismiss={onDismiss} />);
    const root = document.querySelector('[data-od-id="ext-notice"]');
    expect(root?.getAttribute('data-kind')).toBe('missing-strip');
    expect(root?.textContent).toMatch(/Highlighting lives in the extension/i);
    const install = document.querySelector(
      '[data-od-id="ext-notice-install"]'
    ) as HTMLAnchorElement;
    expect(install).toBeTruthy();
    expect(install.getAttribute('href')).toBe('/install');
    expect(document.querySelector('[data-od-id="ext-notice-signin"]')).toBeNull();
    fireEvent.click(document.querySelector('[data-od-id="ext-notice-hide"]')!);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('guest missing strip includes sign-in', () => {
    const view = resolveExtensionNotice({
      ...policy,
      presence: 'missing',
      isAuthenticated: false,
    });
    expect(view.surface).toBe('strip');
    if (view.surface !== 'strip') return;
    wrap(
      <ExtensionSetupStrip
        view={view}
        from="/library"
        onDismiss={() => undefined}
      />
    );
    expect(document.querySelector('[data-od-id="ext-notice-signin"]')).toBeTruthy();
    expect(
      document.querySelector('[data-od-id="ext-notice"]')?.textContent
    ).toMatch(/or sign in/i);
  });

  it('remnant links to /install with accessible name', () => {
    const view = resolveExtensionNotice({
      ...policy,
      presence: 'missing',
      isAuthenticated: false,
      prefs: { ...DEFAULT_EXTENSION_NOTICE_PREFS, missingCollapsed: true },
    });
    expect(view.surface).toBe('remnant');
    if (view.surface !== 'remnant') return;
    wrap(<ExtensionSetupRemnant view={view} from="/settings" />);
    const remnant = document.querySelector(
      '[data-od-id="ext-notice-remnant"]'
    ) as HTMLAnchorElement;
    expect(remnant.getAttribute('href')).toBe('/install');
    expect(remnant.getAttribute('aria-label')).toBe('Install extension');
  });
});
