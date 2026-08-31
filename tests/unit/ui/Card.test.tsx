/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Card,
  CardTitle,
  CardDescription,
  CardFooter,
} from '../../../src/ui-system/components/primitives/Card';

describe('V2 Card', () => {
  describe('Basic rendering', () => {
    it('renders a div by default', () => {
      render(<Card>body</Card>);
      const el = screen.getByText('body');
      expect(el.tagName).toBe('DIV');
    });

    it('renders a button when interactive', () => {
      render(<Card interactive>body</Card>);
      const el = screen.getByRole('button', { name: 'body' });
      expect(el).toBeInTheDocument();
    });

    it('uses V2 --paper-2 surface (not MD3 bg-surface-container)', () => {
      const { container } = render(<Card>x</Card>);
      const el = container.firstChild as HTMLElement;
      const style = el.getAttribute('style') ?? '';
      expect(style).toContain('var(--paper-2)');
    });

    it('uses V2 --ink for text color (not MD3 text-on-surface)', () => {
      const { container } = render(<Card>x</Card>);
      const el = container.firstChild as HTMLElement;
      const style = el.getAttribute('style') ?? '';
      expect(style).toContain('var(--ink)');
    });

    it('uses V2 --rule-soft for border (not box-shadow — V2 uses borders)', () => {
      const { container } = render(<Card>x</Card>);
      const el = container.firstChild as HTMLElement;
      const style = el.getAttribute('style') ?? '';
      expect(style).toContain('var(--rule-soft)');
    });
  });

  describe('No legacy design system tokens', () => {
    it('does not use MD3 shadow-elevation-* utilities', () => {
      const { container } = render(<Card elevated>x</Card>);
      const el = container.firstChild as HTMLElement;
      expect(el.className).not.toMatch(/shadow-elevation-/);
    });

    it('does not use Ink & Glass --ink-ease-spring', () => {
      const { container } = render(<Card>x</Card>);
      const el = container.firstChild as HTMLElement;
      const style = el.getAttribute('style') ?? '';
      expect(style).not.toMatch(/--ink-ease-spring/);
    });

    it('does not use MD3 --md-sys- tokens', () => {
      const { container } = render(<Card>x</Card>);
      const el = container.firstChild as HTMLElement;
      const style = el.getAttribute('style') ?? '';
      expect(style).not.toMatch(/--md-sys-/);
    });

    it('does not use duration-[Xms] Tailwind arbitrary utility', () => {
      const { container } = render(<Card>x</Card>);
      const el = container.firstChild as HTMLElement;
      expect(el.className).not.toMatch(/duration-\[.*ms\]/);
    });

    it('does not use rounded-[Xpx] arbitrary utility', () => {
      const { container } = render(<Card>x</Card>);
      const el = container.firstChild as HTMLElement;
      expect(el.className).not.toMatch(/rounded-\[\d+px\]/);
    });
  });

  describe('Subcomponents', () => {
    it('CardTitle uses --ink for color', () => {
      render(<CardTitle>Title</CardTitle>);
      const el = screen.getByText('Title');
      const style = el.getAttribute('style') ?? '';
      expect(style).toContain('var(--ink)');
    });

    it('CardDescription uses --ink-2 for muted text', () => {
      render(<CardDescription>Desc</CardDescription>);
      const el = screen.getByText('Desc');
      const style = el.getAttribute('style') ?? '';
      expect(style).toContain('var(--ink-2)');
    });

    it('CardFooter uses --rule-soft for the top border', () => {
      const { container } = render(<CardFooter>footer</CardFooter>);
      const el = container.firstChild as HTMLElement;
      const style = el.getAttribute('style') ?? '';
      expect(style).toContain('var(--rule-soft)');
    });
  });
});
