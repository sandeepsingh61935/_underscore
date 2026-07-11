/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Dialog } from '../../../src/ui-system/components/primitives/Dialog';

describe('V2 Dialog', () => {
    it('renders nothing when closed', () => {
        const { container } = render(<Dialog open={false} onClose={() => {}}>x</Dialog>);
        expect(container.firstChild).toBeNull();
    });

    it('renders a dialog with role=dialog and aria-modal=true when open', () => {
        render(<Dialog open onClose={() => {}}>body</Dialog>);
        const dlg = screen.getByRole('dialog');
        expect(dlg).toHaveAttribute('aria-modal', 'true');
        expect(screen.getByText('body')).toBeInTheDocument();
    });

    it('calls onClose when the close button is clicked', () => {
        const onClose = vi.fn();
        render(<Dialog open onClose={onClose}>body</Dialog>);
        fireEvent.click(screen.getByLabelText('Close dialog'));
        expect(onClose).toHaveBeenCalledOnce();
    });

    it('calls onClose on Escape keypress', () => {
        const onClose = vi.fn();
        render(<Dialog open onClose={onClose}>body</Dialog>);
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledOnce();
    });

    it('uses V2 --paper surface (not MD3 bg-surface-container-highest)', () => {
        render(<Dialog open onClose={() => {}}>x</Dialog>);
        const dlg = screen.getByRole('dialog');
        const style = dlg.getAttribute('style') ?? '';
        expect(style).toContain('var(--paper)');
    });

    it('uses V2 --ink for text (not MD3 text-on-surface)', () => {
        render(<Dialog open onClose={() => {}}>x</Dialog>);
        const dlg = screen.getByRole('dialog');
        const style = dlg.getAttribute('style') ?? '';
        expect(style).toContain('var(--ink)');
    });

    it('renders a title with V2 step scale (not MD3 text-headline-small)', () => {
        render(<Dialog open onClose={() => {}} title="My Dialog">body</Dialog>);
        const title = screen.getByText('My Dialog');
        const style = title.getAttribute('style') ?? '';
        expect(style).toContain('var(--step-1)');
    });

    it('does not use MD3 utility classes', () => {
        render(<Dialog open onClose={() => {}} title="x">body</Dialog>);
        const html = document.body.innerHTML;
        expect(html).not.toMatch(/text-on-surface-variant/);
        expect(html).not.toMatch(/text-on-surface\b/);
        expect(html).not.toMatch(/text-body-medium/);
        expect(html).not.toMatch(/border-outline-variant/);
        expect(html).not.toMatch(/bg-surface-container-highest/);
    });

    it('portals the dialog to document.body with fixed positioning', () => {
        render(<Dialog open onClose={() => {}} title="Test">body</Dialog>);
        const dlg = screen.getByRole('dialog');
        expect(dlg.parentElement?.parentElement).toBe(document.body);
        const style = dlg.getAttribute('style') ?? '';
        expect(style).toContain('flex');
        expect(style).toContain('var(--paper)');
    });

    it('does not leak keydown listeners when toggled open then closed', () => {
        const onClose = vi.fn();
        const { rerender } = render(<Dialog open onClose={onClose}>body</Dialog>);
        const addSpy = vi.spyOn(document, 'addEventListener');
        const removeSpy = vi.spyOn(document, 'removeEventListener');

        rerender(<Dialog open={false} onClose={onClose}>body</Dialog>);

        const removeCalls = removeSpy.mock.calls.filter((c) => c[0] === 'keydown');
        expect(removeCalls.length).toBeGreaterThanOrEqual(1);

        addSpy.mockRestore();
        removeSpy.mockRestore();
    });
});
