/**
 * Wireframe: ui_kits/extension/v2/primitives.jsx L181-185
 * State thresholds:
 *   - ms <= 0          -> 'expired'
 *   - 0 < ms < 1h      -> 'low'
 *   - ms >= 1h         -> 'fresh'
 */
import { describe, expect, it } from 'vitest';

import { TTL_STATE_STYLES, ttlState } from './ttlState';

const ONE_HOUR = 60 * 60 * 1000;

describe('ttlState (V2 wireframe contract)', () => {
    it('ms <= 0 returns expired', () => {
        expect(ttlState(0)).toBe('expired');
        expect(ttlState(-1)).toBe('expired');
    });

    it('0 < ms < 1h returns low', () => {
        expect(ttlState(1)).toBe('low');
        expect(ttlState(ONE_HOUR - 1)).toBe('low');
    });

    it('ms >= 1h returns fresh', () => {
        expect(ttlState(ONE_HOUR)).toBe('fresh');
        expect(ttlState(24 * ONE_HOUR)).toBe('fresh');
    });

    it('TTL_STATE_STYLES has 3 entries with V2 token colors', () => {
        expect(TTL_STATE_STYLES.fresh.color).toBe('var(--ttl-fresh)');
        expect(TTL_STATE_STYLES.low.color).toBe('var(--ttl-low)');
        expect(TTL_STATE_STYLES.expired.color).toBe('var(--ttl-expired)');
    });
});
