/**
 * Wireframe: ui_kits/extension/v2/primitives.jsx L548-625 (V2_Skeleton)
 * V2 contract:
 *   - Surface: --paper-2, 2px radius, prefers-reduced-motion renders at 0.5 opacity.
 *   - 5 variants: base | text | avatar | collectionCard | highlightCard.
 *   - Wireframe collectionCard: 320x64, 40px avatar + 32px action circles.
 *   - Wireframe highlightCard: 320x80, 4px left rule, 3 text lines + meta.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Skeleton, SkeletonText, SkeletonAvatar, SkeletonCollectionCard, SkeletonHighlightCard } from './Skeleton';

describe('Skeleton (V2 wireframe contract)', () => {
  it('base Skeleton uses --paper-2 surface', () => {
    const { container } = render(<Skeleton />);
    const el = container.firstElementChild as HTMLElement;
    const style = el.getAttribute('style') ?? '';
    expect(style).toContain('var(--paper-2)');
  });

  it('base Skeleton uses pulse animation by default', () => {
    const { container } = render(<Skeleton />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toMatch(/animate-pulse/);
  });

  it('base Skeleton animation=none skips animation class', () => {
    const { container } = render(<Skeleton animation="none" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).not.toMatch(/animate-pulse/);
    expect(el.className).not.toMatch(/animate-shimmer/);
  });

  it('shimmer animation sets up linear-gradient with --utility-overlay-08', () => {
    const { container } = render(<Skeleton animation="shimmer" />);
    const el = container.firstElementChild as HTMLElement;
    const style = el.getAttribute('style') ?? '';
    expect(style).toContain('linear-gradient');
    expect(style).toContain('var(--utility-overlay-08)');
  });

  it('SkeletonText renders N lines (last line shorter for visual variety)', () => {
    const { container } = render(<SkeletonText lines={3} />);
    const lines = container.querySelectorAll('[style*="var(--paper-2)"]');
    expect(lines.length).toBeGreaterThanOrEqual(3);
  });

  it('SkeletonAvatar renders circular (rounded-full) at md=40px', () => {
    const { container } = render(<SkeletonAvatar size="md" />);
    const el = container.querySelector('[class*="rounded-full"]') as HTMLElement;
    expect(el).toBeTruthy();
    expect(el.className).toMatch(/w-10/);
    expect(el.className).toMatch(/h-10/);
  });

  it('SkeletonCollectionCard uses --paper-2 + --rule-soft border', () => {
    const { container } = render(<SkeletonCollectionCard />);
    const root = container.firstElementChild as HTMLElement;
    const style = root.getAttribute('style') ?? '';
    expect(style).toContain('var(--paper-2)');
    expect(style).toContain('var(--rule-soft)');
  });

  it('SkeletonHighlightCard uses --paper-2 + --rule-soft + 4px left rule', () => {
    const { container } = render(<SkeletonHighlightCard />);
    const root = container.firstElementChild as HTMLElement;
    const style = root.getAttribute('style') ?? '';
    expect(style).toContain('var(--paper-2)');
    expect(style).toContain('var(--rule-soft)');
    expect(style).toContain('border-left: 4px solid var(--rule-soft)');
  });
});
