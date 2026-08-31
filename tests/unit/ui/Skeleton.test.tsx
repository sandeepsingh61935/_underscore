/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCollectionCard,
} from '../../../src/ui-system/components/primitives/Skeleton';

describe('V2 Skeleton', () => {
  describe('Base Skeleton', () => {
    it('renders a div', () => {
      const { container } = render(<Skeleton />);
      const el = container.firstChild as HTMLElement;
      expect(el).toBeInTheDocument();
      expect(el.tagName).toBe('DIV');
    });

    it('uses V2 --paper-2 surface (not MD3 bg-secondary)', () => {
      const { container } = render(<Skeleton />);
      const el = container.firstChild as HTMLElement;
      const style = el.getAttribute('style') ?? '';
      expect(style).toContain('var(--paper-2)');
    });

    it('uses V2 radius (rounded) — not rounded-md', () => {
      const { container } = render(<Skeleton />);
      const el = container.firstChild as HTMLElement;
      expect(el.className).not.toMatch(/rounded-md/);
    });

    it('uses animate-pulse when animation=pulse', () => {
      const { container } = render(<Skeleton animation="pulse" />);
      const el = container.firstChild as HTMLElement;
      expect(el.className).toMatch(/animate-pulse/);
    });

    it('applies custom className', () => {
      const { container } = render(<Skeleton className="h-4 w-full" />);
      const el = container.firstChild as HTMLElement;
      expect(el.className).toContain('h-4');
    });
  });

  describe('SkeletonText', () => {
    it('renders the requested number of lines', () => {
      const { container } = render(<SkeletonText lines={3} />);
      // Each line is a Skeleton div with --paper-2 backgroundColor
      const skels = container.querySelectorAll('div[style*="var(--paper-2)"]');
      expect(skels.length).toBe(3);
    });
  });

  describe('SkeletonAvatar', () => {
    it('uses rounded-full (circle shape)', () => {
      const { container } = render(<SkeletonAvatar size="md" />);
      const el = container.firstChild as HTMLElement;
      expect(el.className).toMatch(/rounded-full/);
    });
  });

  describe('SkeletonCollectionCard', () => {
    it('uses --rule-soft for the border (not MD3 border-border)', () => {
      const { container } = render(<SkeletonCollectionCard />);
      const el = container.firstChild as HTMLElement;
      const style = el.getAttribute('style') ?? '';
      expect(style).toContain('var(--rule-soft)');
    });

    it('does not use Style C bg-card / border-border utilities', () => {
      const { container } = render(<SkeletonCollectionCard />);
      const el = container.firstChild as HTMLElement;
      expect(el.className).not.toMatch(/bg-card/);
      expect(el.className).not.toMatch(/border-border/);
      expect(el.className).not.toMatch(/rounded-xl/);
      expect(el.className).not.toMatch(/rounded-lg/);
    });
  });

  describe('No legacy design system tokens', () => {
    it('does not use bg-secondary or text-muted-foreground utilities', () => {
      const { container } = render(<Skeleton />);
      const el = container.firstChild as HTMLElement;
      expect(el.className).not.toMatch(/bg-secondary/);
      expect(el.className).not.toMatch(/from-secondary/);
      expect(el.className).not.toMatch(/via-secondary/);
      expect(el.className).not.toMatch(/to-secondary/);
      expect(el.className).not.toMatch(/text-muted-foreground/);
    });
  });
});
