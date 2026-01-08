import React from 'react';

export function EmptyCollectionsState() {
    return (
        <div className="flex-1 flex flex-col items-center justify-center px-8 -mt-12">
            {/* Logo Circle */}
            <div className="flex justify-center mb-8">
                <div className="w-24 h-24 rounded-full bg-bg-surface-light dark:bg-bg-surface-dark shadow-sm flex items-center justify-center text-text-muted-light dark:text-text-muted-dark border border-border-light dark:border-border-dark">
                    <span className="text-4xl font-extrabold select-none opacity-70">_</span>
                </div>
            </div>

            {/* Heading */}
            <h2 className="text-3xl lg:text-4xl font-light tracking-tight text-text-primary-light dark:text-text-primary-dark mb-4">
                Simply underscore.
            </h2>

            {/* Subtitle */}
            <p className="text-text-secondary-light dark:text-text-secondary-dark max-w-md mx-auto text-center leading-relaxed font-light">
                Your browser extension for minimalist note-taking. Sign in to sync your thoughts across devices.
            </p>
        </div>
    );
}
