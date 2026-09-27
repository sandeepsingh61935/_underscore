/**
 * Design contract: src/ui-system/theme/global.css (Skeleton)
 * Design contract:
 *   - Surface: --paper-2, 2px radius, prefers-reduced-motion renders at 0.5 opacity.
 *   - 5 variants: base | text | avatar | collectionCard | highlightCard.
 *   - Wireframe collectionCard: 320x64, 40px avatar + 32px action circles.
 *   - Wireframe highlightCard: 320x80, 4px left rule, 3 text lines + meta.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCollectionCard,
  SkeletonHighlightCard,
} from './Skeleton';

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
    expect(el.className).toMatch(/anim-pulse/);
  });

  it('base Skeleton animation=none skips animation class', () => {
    const { container } = render(<Skeleton animation="none" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).not.toMatch(/anim-pulse/);
    expect(el.className).not.toMatch(/anim-shimmer/);
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

  it('SkeletonAvatar renders circular (skeleton-round) at md=40px', () => {
    const { container } = render(<SkeletonAvatar size="md" />);
    const el = container.querySelector('[class*="skeleton-round"]') as HTMLElement;
    expect(el).toBeTruthy();
    expect(el.className).toMatch(/skeleton-avatar-md/);
  });

  it('SkeletonCollectionCard uses .skeleton-card (--paper-2 + --rule-soft in CSS)', () => {
    const { container } = render(<SkeletonCollectionCard />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toMatch(/\bskeleton-card\b/);
  });

  it('SkeletonHighlightCard uses .skeleton-hl (paper + 4px left rule in CSS)', () => {
    const { container } = render(<SkeletonHighlightCard />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toMatch(/\bskeleton-hl\b/);
  });
});
