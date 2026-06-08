/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HighlightCard } from '../../../src/ui-system/components/composed/HighlightCard';

const baseHighlight = {
    id: 'h1',
    text: 'Important observation about the world.',
    createdAt: new Date('2026-06-08T10:00:00Z'),
};

describe('V2 HighlightCard', () => {
    it('renders the highlight text', () => {
        render(<HighlightCard highlight={baseHighlight} />);
        expect(
            screen.getByText(/Important observation about the world\./)
        ).toBeInTheDocument();
    });

    it('renders "Today" for a highlight created today', () => {
        render(<HighlightCard highlight={{ ...baseHighlight, createdAt: new Date() }} />);
        expect(screen.getByText('Today')).toBeInTheDocument();
    });

    it('invokes onCopy with the highlight text when copy is clicked', () => {
        const onCopy = vi.fn();
        render(<HighlightCard highlight={baseHighlight} onCopy={onCopy} />);
        fireEvent.click(screen.getByRole('button', { name: /Copy highlight text/ }));
        expect(onCopy).toHaveBeenCalledWith(baseHighlight.text);
    });

    it('shows the "Copied" affordance after copy', () => {
        const onCopy = vi.fn();
        render(<HighlightCard highlight={baseHighlight} onCopy={onCopy} />);
        fireEvent.click(screen.getByRole('button', { name: /Copy highlight text/ }));
        expect(
            screen.getByRole('button', { name: /Copied to clipboard/ })
        ).toBeInTheDocument();
    });

    it('invokes onDelete with the id when delete is clicked', () => {
        const onDelete = vi.fn();
        render(<HighlightCard highlight={baseHighlight} onDelete={onDelete} />);
        fireEvent.click(screen.getByRole('button', { name: /Delete highlight/ }));
        expect(onDelete).toHaveBeenCalledWith('h1');
    });

    it('uses V2 --paper surface, --rule-soft border, --ink text', () => {
        const { baseElement } = render(<HighlightCard highlight={baseHighlight} />);
        const html = baseElement.innerHTML;
        expect(html).toContain('var(--paper)');
        expect(html).toContain('var(--rule-soft)');
        expect(html).toContain('var(--ink)');
    });

    it('does not use Style C, MD3, or shadcn utility classes', () => {
        const { baseElement } = render(<HighlightCard highlight={baseHighlight} />);
        const html = baseElement.innerHTML;
        expect(html).not.toMatch(/bg-card/);
        expect(html).not.toMatch(/bg-secondary/);
        expect(html).not.toMatch(/text-foreground/);
        expect(html).not.toMatch(/text-muted-foreground/);
        expect(html).not.toMatch(/border-border/);
        expect(html).not.toMatch(/border-l-yellow/);
        expect(html).not.toMatch(/border-l-orange/);
        expect(html).not.toMatch(/border-l-blue/);
        expect(html).not.toMatch(/border-l-green/);
        expect(html).not.toMatch(/border-l-purple/);
        expect(html).not.toMatch(/border-l-pink/);
        expect(html).not.toMatch(/border-l-teal/);
        expect(html).not.toMatch(/text-body-medium/);
        expect(html).not.toMatch(/text-label-small/);
        expect(html).not.toMatch(/text-primary\b/);
        expect(html).not.toMatch(/text-destructive/);
        expect(html).not.toMatch(/shadow-md/);
        expect(html).not.toMatch(/rounded-lg/);
    });

    it('has 44px minimum touch target on action buttons', () => {
        const { baseElement } = render(
            <HighlightCard
                highlight={baseHighlight}
                onCopy={vi.fn()}
                onDelete={vi.fn()}
            />
        );
        const html = baseElement.innerHTML;
        expect(html).toMatch(/min-h-\[44px\]/);
    });
});
