import React from 'react';
import type { ModeDefinition } from './registry';

interface ModeSelectorProps {
    modes: ModeDefinition[];
    currentModeId: string;
    onSelect: (modeId: string) => void;
    disabled?: boolean;
}

export function ModeSelector({ modes, currentModeId, onSelect, disabled }: ModeSelectorProps): React.JSX.Element {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
            {modes.map((mode) => {
                const isActive = mode.id === currentModeId;

                return (
                    <button
                        key={mode.id}
                        type="button"
                        onClick={() => onSelect(mode.id)}
                        disabled={disabled}
                        className="u-card-row"
                        style={{
                            alignItems: 'flex-start',
                            textAlign: 'left',
                            padding: 24,
                            margin: 0,
                            background: isActive ? 'var(--paper-2)' : 'transparent',
                            borderColor: isActive ? 'var(--rule)' : 'var(--rule-soft)',
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            opacity: disabled ? 0.5 : 1,
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 4 }}>
                            <h2 
                                className="u-serif"
                                style={{ 
                                    fontSize: 'var(--step-4)', 
                                    color: isActive ? 'var(--accent)' : 'var(--ink)',
                                    fontWeight: 300,
                                    margin: 0
                                }}
                            >
                                {mode.name}
                            </h2>

                            {mode.badge && (
                                <span 
                                    className="u-mono"
                                    style={{ 
                                        padding: '4px 8px', 
                                        fontSize: 'var(--step--2)',
                                        borderRadius: 9999,
                                        background: 'var(--paper-2)',
                                        color: 'var(--ink-3)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.14em'
                                    }}
                                >
                                    {mode.badge}
                                </span>
                            )}
                        </div>

                        <p 
                            className="u-serif"
                            style={{ 
                                fontSize: 'var(--step-0)',
                                color: isActive ? 'var(--ink)' : 'var(--ink-3)',
                                fontStyle: 'italic',
                                margin: 0,
                                lineHeight: 1.45
                            }}
                        >
                            {mode.blurb}
                        </p>
                    </button>
                );
            })}
        </div>
    );
}
