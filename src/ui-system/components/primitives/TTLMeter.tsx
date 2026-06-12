/**
 * Wireframe: ui_kits/extension/v2/primitives.jsx L218-260 (V2 TTLMeter)
 * V2 contract:
 *   - Padding 10px 16px, --rule-soft top+bottom borders.
 *   - Background: low -> var(--ttl-wash), else -> var(--paper-2).
 *   - Label: "Expires in" (fresh/low) or "Expired" (expired), u-mono 10px caps --ink-3.
 *   - Time: HH:MM:SS zero-padded, u-mono 13px, italic when low, line-through when expired.
 *   - 24-segment bar, 6px tall, 2px gap, --ttl-* filled, --rule-soft unfilled.
 */
import React from 'react';

import { TTL_STATE_STYLES, ttlState } from '../../utils/ttlState';

export interface TTLMeterProps {
    ms: number;
    total?: number;
}

export function TTLMeter({ ms, total = 24 * 60 * 60 * 1000 }: TTLMeterProps): React.ReactElement {
    const pct = Math.max(0, Math.min(1, ms / total));
    const h = Math.floor(ms / 3_600_000);
    const mn = Math.floor((ms % 3_600_000) / 60_000);
    const s = Math.floor((ms % 60_000) / 1000);
    const state = ttlState(ms);
    const tok = TTL_STATE_STYLES[state];
    return (
        <div
            style={{
                padding: '10px 16px',
                borderTop: '1px solid var(--rule-soft)',
                borderBottom: '1px solid var(--rule-soft)',
                background: state === 'low' ? 'var(--ttl-wash)' : 'var(--paper-2)',
                transition: 'background 0.3s ease',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <span
                    className="u-mono"
                    style={{
                        fontSize: 10,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color: 'var(--ink-3)',
                    }}
                >
                    {state === 'expired' ? 'Expired' : 'Expires in'}
                </span>
                <span
                    className="u-mono"
                    style={{
                        fontSize: 13,
                        color: tok.textColor,
                        fontVariantNumeric: 'tabular-nums',
                        fontStyle: state === 'low' ? 'italic' : 'normal',
                        textDecoration: state === 'expired' ? 'line-through' : 'none',
                        textDecorationColor: 'var(--rule-soft)',
                    }}
                >
                    {String(h).padStart(2, '0')}:{String(mn).padStart(2, '0')}:{String(s).padStart(2, '0')}
                </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: 2, height: 6 }}>
                {Array.from({ length: 24 }).map((_, i) => {
                    const filled = i / 24 < pct;
                    return (
                        <span
                            key={i}
                            style={{
                                background: filled ? tok.color : 'var(--rule-soft)',
                                transition: 'background 0.3s ease',
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
}
