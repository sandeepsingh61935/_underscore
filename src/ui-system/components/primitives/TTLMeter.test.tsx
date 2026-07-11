/**
 * Wireframe: ui_kits/extension/v2/primitives.jsx L218-260 (V2 TTLMeter)
 * V2 contract:
 *   - Padding 10px 16px, --rule-soft top+bottom borders.
 *   - Background: low -> var(--ttl-wash), else -> var(--paper-2).
 *   - Label: "Expires in" (fresh/low) or "Expired" (expired), u-mono 10px caps --ink-3.
 *   - Time: HH:MM:SS zero-padded, u-mono 13px, italic when low, line-through when expired.
 *   - 24-segment bar, 6px tall, 2px gap, --ttl-* filled, --rule-soft unfilled.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TTLMeter } from './TTLMeter';

const ONE_HOUR = 60 * 60 * 1000;
const TOTAL = 24 * ONE_HOUR;

describe('TTLMeter (V2 wireframe contract)', () => {
  it('renders 24 bar segments', () => {
    const { container } = render(<TTLMeter ms={TOTAL} total={TOTAL} />);
    // bar segments are the last child grid of 24 spans
    const segs = container.querySelectorAll('div > span');
    // The first two spans are the label + time; the rest are segments
    const segments = Array.from(segs).filter((s) => (s as HTMLElement).style.background !== '');
    expect(segments.length).toBe(24);
  });

  it('shows long-form time at or above one day', () => {
    const { container } = render(<TTLMeter ms={5 * 24 * ONE_HOUR} total={30 * 24 * ONE_HOUR} />);
    expect(container.textContent).toContain('5 days');
  });

  it('time is zero-padded HH:MM:SS under one day', () => {
    const { container } = render(<TTLMeter ms={2 * ONE_HOUR + 5 * 60 * 1000 + 3 * 1000} total={TOTAL} />);
    expect(container.textContent).toMatch(/02:05:03/);
  });

  it('label is "Expires in" when fresh or low', () => {
    const { container: a } = render(<TTLMeter ms={TOTAL} total={TOTAL} />);
    const { container: b } = render(<TTLMeter ms={30 * 60 * 1000} total={TOTAL} />);
    expect(a.textContent).toContain('Expires in');
    expect(b.textContent).toContain('Expires in');
  });

  it('label is "Expired" when ms <= 0', () => {
    const { container } = render(<TTLMeter ms={0} total={TOTAL} />);
    expect(container.textContent).toContain('Expired');
  });

  it('low state uses --ttl-wash background', () => {
    const { container } = render(<TTLMeter ms={30 * 60 * 1000} total={TOTAL} />);
    const root = container.firstElementChild as HTMLElement;
    const style = root.getAttribute('style') ?? '';
    expect(style).toContain('var(--ttl-wash)');
  });

  it('fresh state uses --paper-2 background', () => {
    const { container } = render(<TTLMeter ms={TOTAL} total={TOTAL} />);
    const root = container.firstElementChild as HTMLElement;
    const style = root.getAttribute('style') ?? '';
    expect(style).toContain('var(--paper-2)');
  });

  it('low state sets italic font-style on the time label', () => {
    const { container } = render(<TTLMeter ms={30 * 60 * 1000} total={TOTAL} />);
    const html = container.innerHTML;
    expect(html).toMatch(/font-style:\s*italic/);
  });

  it('expired state sets line-through text-decoration on the time label', () => {
    const { container } = render(<TTLMeter ms={0} total={TOTAL} />);
    const html = container.innerHTML;
    expect(html).toMatch(/text-decoration:\s*line-through/);
  });

  it('fresh state fills bar segments with var(--ttl-fresh)', () => {
    const { container } = render(<TTLMeter ms={TOTAL} total={TOTAL} />);
    const html = container.innerHTML;
    expect(html).toContain('var(--ttl-fresh)');
  });

  it('low state fills bar segments with var(--ttl-low)', () => {
    const { container } = render(<TTLMeter ms={30 * 60 * 1000} total={TOTAL} />);
    const html = container.innerHTML;
    expect(html).toContain('var(--ttl-low)');
  });
});
