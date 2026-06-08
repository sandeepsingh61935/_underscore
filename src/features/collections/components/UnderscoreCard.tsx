import { Copy, Trash2, Clock } from 'lucide-react';
import React from 'react';

interface UnderscoreCardProps {
    id: string;
    text: string;
    url: string;
    timestamp: string;
    isCode?: boolean;
    onCopy: (id: string) => void;
    onDelete: (id: string) => void;
}

export function UnderscoreCard({
    id,
    text,
    url,
    timestamp,
    isCode = false,
    onCopy,
    onDelete,
}: UnderscoreCardProps): React.JSX.Element {
    return (
        <article className="u-card-row">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                {isCode ? (
                    <div style={{ width: '100%' }}>
                        <p
                            className="u-mono"
                            style={{
                                fontSize: 'var(--step-0)',
                                color: 'var(--ink)',
                                background: 'var(--paper-2)',
                                padding: 12,
                                borderRadius: 'var(--radius)',
                                border: '1px solid var(--rule-soft)',
                                margin: 0,
                            }}
                        >
                            {text}
                        </p>
                    </div>
                ) : (
                    <p style={{ fontSize: 'var(--step-1)', color: 'var(--ink)', lineHeight: 1.55, margin: 0 }}>
                        {text}
                    </p>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button
                        type="button"
                        onClick={() => onCopy(id)}
                        className="u-icon-btn"
                        aria-label="Copy to clipboard"
                    >
                        <Copy size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={() => onDelete(id)}
                        className="u-icon-btn"
                        aria-label="Delete highlight"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {/* Metadata */}
            <div
                className="u-mono"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 'var(--step--2)',
                    color: 'var(--ink-3)',
                }}
            >
                <Clock size={12} />
                <time>{timestamp}</time>
                <span style={{ width: 3, height: 3, borderRadius: 9999, background: 'var(--ink-3)', display: 'inline-block' }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</span>
            </div>
        </article>
    );
}
