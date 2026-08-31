import { describe, expect, it } from 'vitest';

import {
  BILLING_UPCOMING_SUB,
  BILLING_UPCOMING_TITLE,
  billingUpcomingCopy,
} from './billing-upcoming-copy';

describe('billingUpcomingCopy', () => {
  it('exposes Upcoming stub without Polar or upgrade CTAs', () => {
    const c = billingUpcomingCopy();
    expect(c.title).toBe(BILLING_UPCOMING_TITLE);
    expect(c.sub).toBe(BILLING_UPCOMING_SUB);
    expect(c.sub.toLowerCase()).toContain('upcoming');
    expect(`${c.title} ${c.sub}`.toLowerCase()).not.toMatch(
      /polar|upgrade|checkout|manage|portal/
    );
  });
});
