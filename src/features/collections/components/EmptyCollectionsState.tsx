import React from 'react';

export function EmptyCollectionsState() {
    return (
        <div className="flex-1 flex flex-col items-center justify-center px-8 -mt-12">
            {/* Logo Circle */}
            <div className="flex justify-center mb-8">
                <div className="w-24 h-24 rounded-full bg-surface-container shadow-elevation-1 flex items-center justify-center text-on-surface-variant border border-outline">
                    <span className="text-4xl font-extrabold select-none opacity-70">_</span>
                </div>
            </div>

            {/* Heading */}
            <h2 className="text-headline-large text-on-surface mb-4">
                Simply underscore.
            </h2>

            {/* Subtitle */}
            <p className="text-body-large text-on-surface-variant max-w-md mx-auto text-center">
                Your browser extension for minimalist note-taking. Sign in to sync your thoughts across devices.
            </p>
        </div>
    );
}
