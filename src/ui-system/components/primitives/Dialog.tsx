/**
 * V2 Dialog Component
 * Surface: --paper (clean editorial surface, not MD3 surface-container-highest).
 * Border instead of shadow. X close button is 48x48 (V2 spec accepts up to 48px
 * on icon-only close affordances; the standard 44px touch target is the floor).
 */

import { X } from 'lucide-react';
import React, { useEffect, useRef } from 'react';

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
        const handleEscape = (e: KeyboardEvent): void => { if (e.key === 'Escape' && open) onClose(); };
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
            const handleTab = (e: KeyboardEvent): void => {
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
                className="fixed inset-0 z-50 animate-in fade-in backdrop-blur-sm"
                style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
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
                        'rounded w-full max-w-md max-h-[90vh]',
                        'flex flex-col',
                        'animate-in zoom-in-95 fade-in',
                        className
                    )}
                    style={{
                        backgroundColor: 'var(--paper)',
                        color: 'var(--ink)',
                        border: '1px solid var(--rule)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {(title || !hideCloseButton) && (
                        <div className="flex items-center justify-between p-6 pb-4">
                            {title && (
                                <h2
                                    id="dialog-title"
                                    className="font-serif"
                                    style={{ color: 'var(--ink)', fontSize: 'var(--step-3)' }}
                                >
                                    {title}
                                </h2>
                            )}
                            {!hideCloseButton && (
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className={cn(
                                        'w-[44px] h-[44px] flex items-center justify-center',
                                        'rounded-full border-0 cursor-pointer',
                                        'transition-colors',
                                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2',
                                        title ? 'ml-auto' : ''
                                    )}
                                    style={{ color: 'var(--ink-2)' }}
                                    aria-label="Close dialog"
                                >
                                    <X className="w-[24px] h-[24px]" />
                                </button>
                            )}
                        </div>
                    )}
                    <div
                        className="flex-1 overflow-y-auto px-6 py-4"
                        style={{ color: 'var(--ink-2)', fontSize: 'var(--step-0)' }}
                    >
                        {children}
                    </div>
                    {actions && (
                        <div
                            className="flex items-center justify-end gap-2 p-6 pt-4"
                            style={{ borderTop: '1px solid var(--rule-soft)' }}
                        >
                            {actions}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

Dialog.displayName = 'Dialog';
