/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogAction,
    AlertDialogCancel,
} from '../../../src/ui-system/components/primitives/AlertDialog';

describe('V2 AlertDialog', () => {
    it('renders title and description via Radix slots', () => {
        render(
            <AlertDialog open>
                <AlertDialogContent>
                    <AlertDialogTitle>Confirm</AlertDialogTitle>
                    <AlertDialogDescription>Are you sure?</AlertDialogDescription>
                </AlertDialogContent>
            </AlertDialog>
        );
        expect(screen.getByText('Confirm')).toBeInTheDocument();
        expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    });

    it('uses V2 --ink for description text (not MD3 text-muted-foreground)', () => {
        const { baseElement } = render(
            <AlertDialog open>
                <AlertDialogContent>
                    <AlertDialogDescription>x</AlertDialogDescription>
                </AlertDialogContent>
            </AlertDialog>
        );
        // Radix portals to document.body — use baseElement to inspect
        const html = baseElement.innerHTML;
        expect(html).toMatch(/var\(--ink/);
    });

    it('uses V2 step-3 for title font-size (not MD3 text-title-large)', () => {
        const { baseElement } = render(
            <AlertDialog open>
                <AlertDialogContent>
                    <AlertDialogTitle>x</AlertDialogTitle>
                </AlertDialogContent>
            </AlertDialog>
        );
        expect(baseElement.innerHTML).toContain('var(--step-3)');
    });

    it('uses V2 step-0 for description font-size (not MD3 text-body-small)', () => {
        const { baseElement } = render(
            <AlertDialog open>
                <AlertDialogContent>
                    <AlertDialogDescription>x</AlertDialogDescription>
                </AlertDialogContent>
            </AlertDialog>
        );
        expect(baseElement.innerHTML).toContain('var(--step-0)');
    });

    it('does not use Style C / MD3 / banned Tailwind utility classes', () => {
        const { baseElement } = render(
            <AlertDialog open>
                <AlertDialogContent>
                    <AlertDialogTitle>x</AlertDialogTitle>
                    <AlertDialogDescription>x</AlertDialogDescription>
                    <AlertDialogAction>OK</AlertDialogAction>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                </AlertDialogContent>
            </AlertDialog>
        );
        const html = baseElement.innerHTML;
        expect(html).not.toMatch(/bg-background/);
        expect(html).not.toMatch(/bg-primary\b/);
        expect(html).not.toMatch(/text-primary-foreground/);
        expect(html).not.toMatch(/ring-ring/);
        expect(html).not.toMatch(/text-muted-foreground/);
        expect(html).not.toMatch(/text-label-large/);
        expect(html).not.toMatch(/h-10\b/);
        expect(html).not.toMatch(/sm:rounded-lg/);
        expect(html).not.toMatch(/rounded-md/);
    });

    it('AlertDialog action uses V2 --accent fill (V2 single-accent CTA)', () => {
        const { baseElement } = render(
            <AlertDialog open>
                <AlertDialogContent>
                    <AlertDialogAction>OK</AlertDialogAction>
                </AlertDialogContent>
            </AlertDialog>
        );
        expect(baseElement.innerHTML).toContain('var(--accent)');
    });

    it('AlertDialog action has 44px min touch target (V2 spec)', () => {
        const { baseElement } = render(
            <AlertDialog open>
                <AlertDialogContent>
                    <AlertDialogAction>OK</AlertDialogAction>
                </AlertDialogContent>
            </AlertDialog>
        );
        const action = screen.getByText('OK');
        expect(action.className).toMatch(/min-h-\[44px\]/);
    });
});
