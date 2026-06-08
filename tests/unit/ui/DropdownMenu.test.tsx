/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from '../../../src/ui-system/components/primitives/DropdownMenu';

describe('V2 DropdownMenu', () => {
    it('renders a trigger', () => {
        render(
            <DropdownMenu>
                <DropdownMenuTrigger>Open</DropdownMenuTrigger>
            </DropdownMenu>
        );
        expect(screen.getByText('Open')).toBeInTheDocument();
    });

    it('items render with V2 --ink text (not MD3 text-label-large)', () => {
        const { baseElement } = render(
            <DropdownMenu defaultOpen>
                <DropdownMenuTrigger>Open</DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem>Item 1</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );
        // Radix portals to document.body
        const html = baseElement.innerHTML;
        expect(html).toMatch(/var\(--ink/);
    });

    it('does not use Style C bg-popover / text-popover-foreground utilities', () => {
        const { baseElement } = render(
            <DropdownMenu defaultOpen>
                <DropdownMenuTrigger>Open</DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem>Item 1</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );
        const html = baseElement.innerHTML;
        expect(html).not.toMatch(/bg-popover/);
        expect(html).not.toMatch(/text-popover-foreground/);
        expect(html).not.toMatch(/bg-accent\b/);
        expect(html).not.toMatch(/text-accent-foreground/);
        expect(html).not.toMatch(/bg-muted/);
        expect(html).not.toMatch(/text-label-large/);
        expect(html).not.toMatch(/text-label-small/);
        expect(html).not.toMatch(/text-title-small/);
        expect(html).not.toMatch(/rounded-sm/);
        expect(html).not.toMatch(/rounded-md/);
        expect(html).not.toMatch(/shadow-md/);
        expect(html).not.toMatch(/shadow-lg/);
    });

    it('separator uses --rule-soft (V2 border)', () => {
        const { baseElement } = render(
            <DropdownMenu defaultOpen>
                <DropdownMenuTrigger>Open</DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem>A</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>B</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );
        const html = baseElement.innerHTML;
        expect(html).toContain('var(--rule-soft)');
    });

    it('content uses V2 --paper surface (V2 uses --paper for elevated surfaces)', () => {
        const { baseElement } = render(
            <DropdownMenu defaultOpen>
                <DropdownMenuTrigger>Open</DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem>A</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );
        const html = baseElement.innerHTML;
        expect(html).toContain('var(--paper)');
    });
});
