/**
 * MD3 Dialog Component
 * @see https://m3.material.io/components/dialogs/overview
 */

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface DialogProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    actions?: React.ReactNode;
    hideCloseButton?: boolean;
    className?: string;
}

export function Dialog({ open, onClose, title, children, actions, hideCloseButton, className }: DialogProps): React.ReactNode {
    const dialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) onClose(); };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [open, onClose]);

    useEffect(() => {
        document.body.style.overflow = open ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    useEffect(() => {
        if (open && dialogRef.current) {
            const focusable = dialogRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            const first = focusable[0] as HTMLElement;
            const last = focusable[focusable.length - 1] as HTMLElement;
            const handleTab = (e: KeyboardEvent) => {
                if (e.key !== 'Tab') return;
                if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
            };
            document.addEventListener('keydown', handleTab);
            first?.focus();
            return () => document.removeEventListener('keydown', handleTab);
        }
    }, [open]);

    if (!open) return null;

    return (
        <>
            <div
                className="fixed inset-0 z-50 bg-scrim/40 animate-in fade-in duration-medium backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    ref={dialogRef}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={title ? 'dialog-title' : undefined}
                    className={cn(
                        'rounded-xl',                        // MD3 extra-large (28px)
                        'bg-surface-container-highest',
                        'text-on-surface',
                        'w-full max-w-md max-h-[90vh]',
                        'flex flex-col',
                        'shadow-elevation-3',
                        'animate-in zoom-in-95 fade-in duration-medium ease-emphasized',
                        className
                    )}
                    onClick={(e) => e.stopPropagation()}
                >
                    {(title || !hideCloseButton) && (
                        <div className="flex items-center justify-between p-6 pb-4">
                            {title && <h2 id="dialog-title" className="text-headline-small text-on-surface">{title}</h2>}
                            {!hideCloseButton && (
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className={cn(
                                        'w-[48px] h-[48px] flex items-center justify-center',
                                        'rounded-full',
                                        'text-on-surface-variant',
                                        'hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-surface)_8%,transparent)]',
                                        'active:bg-[color-mix(in_srgb,var(--md-sys-color-on-surface)_12%,transparent)]',
                                        'transition-colors duration-short',
                                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                                        title ? 'ml-auto' : ''
                                    )}
                                    aria-label="Close dialog"
                                >
                                    <X className="w-[24px] h-[24px]" />
                                </button>
                            )}
                        </div>
                    )}
                    <div className="flex-1 overflow-y-auto px-6 py-4 text-body-medium text-on-surface-variant">{children}</div>
                    {actions && (
                        <div className="flex items-center justify-end gap-2 p-6 pt-4 border-t border-outline-variant">{actions}</div>
                    )}
                </div>
            </div>
        </>
    );
}

Dialog.displayName = 'Dialog';
