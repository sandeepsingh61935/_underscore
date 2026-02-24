import React from 'react';
import { ModeSelector } from '../components/composed/ModeSelector';
import { cn } from '../utils/cn';

export interface ModeSelectionPageProps {
    selectedMode: string;
    onModeSelect: (modeId: string) => void;
    isAuthenticated: boolean;
    onSignInClick: () => void;
    className?: string;
}

export function ModeSelectionPage({
    selectedMode,
    onModeSelect,
    isAuthenticated,
    onSignInClick,
    className
}: ModeSelectionPageProps) {
    return (
        <div className={cn("flex flex-col h-full bg-surface text-on-surface", className)}>
            {/* Header handled by AppShell usually, but page content starts here */}

            <main className="flex-1 flex flex-col items-center px-4 py-8 w-full max-w-md mx-auto">
                <div className="w-full flex flex-col items-center">
                    {/* Title */}
                    <h1 className="text-center text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground mb-8">
                        Select Mode
                    </h1>

                    {/* Mode Selector */}
                    <ModeSelector
                        currentModeId={selectedMode}
                        onSelect={onModeSelect}
                        isAuthenticated={isAuthenticated}
                        className="w-full"
                    />

                    {/* Call to Action */}
                    {!isAuthenticated && (
                        <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
                            <button
                                onClick={onSignInClick}
                                className="group flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors px-4 py-2 rounded-full hover:bg-secondary/50"
                            >
                                <span>Sign in to unlock vault and archive</span>
                                <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
