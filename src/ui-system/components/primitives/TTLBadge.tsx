/**
 * Wireframe: ui_kits/extension/v2/primitives.jsx L181-216
 *   (ttlState helper + V2 TTLBadge)
 * V2 contract:
 *   - State helper ttlState(ms): ms<=0 expired, ms<1h low, else fresh.
 *   - TTLBadge text + bar colors switch by state:
 *       fresh:   text var(--ink-2), bar var(--ttl-fresh)
 *       low:     text var(--ttl-low) italic, bar var(--ttl-low)
 *       expired: text var(--ttl-expired), bar var(--ttl-expired)
 *   - Bar: 40x4px, --rule-soft track, fill width = pct*100%.
 *   - Label format: "Xh Ym" when hours>=1, else "Xm".
 *   - Container has title="Xh Ym remaining" (or "Xm remaining").
 */
import React from 'react';

import { formatRemainingTtlCompact } from '@/shared/utils/format-remaining-ttl';
import { TTL_STATE_STYLES, ttlState } from '../../utils/ttlState';

export interface TTLBadgeProps {
    ms: number;
    total?: number;
}

export function TTLBadge({ ms, total = 24 * 60 * 60 * 1000 }: TTLBadgeProps): React.ReactElement {
    const pct = Math.max(0, Math.min(1, ms / total));
    const label = formatRemainingTtlCompact(ms);
    const s = TTL_STATE_STYLES[ttlState(ms)];
    const state = ttlState(ms);
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} title={`${label} remaining`}>
            <span
                className="u-mono"
                style={{
                    fontSize: 10,
                    color: s.textColor,
                    fontVariantNumeric: 'tabular-nums',
                    fontStyle: state === 'low' ? 'italic' : 'normal',
                }}
            >{label}</span>
            <span style={{ position: 'relative', width: 40, height: 4, background: 'var(--rule-soft)', display: 'inline-block' }}>
                <span
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${pct * 100}%`,
                        background: s.color,
                        transition: 'background 0.3s ease, width 0.6s linear',
                    }}
                />
            </span>
        </span>
    );
}
