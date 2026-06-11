/**
 * Wireframe: ui_kits/extension/v2/primitives.jsx L181-185 (ttlState helper)
 * Returns one of: "fresh" | "low" | "expired".
 *   - ms <= 0          -> expired
 *   - 0 < ms < 1h      -> low
 *   - ms >= 1h         -> fresh
 */
export function ttlState(ms: number): 'fresh' | 'low' | 'expired' {
    if (ms <= 0) return 'expired';
    if (ms < 60 * 60 * 1000) return 'low';
    return 'fresh';
}

export interface TtlStateStyle {
    color: string;
    textColor: string;
}

/**
 * Wireframe: ui_kits/extension/v2/primitives.jsx L186-190 (TTL_STATE map)
 * Maps state -> bar fill color and label text color.
 */
export const TTL_STATE_STYLES: Record<'fresh' | 'low' | 'expired', TtlStateStyle> = {
    fresh: { color: 'var(--ttl-fresh)', textColor: 'var(--ink-2)' },
    low: { color: 'var(--ttl-low)', textColor: 'var(--ttl-low)' },
    expired: { color: 'var(--ttl-expired)', textColor: 'var(--ttl-expired)' },
};
