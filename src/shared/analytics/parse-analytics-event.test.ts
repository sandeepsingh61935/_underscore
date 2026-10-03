import { describe, expect, it } from 'vitest';

import { parseAnalyticsEvent } from './parse-analytics-event';

describe('parseAnalyticsEvent', () => {
  it('accepts allowlisted name and client prop', () => {
    const r = parseAnalyticsEvent({
      name: 'library_open',
      props: { client: 'phone' },
    });
    expect(r).toEqual({
      ok: true,
      name: 'library_open',
      props: { client: 'phone' },
    });
  });

  it('rejects unknown event names', () => {
    const r = parseAnalyticsEvent({ name: 'debug_dump', props: {} });
    expect(r.ok).toBe(false);
  });

  it('strips quote and q props', () => {
    const r = parseAnalyticsEvent({
      name: 'library_search',
      props: { client: 'tablet', quote: 'secret', q: 'my query', result_count: 3 },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.props).toEqual({ client: 'tablet', result_count: 3 });
      expect(r.props).not.toHaveProperty('quote');
      expect(r.props).not.toHaveProperty('q');
    }
  });

  it('accepts allowlisted group events with safe props', () => {
    const itemAdded = parseAnalyticsEvent({
      name: 'group_item_added',
      props: { kind: 'page' },
    });
    expect(itemAdded).toEqual({
      ok: true,
      name: 'group_item_added',
      props: { kind: 'page' },
    });

    const syncEnabled = parseAnalyticsEvent({
      name: 'browser_sync_enabled',
      props: { client: 'extension' },
    });
    expect(syncEnabled).toEqual({
      ok: true,
      name: 'browser_sync_enabled',
      props: { client: 'extension' },
    });

    const opened = parseAnalyticsEvent({
      name: 'group_opened_in_browser',
      props: { tabCount: 5, browser: 'chrome' },
    });
    expect(opened).toEqual({
      ok: true,
      name: 'group_opened_in_browser',
      props: { tabCount: 5, browser: 'chrome' },
    });
  });

  it('strictly rejects URL, hostname, name, and title props for privacy', () => {
    const r = parseAnalyticsEvent({
      name: 'group_created',
      props: {
        name: 'Private Project Alpha',
        url: 'https://secret.com/page',
        hostname: 'secret.com',
        title: 'Secret Document',
        client: 'popup',
      },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.props).toEqual({ client: 'popup' });
      expect(r.props).not.toHaveProperty('name');
      expect(r.props).not.toHaveProperty('url');
      expect(r.props).not.toHaveProperty('hostname');
      expect(r.props).not.toHaveProperty('title');
    }
  });
});
