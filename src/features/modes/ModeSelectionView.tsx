import React from 'react';
import { useNavigate } from 'react-router-dom';

import { ModeCard } from './ModeCard';
import { useModeTransition } from './useModeTransition';

import { useApp } from '@/core/context/AppProvider';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { AppHeader } from '@/ui-system/components/layout/AppHeader';
import { Button } from '@/ui-system/components/primitives/Button';
import { Spinner } from '@/ui-system/components/primitives/Spinner';
import { cn } from '@/ui-system/utils/cn';

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
export function ModeSelectionView({ onModeSelect, onSignInClick, onBack }: ModeSelectionViewProps = {}): React.JSX.Element {
    const navigate = useNavigate();
    const { currentMode, isAuthenticated } = useApp();
    const {
        isPending,
        confirmMessage,
        requestTransition,
        confirmTransition,
        cancelTransition,
    } = useModeTransition();

    const handleCardClick = (modeId: ModeType): void => {
        if (onModeSelect) {
            onModeSelect(modeId);
        } else {
            requestTransition(modeId);
        }
    };

    const handleAuthClick = (e: React.MouseEvent): void => {
        e.preventDefault();
        if (onSignInClick) {
            onSignInClick();
        } else {
            navigate('/sign-in');
        }
    };

    return (
        <div className="h-full w-full flex flex-col overflow-y-auto bg-surface text-on-surface">
            <AppHeader
                variant={onBack ? 'sub' : 'standalone'}
                onBack={onBack}
                backLabel="Back"
            />

            {/* Content box — flex-1 fills remaining space, nudge pins to bottom */}
            <main className="w-full max-w-[480px] mx-auto flex-1 flex flex-col px-6 pt-5 pb-4 min-h-0">
                {/* Section label */}
                <div className="w-full text-left mb-3">
                    <p className="text-label-small font-medium uppercase tracking-[0.18em] text-outline">
                        Mode
                    </p>
                </div>

                {/* Mode cards — 2×2 grid */}
                <div className="w-full grid grid-cols-2 gap-2">
                    {MODE_OPTIONS.map(opt => (
                        <React.Fragment key={opt.id}>
                            <ModeCard
                                id={opt.id}
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

                {/* Spacer pushes auth nudge to the bottom */}
                <div className="flex-1 min-h-4" />

                {/* Auth nudge — always fully visible */}
                {!isAuthenticated && (
                    <div className={cn(
                        'mx-1 p-3 rounded-[10px]',
                        'bg-[color-mix(in_srgb,var(--ink-neural)_7%,transparent)]',
                        'border border-[color-mix(in_srgb,var(--ink-neural)_18%,transparent)]',
                        'flex items-center justify-between gap-3',
                    )}>
                        <p className="text-[12px] text-on-surface-variant leading-[1.45]">
                            Sign in to unlock Memory and Neural modes.
                        </p>
                        <button
                            type="button"
                            onClick={handleAuthClick}
                            className={cn(
                                'flex-shrink-0 px-4 py-2 rounded-full',
                                'bg-[var(--ink-neural)] text-[var(--ink-1)]',
                                'text-[11px] font-bold',
                                'transition-transform duration-[200ms]',
                                'hover:scale-[1.05]',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                            )}
                            style={{ transitionTimingFunction: 'var(--ink-ease-spring)' }}
                        >
                            Sign in →
                        </button>
                    </div>
                )}
            </main>

            {/* Confirmation modal overlay */}
            {confirmMessage && (
                <div
                    className="fixed inset-0 z-[300] flex items-center justify-center bg-scrim/35 backdrop-blur-sm"
                    onClick={cancelTransition}
                >
                    <div
                        className="w-[90%] max-w-[360px] rounded-xl overflow-hidden p-7 text-center relative bg-surface-container-highest border border-outline-variant shadow-elevation-3 animate-in zoom-in-95 fade-in duration-medium ease-decelerate"
                        onClick={e => e.stopPropagation()}
                    >
                        <p className="text-title-medium font-semibold mb-2">
                            Switch mode?
                        </p>
                        <p className="text-body-small text-on-surface-variant mb-6 leading-relaxed">
                            {confirmMessage}
                        </p>
                        <div className="flex gap-2 justify-center">
                            <Button variant="outlined" onClick={cancelTransition}>
                                Cancel
                            </Button>
                            <Button variant="filled" onClick={confirmTransition}>
                                Switch
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Spinner overlay during transition */}
            {isPending && (
                <div className="fixed inset-0 z-[400] flex flex-col items-center justify-center gap-4 bg-scrim/50 backdrop-blur-md">
                    <Spinner size="lg" />
                    <p className="text-body-medium text-white font-medium">
                        Switching mode…
                    </p>
                </div>
            )}
        </div>
    );
}
