import { Archive, Brain, Circle, Zap } from 'lucide-react';
import React from 'react';

import type { ModeType } from '@/shared/schemas/mode-state-schemas';

interface ModeCardProps {
    id: ModeType;
    name: string;
    description: string;
    hint: string;
    locked?: boolean;
    active?: boolean;
    onClick?: () => void;
    className?: string;
}

const MODE_ICONS: Record<ModeType, React.ReactNode> = {
    ephemeral: <Circle size={14} />,
    local: <Zap size={14} />,
    cloud: <Archive size={14} />,
    ai: <Brain size={14} />,
};

/**
 * Mode selection card — V2 Editorial reskin.
 * Uses V2 tokens only; no MD3, no Ink & Glass, no arbitrary utilities.
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- JSX return type inferred
export function ModeCard({
    id,
    name,
    description,
    hint: _hint,
    locked = false,
    active = false,
    onClick,
    className,
}: ModeCardProps) {
    return (
        <button
            type="button"
            onClick={locked ? undefined : onClick}
            disabled={locked}
            data-mode={id}
            className={className}
            style={{
                // Base
                position: 'relative',
                width: '100%',
                textAlign: 'left',
                borderRadius: 'var(--radius)',
                border: active
                    ? '1px solid var(--accent)'
                    : '1px solid var(--rule-soft)',
                padding: 16,
                overflow: 'hidden',
                cursor: locked ? 'not-allowed' : 'pointer',
                background: active ? 'var(--accent-tint-08)' : 'var(--paper)',
                transition: 'border-color 0.18s ease, background 0.18s ease',
                opacity: locked ? 0.4 : 1,
                // Reset button defaults
                fontFamily: 'var(--sans)',
                fontSize: 'var(--step-0)',
                color: 'var(--ink)',
            }}
        >
            {/* Card content */}
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Top row: icon + badge */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: 'var(--radius)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: active ? 'var(--accent-tint-18)' : 'var(--paper-2)',
                        color: active ? 'var(--accent)' : 'var(--ink-2)',
                    }}>
                        {MODE_ICONS[id]}
                    </div>
                    <span
                        className="u-mono"
                        style={{
                            fontSize: 'var(--step--2)',
                            fontWeight: 'bold',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            padding: '3px 8px',
                            borderRadius: 9999,
                            background: active ? 'var(--accent-tint-18)' : 'var(--paper-2)',
                            border: '1px solid var(--rule-soft)',
                            color: active ? 'var(--accent)' : 'var(--ink-3)',
                        }}
                    >
                        {locked ? 'Sign in' : active ? 'Active' : 'Free'}
                    </span>
                </div>

                {/* Labels */}
                <div>
                    <p style={{
                        fontSize: 'var(--step-1)',
                        fontWeight: 600,
                        letterSpacing: '-0.01em',
                        marginBottom: 4,
                        color: active ? 'var(--accent)' : 'var(--ink)',
                    }}>
                        {name}
                    </p>
                    <p className="u-serif" style={{
                        fontSize: 'var(--step-0)',
                        color: 'var(--ink-3)',
                        lineHeight: 1.45,
                        fontStyle: 'italic',
                    }}>
                        {description}
                    </p>
                </div>
            </div>
        </button>
    );
}
