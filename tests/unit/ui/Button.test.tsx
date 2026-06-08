/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../../../src/ui-system/components/primitives/Button';

describe('V2 Button', () => {
    describe('Basic rendering', () => {
        it('renders with text content', () => {
            render(<Button>Click me</Button>);
            expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
        });

        it('applies the default variant (.btn class)', () => {
            render(<Button>Click me</Button>);
            expect(screen.getByRole('button')).toHaveClass('btn');
        });

        it('forwards click events', () => {
            const onClick = vi.fn();
            render(<Button onClick={onClick}>Click</Button>);
            fireEvent.click(screen.getByRole('button'));
            expect(onClick).toHaveBeenCalledOnce();
        });

        it('can be disabled', () => {
            render(<Button disabled>Click me</Button>);
            expect(screen.getByRole('button')).toBeDisabled();
        });
    });

    describe('V2 wireframe classes', () => {
        it('default variant uses .btn class only', () => {
            render(<Button>Click me</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveClass('btn');
            expect(button.className).not.toMatch(/\bbtn\.primary\b/);
        });

        it('primary variant adds .btn.primary class', () => {
            render(<Button variant="primary">Click me</Button>);
            expect(screen.getByRole('button')).toHaveClass('btn');
            expect(screen.getByRole('button').className).toContain('primary');
        });

        it('accent variant adds .btn.accent class (V2 single terracotta)', () => {
            render(<Button variant="accent">Click me</Button>);
            expect(screen.getByRole('button')).toHaveClass('btn');
            expect(screen.getByRole('button').className).toContain('accent');
        });

        it('ghost variant adds .btn.ghost class', () => {
            render(<Button variant="ghost">Click me</Button>);
            expect(screen.getByRole('button').className).toContain('ghost');
        });
    });

    describe('No legacy design system tokens', () => {
        it('does not use MD3 classes', () => {
            render(<Button>Click me</Button>);
            const html = screen.getByRole('button').outerHTML;
            expect(html).not.toMatch(/--md-sys-/);
        });

        it('does not use banned Tailwind arbitrary utilities', () => {
            render(<Button>Click me</Button>);
            const cls = screen.getByRole('button').className;
            expect(cls).not.toMatch(/duration-\[.*ms\]/);
            expect(cls).not.toMatch(/rounded-\[\d+px\]/);
        });
    });

    describe('Loading state', () => {
        it('shows loading text when isLoading', () => {
            render(<Button isLoading>Click me</Button>);
            expect(screen.getByText(/Loading/i)).toBeInTheDocument();
        });

        it('is disabled when loading', () => {
            render(<Button isLoading>Click me</Button>);
            expect(screen.getByRole('button')).toBeDisabled();
        });
    });

    describe('Size variants', () => {
        it('sm size adds .btn.sm class', () => {
            render(<Button size="sm">Click me</Button>);
            expect(screen.getByRole('button').className).toContain('btn');
            expect(screen.getByRole('button').className).toContain('sm');
        });
    });

    describe('Custom className', () => {
        it('merges custom className with default classes', () => {
            render(<Button className="custom-class">Click me</Button>);
            expect(screen.getByRole('button')).toHaveClass('custom-class');
            expect(screen.getByRole('button')).toHaveClass('btn');
        });
    });
});
