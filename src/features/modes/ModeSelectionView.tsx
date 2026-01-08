import React from 'react';
import { Logo } from '../../ui-system/components/primitives/Logo';
import { modeRegistry } from '../modes/registry';
import { ArrowRight } from 'lucide-react';

interface ModeSelectionViewProps {
    onModeSelect: (modeId: string) => void;
    onSignInClick: () => void;
}

export function ModeSelectionView({ onModeSelect, onSignInClick }: ModeSelectionViewProps) {
    const modes = modeRegistry.getAvailable(false); // Unauthenticated user
    const allModes = [
        modeRegistry.get('focus'),
        modeRegistry.get('capture'),
        modeRegistry.get('memory'),
        modeRegistry.get('neural'),
    ].filter(Boolean);

    return (
        <div className="w-[360px] h-[600px] bg-bg-base-light dark:bg-bg-base-dark font-display antialiased flex flex-col items-center justify-between p-6">
            {/* Header with Logo + Sign In */}
            <header className="w-full flex justify-between items-center">
                <Logo showText={true} />
                <button
                    onClick={onSignInClick}
                    className="text-text-secondary-light dark:text-text-secondary-dark hover:text-primary dark:hover:text-primary transition-colors text-lg font-light underline-offset-4 hover:underline"
                >
                    Sign In
                </button>
            </header>

            {/* Main Content - Centered */}
            <div className="flex-1 flex flex-col items-center justify-center w-full -mt-12">
                {/* MODE Label */}
                <div className="flex justify-center mb-10">
                    <p className="text-text-secondary-light dark:text-text-secondary-dark text-xs font-medium tracking-[0.2em] uppercase">
                        Mode
                    </p>
                </div>

                {/* Mode Selection Buttons */}
                <div className="flex flex-col items-center gap-6 w-full">
                    {allModes.map((mode, index) => {
                        if (!mode) return null;

                        const isAvailable = modes.some(m => m.id === mode.id);

                        // Add spacer after Capture (index 1)
                        if (index === 2) {
                            return (
                                <React.Fragment key={`spacer-${mode.id}`}>
                                    <div className="h-4" />
                                    <button
                                        disabled={!isAvailable}
                                        onClick={() => isAvailable && onModeSelect(mode.id)}
                                        className={`
                      group relative flex items-center justify-center w-full py-2
                      bg-transparent border-none
                      ${isAvailable
                                                ? 'cursor-pointer'
                                                : 'opacity-40 cursor-not-allowed select-none'
                                            }
                      focus:outline-none
                    `}
                                    >
                                        <span
                                            className={`
                        text-4xl font-light tracking-tight
                        ${isAvailable
                                                    ? 'text-text-primary-light dark:text-text-primary-dark group-hover:text-primary transition-colors'
                                                    : 'text-text-primary-light dark:text-text-primary-dark'
                                                }
                      `}
                                        >
                                            {mode.name}
                                        </span>
                                    </button>
                                </React.Fragment>
                            );
                        }

                        return (
                            <button
                                key={mode.id}
                                disabled={!isAvailable}
                                onClick={() => isAvailable && onModeSelect(mode.id)}
                                className={`
                  group relative flex items-center justify-center w-full py-2
                  bg-transparent border-none
                  ${isAvailable
                                        ? 'cursor-pointer'
                                        : 'opacity-40 cursor-not-allowed select-none'
                                    }
                  focus:outline-none
                `}
                            >
                                <span
                                    className={`
                    text-4xl font-light tracking-tight
                    ${isAvailable
                                            ? 'text-text-primary-light dark:text-text-primary-dark group-hover:text-primary transition-colors'
                                            : 'text-text-primary-light dark:text-text-primary-dark'
                                        }
                  `}
                                >
                                    {mode.name}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Sign-in Hint */}
                <div className="mt-16 text-center">
                    <button
                        onClick={onSignInClick}
                        className="group flex items-center gap-1.5 text-sm text-text-secondary-light dark:text-text-secondary-dark hover:text-primary dark:hover:text-primary transition-colors"
                    >
                        <span>Sign in to unlock vault and archive</span>
                        <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>
                </div>
            </div>

            {/* Footer Spacer */}
            <div className="mb-8" />
        </div>
    );
}
