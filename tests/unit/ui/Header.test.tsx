/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../../../src/core/context/AppProvider';
import { Header } from '../../../src/ui-system/components/layout/Header';
import type { IDataProvider } from '../../../src/shared/interfaces/i-data-provider';

const mockDataProvider: IDataProvider = {
    getHighlights: vi.fn().mockResolvedValue([]),
    getHighlightsByUrl: vi.fn().mockResolvedValue([]),
    saveHighlight: vi.fn().mockResolvedValue(undefined),
    deleteHighlight: vi.fn().mockResolvedValue(undefined),
    getCollections: vi.fn().mockResolvedValue([]),
    createCollection: vi.fn().mockResolvedValue('col-1'),
    syncWithCloud: vi.fn().mockResolvedValue(undefined),
} as unknown as IDataProvider;

beforeEach(() => {
    window.matchMedia = vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    });
});

const user = {
    id: 'u1',
    email: 'jane@example.com',
    displayName: 'Jane Doe',
};

function Wrap({ children }: { children: React.ReactNode }) {
    return (
        <MemoryRouter>
            <AppProvider dataProvider={mockDataProvider}>{children}</AppProvider>
        </MemoryRouter>
    );
}

function renderHeader(props: { isAuthenticated: boolean; user: typeof user | null }) {
    return render(
        <Wrap>
            <Header
                isAuthenticated={props.isAuthenticated}
                user={props.user}
                onLogout={vi.fn()}
            />
        </Wrap>
    );
}

describe('V2 Header (deprecated — use AppHeader)', () => {
    it('renders the brand mark with the project name', () => {
        renderHeader({ isAuthenticated: false, user: null });
        expect(screen.getByText('_underscore')).toBeInTheDocument();
    });

    it('shows the Dashboard link when authenticated', () => {
        renderHeader({ isAuthenticated: true, user });
        expect(screen.getByRole('button', { name: 'Dashboard' })).toBeInTheDocument();
    });

    it('hides the Dashboard link when unauthenticated', () => {
        renderHeader({ isAuthenticated: false, user: null });
        expect(screen.queryByRole('button', { name: 'Dashboard' })).not.toBeInTheDocument();
    });

    it('uses V2 --paper surface and --rule-soft border on the header', () => {
        const { baseElement } = renderHeader({ isAuthenticated: false, user: null });
        const html = baseElement.innerHTML;
        expect(html).toContain('var(--paper)');
        expect(html).toContain('var(--rule-soft)');
    });

    it('does not use Style C, MD3, or shadcn utility classes', () => {
        const { baseElement } = renderHeader({ isAuthenticated: true, user });
        const html = baseElement.innerHTML;
        expect(html).not.toMatch(/bg-card/);
        expect(html).not.toMatch(/border-border\b/);
        expect(html).not.toMatch(/text-foreground/);
        expect(html).not.toMatch(/text-muted-foreground/);
        expect(html).not.toMatch(/text-primary\b/);
        expect(html).not.toMatch(/text-title-medium/);
        expect(html).not.toMatch(/text-label-large/);
        expect(html).not.toMatch(/text-label-small/);
        expect(html).not.toMatch(/duration-short/);
        expect(html).not.toMatch(/text-destructive/);
    });

    it('has 44px minimum touch target on action buttons', () => {
        const { baseElement } = renderHeader({ isAuthenticated: true, user });
        const html = baseElement.innerHTML;
        expect(html).toMatch(/min-h-\[44px\]/);
    });
});
