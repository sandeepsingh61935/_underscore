/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../../../src/ui-system/components/primitives/Button';

describe('MD3 Button', () => {
    describe('Basic rendering', () => {
        it('renders with text content', () => {
            render(<Button>Click me</Button>);
            expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
        });

        it('applies filled variant by default', () => {
            render(<Button>Click me</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveClass('bg-[var(--md-sys-color-primary)]');
        });

        it('can be disabled', () => {
            render(<Button disabled>Click me</Button>);
            const button = screen.getByRole('button');
            expect(button).toBeDisabled();
            expect(button).toHaveClass('disabled:opacity-40');
        });
    });

    describe('MD3 specifications', () => {
        it('has full rounded corners (pill shape)', () => {
            render(<Button>Click me</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveClass('rounded-full');
        });

        it('uses MD3 label-large typography', () => {
            render(<Button>Click me</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveClass('text-[var(--md-sys-typescale-label-large-size)]');
            expect(button).toHaveClass('font-[var(--md-sys-typescale-label-large-weight)]');
        });

        it('meets 48dp minimum touch target height', () => {
            render(<Button>Click me</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveClass('min-h-[48px]');
        });

        it('uses MD3 motion duration and easing', () => {
            render(<Button>Click me</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveClass('duration-[var(--md-sys-motion-duration-short)]');
            expect(button).toHaveClass('ease-[var(--md-sys-motion-easing-standard)]');
        });
    });

    describe('Variants', () => {
        it('renders filled variant correctly', () => {
            render(<Button variant="filled">Filled</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveClass('bg-[var(--md-sys-color-primary)]');
            expect(button).toHaveClass('text-[var(--md-sys-color-on-primary)]');
        });

        it('renders outlined variant correctly', () => {
            render(<Button variant="outlined">Outlined</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveClass('border');
            expect(button).toHaveClass('border-[var(--md-sys-color-outline)]');
            expect(button).toHaveClass('text-[var(--md-sys-color-primary)]');
        });

        it('renders text variant correctly', () => {
            render(<Button variant="text">Text</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveClass('bg-transparent');
            expect(button).toHaveClass('text-[var(--md-sys-color-primary)]');
            expect(button).not.toHaveClass('border');
        });
    });

    describe('Loading state', () => {
        it('shows spinner when loading', () => {
            render(<Button isLoading>Click me</Button>);
            expect(screen.getByRole('button')).toContainHTML('animate-spin');
        });

        it('is disabled when loading', () => {
            render(<Button isLoading>Click me</Button>);
            expect(screen.getByRole('button')).toBeDisabled();
        });
    });

    describe('Icon support', () => {
        it('renders icon when provided', () => {
            const icon = <span data-testid="test-icon">→</span>;
            render(<Button icon={icon}>With Icon</Button>);
            expect(screen.getByTestId('test-icon')).toBeInTheDocument();
        });

        it('does not render icon when loading', () => {
            const icon = <span data-testid="test-icon">→</span>;
            render(<Button icon={icon} isLoading>With Icon</Button>);
            expect(screen.queryByTestId('test-icon')).not.toBeInTheDocument();
        });
    });

    describe('Accessibility', () => {
        it('has proper focus ring', () => {
            render(<Button>Click me</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveClass('focus-visible:ring-2');
            expect(button).toHaveClass('focus-visible:ring-[var(--md-sys-color-primary)]');
        });

        it('forwards ref correctly', () => {
            const ref = { current: null } as React.RefObject<HTMLButtonElement>;
            render(<Button ref={ref as any}>Click me</Button>);
            expect(ref.current).toBeInstanceOf(HTMLButtonElement);
        });
    });

    describe('Custom className', () => {
        it('merges custom className with default classes', () => {
            render(<Button className="custom-class">Click me</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveClass('custom-class');
            expect(button).toHaveClass('rounded-full'); // Still has default classes
        });
    });
});
