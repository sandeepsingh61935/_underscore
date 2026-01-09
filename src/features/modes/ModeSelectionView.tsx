import React from 'react';
import { Logo } from '../../ui-system/components/primitives/Logo';
import { modeRegistry } from '../modes/registry';

interface ModeSelectionViewProps {
    onModeSelect: (modeId: string) => void;
    onSignInClick: () => void;
}

/**
 * Mode Selection View - Direct copy from design mockup
 * Source: /docs/07-design/mode-selection/mode-selection-code.html
 */
export function ModeSelectionView({ onModeSelect, onSignInClick }: ModeSelectionViewProps) {
    const modes = modeRegistry.getAvailable(false); // Unauthenticated user
    const allModes = [
        modeRegistry.get('focus'),
        modeRegistry.get('capture'),
        modeRegistry.get('memory'),
        modeRegistry.get('neural'),
    ].filter(Boolean);

    return (
        <div className="bg-background-light dark:bg-background-dark font-display antialiased min-h-screen flex flex-col items-center justify-between p-4 md:p-8">
            <header className="w-full max-w-screen-xl flex justify-between items-center py-4 px-0 md:px-4 mb-auto">
                <Logo showText={true} />
                <div>
                    <a
                        className="text-text-secondary dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors no-underline text-lg md:text-xl font-light underline-offset-4 hover:underline cursor-pointer"
                        onClick={onSignInClick}
                    >
                        Sign In
                    </a>
                </div>
            </header>

            <div className="w-full max-w-[480px] flex flex-col items-center flex-grow justify-center py-10">
                <div className="w-full flex justify-center mb-10">
                    <p className="text-text-secondary dark:text-gray-400 text-xs font-medium tracking-[0.2em] uppercase">Mode</p>
                </div>

                <div className="flex flex-col items-center gap-6 w-full">
                    {allModes.map((mode, index) => {
                        if (!mode) return null;

                        const isAvailable = modes.some(m => m.id === mode.id);

                        // Add spacer after Capture (index 1)
                        if (index === 2) {
                            return (
                                <React.Fragment key={`spacer-${mode.id}`}>
                                    <div className="h-4 w-full"></div>
                                    {isAvailable ? (
                                        <button
                                            className="mode-item group relative flex items-center justify-center w-full py-2 bg-transparent border-none cursor-pointer focus:outline-none"
                                            onClick={() => onModeSelect(mode.id)}
                                        >
                                            <span className="text-text-primary dark:text-white text-3xl md:text-4xl font-light tracking-tight group-hover:text-primary transition-colors">
                                                {mode.name}
                                            </span>
                                        </button>
                                    ) : (
                                        <div
                                            aria-disabled="true"
                                            className="flex items-center justify-center w-full py-2 opacity-40 select-none cursor-not-allowed"
                                        >
                                            <span className="text-text-primary dark:text-white text-3xl md:text-4xl font-light tracking-tight">
                                                {mode.name}
                                            </span>
                                        </div>
                                    )}
                                </React.Fragment>
                            );
                        }

                        return isAvailable ? (
                            <button
                                key={mode.id}
                                className="mode-item group relative flex items-center justify-center w-full py-2 bg-transparent border-none cursor-pointer focus:outline-none"
                                onClick={() => onModeSelect(mode.id)}
                            >
                                <span className="text-text-primary dark:text-white text-3xl md:text-4xl font-light tracking-tight group-hover:text-primary transition-colors">
                                    {mode.name}
                                </span>
                            </button>
                        ) : (
                            <div
                                key={mode.id}
                                aria-disabled="true"
                                className="flex items-center justify-center w-full py-2 opacity-40 select-none cursor-not-allowed"
                            >
                                <span className="text-text-primary dark:text-white text-3xl md:text-4xl font-light tracking-tight">
                                    {mode.name}
                                </span>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-16 text-center">
                    <a
                        className="group flex items-center gap-1.5 text-sm text-text-secondary dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors no-underline cursor-pointer"
                        onClick={onSignInClick}
                    >
                        <span>Sign in to unlock vault and archive</span>
                        <span className="text-[16px] group-hover:translate-x-0.5 transition-transform">→</span>
                    </a>
                </div>
            </div>

            <div className="w-full mb-auto md:mb-8"></div>
        </div>
    );
}
