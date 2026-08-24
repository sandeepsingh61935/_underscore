/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from '../../../src/ui-system/components/composed/EmptyState';

describe('V2 EmptyState', () => {
    it('renders custom title and description', () => {
        render(
            <EmptyState title="Nothing here" description="Try again later." />
        );
        expect(screen.getByText('Nothing here')).toBeInTheDocument();
        expect(screen.getByText('Try again later.')).toBeInTheDocument();
    });

    it('renders the no-highlights variant with default copy', () => {
        render(<EmptyState variant="no-highlights" />);
        expect(screen.getByText('No highlights yet')).toBeInTheDocument();
    });

    it('renders the no-collections variant', () => {
        render(<EmptyState variant="no-collections" />);
        expect(screen.getByText('No collections yet')).toBeInTheDocument();
    });

    it('invokes the primary action onClick when action is clicked', () => {
        const onClick = vi.fn();
        render(
            <EmptyState
                title="Empty"
                description="Do something"
                action={{ label: 'Add now', onClick }}
            />
        );
        fireEvent.click(screen.getByRole('button', { name: 'Add now' }));
        expect(onClick).toHaveBeenCalledOnce();
    });

    it('invokes the secondary action onClick when clicked', () => {
        const onClick = vi.fn();
        render(
            <EmptyState
                title="Empty"
                description="Do something"
                secondaryAction={{ label: 'Maybe later', onClick }}
            />
        );
        fireEvent.click(screen.getByRole('button', { name: 'Maybe later' }));
        expect(onClick).toHaveBeenCalledOnce();
    });

    it('has role status and aria-live polite', () => {
        render(<EmptyState variant="no-results" />);
        const el = screen.getByRole('status');
        expect(el).toBeInTheDocument();
        expect(el).toHaveAttribute('aria-live', 'polite');
    });

    it('primary action button uses .btn.primary.sm classes', () => {
        render(
            <EmptyState
                title="Empty"
                description="Do something"
                action={{ label: 'Add', onClick: vi.fn() }}
            />
        );
        const button = screen.getByRole('button', { name: 'Add' });
        expect(button).toHaveClass('btn', 'primary', 'sm');
    });

    it('secondary action button uses .btn.sm classes', () => {
        render(
            <EmptyState
                title="Empty"
                description="Do something"
                secondaryAction={{ label: 'Skip', onClick: vi.fn() }}
            />
        );
        const button = screen.getByRole('button', { name: 'Skip' });
        expect(button).toHaveClass('btn', 'sm');
        expect(button).not.toHaveClass('primary');
    });

    it('does not use Style C, MD3, or shadcn utility classes', () => {
        const { baseElement } = render(
            <EmptyState
                title="Empty"
                description="Do something"
                action={{ label: 'Add', onClick: vi.fn() }}
                secondaryAction={{ label: 'Skip', onClick: vi.fn() }}
            />
        );
        const html = baseElement.innerHTML;
        expect(html).not.toMatch(/bg-primary\b/);
        expect(html).not.toMatch(/text-primary-foreground/);
        expect(html).not.toMatch(/bg-secondary/);
        expect(html).not.toMatch(/text-secondary-foreground/);
        expect(html).not.toMatch(/text-muted-foreground/);
        expect(html).not.toMatch(/text-foreground/);
        expect(html).not.toMatch(/text-title-small/);
        expect(html).not.toMatch(/text-title-medium/);
        expect(html).not.toMatch(/text-title-large/);
        expect(html).not.toMatch(/text-body-small/);
        expect(html).not.toMatch(/text-body-medium/);
        expect(html).not.toMatch(/text-label-large/);
        expect(html).not.toMatch(/rounded-lg/);
        expect(html).not.toMatch(/duration-short/);
    });
});
