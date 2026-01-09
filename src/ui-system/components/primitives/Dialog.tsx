/**
 * Material Design 3 Dialog Component
 * 
 * Implements MD3 dialog specification with:
 * - 28dp extra-large rounded corners
 * - Scrim overlay
 * - Enter/exit animations
 * - Focus trapping
 * 
 * @see https://m3.material.io/components/dialogs/overview
 */

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface DialogProps {
    /**
     * Controls dialog visibility
     */
    open: boolean;

    /**
     * Callback when dialog should close
     */
    onClose: () => void;

    /**
     * Dialog title
     */
    title?: string;

    /**
     * Dialog content
     */
    children: React.ReactNode;

    /**
     * Footer actions
     */
    actions?: React.ReactNode;

    /**
     * Don't show close button
     */
    hideCloseButton?: boolean;

    /**
     * Custom className for dialog container
     */
    className?: string;
}

export function Dialog({
    open,
    onClose,
    title,
    children,
    actions,
    hideCloseButton,
    className,
}: DialogProps) {
    const dialogRef = useRef<HTMLDivElement>(null);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && open) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [open, onClose]);

    // Lock body scroll when dialog is open
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [open]);

    // Focus trap
    useEffect(() => {
        if (open && dialogRef.current) {
            const focusableElements = dialogRef.current.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const firstElement = focusableElements[0] as HTMLElement;
            const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

            const handleTab = (e: KeyboardEvent) => {
                if (e.key !== 'Tab') return;

                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement?.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement?.focus();
                    }
                }
            };

            document.addEventListener('keydown', handleTab);
            firstElement?.focus();

            return () => document.removeEventListener('keydown', handleTab);
        }
    }, [open]);

    if (!open) return null;

    return (
        <>
            {/* Scrim overlay */}
            <div
                className={cn(
                    'fixed inset-0 z-50 bg-scrim/40',
                    'animate-in fade-in duration-medium',
                    'backdrop-blur-sm'
                )}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Dialog */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    ref={dialogRef}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={title ? 'dialog-title' : undefined}
                    className={cn(
                        // MD3 Shape: Extra large rounded corners (28dp)
                        'rounded-xl',

                        // MD3 Surface: Surface container highest
                        'bg-surface-container-highest',
                        'text-on-surface',

                        // Sizing
                        'w-full max-w-md max-h-[90vh]',

                        // Flex layout
                        'flex flex-col',

                        // MD3 Elevation
                        'shadow-elevation-3',

                        // Animations
                        'animate-in zoom-in-95 fade-in duration-medium ease-emphasized',

                        className
                    )}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    {(title || !hideCloseButton) && (
                        <div className="flex items-center justify-between p-6 pb-4">
                            {title && (
                                <h2
                                    id="dialog-title"
                                    className="text-headline-small text-on-surface"
                                >
                                    {title}
                                </h2>
                            )}
                            {!hideCloseButton && (
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className={cn(
                                        'w-[40px] h-[40px] flex items-center justify-center',
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

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-6 py-4 text-body-medium text-on-surface-variant">
                        {children}
                    </div>

                    {/* Actions */}
                    {actions && (
                        <div className="flex items-center justify-end gap-2 p-6 pt-4 border-t border-outline-variant">
                            {actions}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

Dialog.displayName = 'Dialog';
