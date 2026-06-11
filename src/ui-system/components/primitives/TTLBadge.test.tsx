/**
 * Wireframe: ui_kits/extension/v2/primitives.jsx L181-216
 *   (ttlState helper + V2 TTLBadge)
 * V2 contract:
 *   - State helper ttlState(ms): ms<=0 expired, ms<1h low, else fresh.
 *   - TTLBadge text + bar colors switch by state:
 *       fresh:   text var(--ink-2), bar var(--ttl-fresh)
 *       low:     text var(--ttl-low) italic, bar var(--ttl-low)
 *       expired: text var(--ttl-expired), bar var(--ttl-expired)
 *   - Bar: 40x4px, --rule-soft track, fill width = pct*100%.
 *   - Label format: "Xh Ym" when hours>=1, else "Xm".
 *   - Container has title="Xh Ym remaining" (or "Xm remaining").
 */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TTLBadge } from './TTLBadge';

const ONE_HOUR = 60 * 60 * 1000;
const TOTAL = 24 * ONE_HOUR;

describe('TTLBadge (V2 wireframe contract)', () => {
  it('uses --rule-soft for the bar track', () => {
    const { container } = render(<TTLBadge ms={TOTAL} />);
    const html = container.innerHTML;
    expect(html).toContain('var(--rule-soft)');
  });

  it('fresh state (>1h) routes bar fill to var(--ttl-fresh)', () => {
    const { container } = render(<TTLBadge ms={TOTAL} total={TOTAL} />);
    const html = container.innerHTML;
    expect(html).toContain('var(--ttl-fresh)');
  });

  it('low state (<1h) routes bar fill to var(--ttl-low) and text to italic var(--ttl-low)', () => {
    const { container } = render(<TTLBadge ms={30 * 60 * 1000} total={TOTAL} />);
    const html = container.innerHTML;
    expect(html).toContain('var(--ttl-low)');
    // italic style on the text label
    expect(html).toMatch(/font-style:\s*italic/);
  });

  it('expired state (ms<=0) routes bar fill to var(--ttl-expired) and text to var(--ttl-expired)', () => {
    const { container } = render(<TTLBadge ms={0} total={TOTAL} />);
    const html = container.innerHTML;
    expect(html).toContain('var(--ttl-expired)');
  });

  it('label formats as "Xh Ym" when hours >= 1', () => {
    const { container } = render(<TTLBadge ms={2 * ONE_HOUR + 30 * 60 * 1000} total={TOTAL} />);
    expect(container.textContent).toMatch(/2h 30m/);
  });

  it('label formats as "Xm" when hours < 1', () => {
    const { container } = render(<TTLBadge ms={45 * 60 * 1000} total={TOTAL} />);
    expect(container.textContent).toMatch(/^45m$/);
  });

  it('container has title attribute with "remaining" suffix', () => {
    const { container } = render(<TTLBadge ms={TOTAL} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute('title') ?? '').toMatch(/remaining/);
  });

  it('bar fill width equals pct*100%', () => {
    // 50% of 24h
    const half = TOTAL / 2;
    const { container } = render(<TTLBadge ms={half} total={TOTAL} />);
    const html = container.innerHTML;
    expect(html).toMatch(/width:\s*50%/);
  });
});
