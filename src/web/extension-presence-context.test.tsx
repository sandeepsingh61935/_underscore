import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';

import {
  ExtensionPresenceProvider,
  useExtensionPresence,
} from './extension-presence-context';

function PresenceProbe(): React.ReactElement {
  const presence = useExtensionPresence();
  return <div data-od-id="presence-probe">{presence}</div>;
}

describe('ExtensionPresenceProvider', () => {
  it('re-ping when tab becomes visible updates presence to installed', async () => {
    const ping = vi
      .fn()
      .mockResolvedValueOnce({ presence: 'missing' })
      .mockResolvedValueOnce({ presence: 'installed' });

    render(
      <ExtensionPresenceProvider ping={ping}>
        <PresenceProbe />
      </ExtensionPresenceProvider>
    );

    await waitFor(() => {
      expect(document.querySelector('[data-od-id="presence-probe"]')?.textContent).toBe(
        'missing'
      );
    });

    document.dispatchEvent(new Event('visibilitychange'));

    await waitFor(() => {
      expect(document.querySelector('[data-od-id="presence-probe"]')?.textContent).toBe(
        'installed'
      );
    });
  });

  it('presenceOverride skips ping', () => {
    const ping = vi.fn();
    render(
      <ExtensionPresenceProvider presenceOverride="installed" ping={ping}>
        <PresenceProbe />
      </ExtensionPresenceProvider>
    );
    expect(document.querySelector('[data-od-id="presence-probe"]')?.textContent).toBe(
      'installed'
    );
    expect(ping).not.toHaveBeenCalled();
  });
});
