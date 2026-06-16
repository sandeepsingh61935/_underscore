/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { useTheme } from '@/ui-system/hooks/useTheme';

type ThemeApi = ReturnType<typeof useTheme>;

interface FakeMediaQueryList {
    matches: boolean;
    media: string;
    addEventListener: (event: string, listener: () => void) => void;
    removeEventListener: (event: string, listener: () => void) => void;
    addListener: (listener: () => void) => void;
    removeListener: (listener: () => void) => void;
    dispatchEvent: () => boolean;
    onchange: null;
}

const addCalls: Array<[string, () => void]> = [];
const removeCalls: Array<[string, () => void]> = [];
let matchMediaMatches = false;

function installMatchMedia(matches: boolean): void {
    matchMediaMatches = matches;
    addCalls.length = 0;
    removeCalls.length = 0;
    Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: (query: string): FakeMediaQueryList => ({
            matches: matchMediaMatches,
            media: query,
            addEventListener: (event: string, listener: () => void) => {
                addCalls.push([event, listener]);
            },
            removeEventListener: (event: string, listener: () => void) => {
                removeCalls.push([event, listener]);
            },
            addListener: (listener: () => void) => {
                addCalls.push(['change', listener]);
            },
            removeListener: (listener: () => void) => {
                removeCalls.push(['change', listener]);
            },
            dispatchEvent: () => true,
            onchange: null,
        }),
    });
}

let captured: ThemeApi | null = null;

function ThemeProbe({ onReady }: { onReady: (api: ThemeApi) => void }) {
    const api = useTheme();
    React.useEffect(() => {
        onReady(api);
    }, [api]);
    return null;
}

function captureApi(api: ThemeApi): void {
    captured = api;
}

describe('useTheme', () => {
    beforeEach(() => {
        captured = null;
        localStorage.clear();
        document.documentElement.className = '';
    });

    afterEach(() => {
        Object.defineProperty(window, 'matchMedia', {
            configurable: true,
            writable: true,
            value: (() => null) as unknown as typeof window.matchMedia,
        });
    });

    it('resolves system preference to dark when matchMedia reports dark', () => {
        installMatchMedia(true);

        render(<ThemeProbe onReady={captureApi} />);

        expect(captured!.resolvedTheme).toBe('dark');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('resolves system preference to light when matchMedia reports light', () => {
        installMatchMedia(false);

        render(<ThemeProbe onReady={captureApi} />);

        expect(captured!.resolvedTheme).toBe('light');
        expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('applies dark class directly when theme is "dark" and removes system listener', () => {
        installMatchMedia(false);

        render(<ThemeProbe onReady={captureApi} />);

        // System mode mounted → at least 1 'change' listener was added
        const initialAdds = addCalls.filter(([event]) => event === 'change').length;
        expect(initialAdds).toBeGreaterThanOrEqual(1);

        act(() => {
            captured!.setTheme('dark');
        });

        expect(document.documentElement.classList.contains('dark')).toBe(true);
        // Switching to 'dark' must remove the previous 'change' listener (no leak)
        const changeRemoves = removeCalls.filter(([event]) => event === 'change').length;
        expect(changeRemoves).toBeGreaterThanOrEqual(1);
        // And must NOT add a new 'change' listener in dark mode
        const finalAdds = addCalls.filter(([event]) => event === 'change').length;
        expect(finalAdds).toBe(initialAdds);
    });

    it('cleans up system change listener when leaving system mode', () => {
        installMatchMedia(false);

        const { unmount } = render(<ThemeProbe onReady={captureApi} />);

        // Initially in 'system' mode, listener should be added
        const addCallsInitial = addCalls.filter(([event]) => event === 'change');
        expect(addCallsInitial.length).toBeGreaterThanOrEqual(1);

        // Switch to 'light' — should remove the system listener
        act(() => {
            captured!.setTheme('light');
        });

        const changeRemoves = removeCalls.filter(([event]) => event === 'change');
        expect(changeRemoves.length).toBeGreaterThanOrEqual(1);

        unmount();
    });
});
