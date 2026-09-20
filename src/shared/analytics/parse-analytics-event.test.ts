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
});
