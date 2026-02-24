import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/core/context/AppProvider';
import { Logo } from '@/ui-system/components/primitives/Logo';
import { Spinner } from '@/ui-system/components/primitives/Spinner';
import { ModeCard } from './ModeCard';
import { useModeTransition } from './useModeTransition';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';

/** Internal mode → display name + UX copy */
const MODE_OPTIONS: Array<{
    id: ModeType;
    name: string;
    description: string;
    hint: string;
    requiresAuth: boolean;
}> = [
        {
            id: 'walk',
            name: 'Focus',
            description: 'Session-only highlighting for distraction-free browsing.',
            hint: 'Session-only — highlights clear when you close the page',
            requiresAuth: false,
        },
        {
            id: 'sprint',
            name: 'Capture',
            description: 'Persistent highlighting with cloud sync across devices.',
            hint: 'Access your collections anywhere, across all devices',
            requiresAuth: false,
        },
        {
            id: 'vault',
            name: 'Memory',
            description: 'Long-term knowledge archival with encrypted storage.',
            hint: 'Your highlights become a personal knowledge base',
            requiresAuth: true,
        },
        {
            id: 'neural',
            name: 'Neural',
            description: 'AI-powered connections across your highlights.',
            hint: 'Turn your highlights into smart, connected notes',
            requiresAuth: true,
        },
    ];

export interface ModeSelectionViewProps {
    /** Optional callback for popup context routing */
    onModeSelect?: (modeId: string) => void;
    /** Optional callback for popup authentication routing */
    onSignInClick?: () => void;
    /** Optional callback to navigate back to previous screen */
    onBack?: () => void;
}

/**
 * Mode Selection View — adapts dynamically to popup (400x600) and web (full screen)
 * Centered logo, 4 mode cards, auth nudge, confirmation modal + spinner overlay
 */
export function ModeSelectionView({ onModeSelect, onSignInClick, onBack }: ModeSelectionViewProps = {}) {
    const navigate = useNavigate();
    const { currentMode, isAuthenticated } = useApp();
    const {
        isPending,
        confirmMessage,
        requestTransition,
        confirmTransition,
        cancelTransition,
    } = useModeTransition();

    const handleCardClick = (modeId: ModeType) => {
        if (onModeSelect) {
            onModeSelect(modeId);
        } else {
            requestTransition(modeId);
        }
    };

    const handleAuthClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (onSignInClick) {
            onSignInClick();
        } else {
            navigate('/sign-in');
        }
    };

    return (
        <div
            className="h-full w-full flex flex-col items-center justify-between py-2 overflow-y-auto"
            style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}
        >
            {/* Header */}
            <header className="w-full max-w-[480px] flex justify-between items-center px-6 shrink-0 z-10 sticky top-0 py-4"
                style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', backgroundColor: 'var(--bg-glass, rgba(249, 249, 255, 0.8))' }}>
                <div className="flex-1 flex justify-start">
                    {onBack && (
                        <a
                            href="#"
                            className="inline-flex items-center gap-1.5 text-[13px] no-underline transition-colors hover:text-[var(--accent)]"
                            style={{ color: 'var(--text-tertiary)' }}
                            onClick={e => {
                                e.preventDefault();
                                onBack();
                            }}
                        >
                            ← Back
                        </a>
                    )}
                </div>
                <div className="flex-none flex justify-center">
                    <Logo size="md" />
                </div>
                {/* Empty flex-1 div to perfectly center the logo against the back button */}
                <div className="flex-1" />
            </header>

            {/* Content box — stretch to take remaining height but compress on small screens */}
            <main className="w-full max-w-[480px] flex-1 flex flex-col items-center justify-center py-6 px-6">
                {/* Section label */}
                <div className="w-full text-left mb-3">
                    <p
                        className="text-[11px] font-medium uppercase tracking-[0.18em]"
                        style={{ color: 'var(--text-tertiary)' }}
                    >
                        Mode
                    </p>
                </div>

                {/* Mode cards */}
                <div className="w-full flex flex-col gap-1.5 mb-6">
                    {MODE_OPTIONS.map(opt => (
                        <React.Fragment key={opt.id}>
                            {opt.id === 'vault' && (
                                <div className="h-2 w-full" aria-hidden="true" />
                            )}
                            <ModeCard
                                name={opt.name}
                                description={opt.description}
                                hint={opt.hint}
                                active={currentMode === opt.id}
                                locked={opt.requiresAuth && !isAuthenticated}
                                onClick={() => handleCardClick(opt.id)}
                            />
                        </React.Fragment>
                    ))}
                </div>

                {/* Auth nudge */}
                {!isAuthenticated && (
                    <div
                        className="text-center text-[13px] py-4 rounded-[var(--radius)] mb-4"
                        style={{
                            background: 'var(--accent-soft)',
                            color: 'var(--accent-text)',
                        }}
                    >
                        <button
                            onClick={handleAuthClick}
                            className="font-medium underline bg-transparent border-none p-0 cursor-pointer"
                            style={{ color: 'var(--accent-text)', fontSize: 'inherit' }}
                        >
                            Create an account
                        </button>
                        {' '}to unlock your full knowledge workspace.
                    </div>
                )}
            </main>

            {/* Confirmation modal overlay */}
            {confirmMessage && (
                <div
                    className="fixed inset-0 z-[300] flex items-center justify-center"
                    style={{
                        background: 'rgba(0,0,0,0.35)',
                        backdropFilter: 'blur(4px)',
                        WebkitBackdropFilter: 'blur(4px)',
                    }}
                    onClick={cancelTransition}
                >
                    <div
                        className="w-[90%] max-w-[360px] rounded-[var(--radius)] overflow-hidden p-7 text-center relative"
                        style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            boxShadow: 'var(--shadow-hover)',
                            animation: 'cardIn 0.18s ease-out',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <p
                            className="text-[16px] font-semibold mb-2"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            Switch mode?
                        </p>
                        <p
                            className="text-[13px] mb-6 leading-relaxed"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            {confirmMessage}
                        </p>
                        <div className="flex gap-2 justify-center">
                            <button
                                onClick={cancelTransition}
                                className="px-5 py-2.5 rounded-[var(--radius-sm)] text-[13px] font-medium cursor-pointer transition-all duration-150"
                                style={{
                                    background: 'transparent',
                                    border: '1px solid var(--border)',
                                    color: 'var(--text-secondary)',
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmTransition}
                                className="px-5 py-2.5 rounded-[var(--radius-sm)] text-[13px] font-medium text-white border-none cursor-pointer transition-all duration-150 hover:-translate-y-0.5"
                                style={{ background: 'var(--accent)' }}
                            >
                                Switch
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Spinner overlay during transition */}
            {isPending && (
                <div
                    className="fixed inset-0 z-[400] flex flex-col items-center justify-center gap-4"
                    style={{
                        background: 'rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(6px)',
                        WebkitBackdropFilter: 'blur(6px)',
                    }}
                >
                    <Spinner size="lg" />
                    <p className="text-[14px] text-white font-medium">
                        Switching mode…
                    </p>
                </div>
            )}
        </div>
    );
}
