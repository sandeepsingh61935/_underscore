import React from 'react';

import { Logo } from '@/ui-system/components/primitives/Logo';

export function EmptyCollectionsState() {
    return (
        <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 32px',
            marginTop: -48,
        }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
                <Logo size="lg" showText={false} />
            </div>

            {/* Heading */}
            <h2
                className="u-serif"
                style={{
                    fontSize: 'var(--step-4)',
                    color: 'var(--ink)',
                    marginBottom: 16,
                    textAlign: 'center',
                }}
            >
                Simply underscore.
            </h2>

            {/* Subtitle */}
            <p style={{
                fontSize: 'var(--step-1)',
                color: 'var(--ink-3)',
                maxWidth: 420,
                textAlign: 'center',
                lineHeight: 1.55,
            }}>
                Your browser extension for minimalist note-taking. Sign in to sync your thoughts across devices.
            </p>
        </div>
    );
}
