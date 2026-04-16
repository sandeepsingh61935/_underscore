import React from 'react';

import { Logo } from '@/ui-system/components/primitives/Logo';

export function EmptyCollectionsState() {
    return (
        <div className="flex-1 flex flex-col items-center justify-center px-8 -mt-12">
            <div className="flex justify-center mb-8">
                <Logo size="lg" showText={false} />
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
