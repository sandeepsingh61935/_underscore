/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { ToastProvider, useToast } from '../../../src/ui-system/components/composed/Toast';

function Harness(): React.JSX.Element {
    const { addToast } = useToast();
    return (
        <>
            <button onClick={() => addToast({ title: 'OK', variant: 'success' })}>
                push success
            </button>
            <button onClick={() => addToast({ title: 'Boom', variant: 'error' })}>
                push error
            </button>
            <button onClick={() => addToast({ title: 'Heads up', variant: 'warning' })}>
                push warning
            </button>
            <button onClick={() => addToast({ title: 'FYI', variant: 'info' })}>
                push info
            </button>
        </>
    );
}

describe('V2 Toast', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders the provider without crashing and shows nothing by default', () => {
        render(
            <ToastProvider>
                <Harness />
            </ToastProvider>
        );
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('adds a success toast when addToast is called with variant=success', () => {
        render(
            <ToastProvider>
                <Harness />
            </ToastProvider>
        );
        act(() => {
            screen.getByText('push success').click();
        });
        expect(screen.getByRole('alert')).toHaveTextContent('OK');
    });

    it('adds an error toast', () => {
        render(
            <ToastProvider>
                <Harness />
            </ToastProvider>
        );
        act(() => {
            screen.getByText('push error').click();
        });
        expect(screen.getByRole('alert')).toHaveTextContent('Boom');
    });

    it('uses V2 --paper surface and --rule-soft border on the toast card', () => {
        render(
            <ToastProvider>
                <Harness />
            </ToastProvider>
        );
        act(() => {
            screen.getByText('push success').click();
        });
        const html = screen.getByRole('alert').outerHTML;
        expect(html).toContain('var(--paper)');
        expect(html).toContain('var(--rule-soft)');
    });

    it('does not use Style C, MD3, Tailwind palette, or shadcn utility classes', () => {
        render(
            <ToastProvider>
                <Harness />
            </ToastProvider>
        );
        act(() => {
            screen.getByText('push success').click();
        });
        const html = screen.getByRole('alert').outerHTML;
        expect(html).not.toMatch(/bg-card/);
        expect(html).not.toMatch(/text-foreground/);
        expect(html).not.toMatch(/text-muted-foreground/);
        expect(html).not.toMatch(/text-title-small/);
        expect(html).not.toMatch(/text-body-small/);
        expect(html).not.toMatch(/text-primary\b/);
        expect(html).not.toMatch(/rounded-lg/);
        expect(html).not.toMatch(/rounded-md/);
        expect(html).not.toMatch(/shadow-lg/);
        expect(html).not.toMatch(/shadow-md/);
        expect(html).not.toMatch(/shadow-sm/);
        // Tailwind palette for variant colors
        expect(html).not.toMatch(/green-50|green-200|green-400|green-600|green-800|green-950/);
        expect(html).not.toMatch(/red-50|red-200|red-400|red-600|red-800|red-950/);
        expect(html).not.toMatch(/yellow-50|yellow-200|yellow-400|yellow-600|yellow-800|yellow-950/);
        expect(html).not.toMatch(/blue-50|blue-200|blue-400|blue-600|blue-800|blue-950/);
        expect(html).not.toMatch(/hover:bg-black\/5|dark:hover:bg-white\/10/);
    });

    it('dismisses the toast when the dismiss button is clicked', () => {
        render(
            <ToastProvider>
                <Harness />
            </ToastProvider>
        );
        act(() => {
            screen.getByText('push info').click();
        });
        expect(screen.getByRole('alert')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('auto-dismisses after the default duration', () => {
        render(
            <ToastProvider defaultDuration={1000}>
                <Harness />
            </ToastProvider>
        );
        act(() => {
            screen.getByText('push warning').click();
        });
        expect(screen.getByRole('alert')).toBeInTheDocument();
        act(() => {
            vi.advanceTimersByTime(1500);
        });
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('limits visible toasts to maxToasts', () => {
        function Multi(): React.JSX.Element {
            const { addToast } = useToast();
            return (
                <button onClick={() => addToast({ title: 'X', variant: 'info' })}>
                    push
                </button>
            );
        }
        render(
            <ToastProvider maxToasts={2} defaultDuration={10000}>
                <Multi />
            </ToastProvider>
        );
        act(() => {
            screen.getByText('push').click();
            screen.getByText('push').click();
            screen.getByText('push').click();
        });
        expect(screen.getAllByRole('alert').length).toBe(2);
    });
});
