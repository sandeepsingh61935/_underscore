import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'sepia';
export type ThemePreference = Theme | 'system';

interface ThemeContextValue {
    /** Current active theme */
    theme: Theme;
    /** User's preference (may be 'system') */
    preference: ThemePreference;
    /** Set theme preference */
    setTheme: (preference: ThemePreference) => void;
    /** Whether the theme is being loaded */
    isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'underscore-theme-preference';

/**
 * Hook to access theme context
 */
export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}

/**
 * Get the system's preferred color scheme
 */
function getSystemTheme(): Theme {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Resolve preference to actual theme
 */
function resolveTheme(preference: ThemePreference): Theme {
    if (preference === 'system') {
        return getSystemTheme();
    }
    return preference;
}

/**
 * Load preference from storage
 */
function loadPreference(): ThemePreference {
    if (typeof window === 'undefined') return 'system';
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && ['light', 'dark', 'sepia', 'system'].includes(stored)) {
            return stored as ThemePreference;
        }
    } catch {
        // Storage not available
    }
    return 'system';
}

/**
 * Save preference to storage
 */
function savePreference(preference: ThemePreference) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, preference);
    } catch {
        // Storage not available
    }
}

/**
 * Apply theme to document
 */
function applyTheme(theme: Theme) {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    // Remove existing theme classes
    root.classList.remove('light', 'dark', 'sepia');

    // Add new theme class
    root.classList.add(theme);

    // Update color-scheme for native elements
    root.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
}

interface ThemeProviderProps {
    children: React.ReactNode;
    /** Default theme if no preference is stored */
    defaultTheme?: ThemePreference;
    /** Storage key for persistence */
    storageKey?: string;
}

export function ThemeProvider({
    children,
    defaultTheme = 'system',
}: ThemeProviderProps) {
    const [preference, setPreference] = useState<ThemePreference>('system');
    const [theme, setTheme] = useState<Theme>('light');
    const [isLoading, setIsLoading] = useState(true);

    // Load preference on mount
    useEffect(() => {
        const stored = loadPreference();
        const pref = stored || defaultTheme;
        setPreference(pref);
        setTheme(resolveTheme(pref));
        setIsLoading(false);
    }, [defaultTheme]);

    // Apply theme to document when it changes
    useEffect(() => {
        if (!isLoading) {
            applyTheme(theme);
        }
    }, [theme, isLoading]);

    // Listen for system theme changes
    useEffect(() => {
        if (preference !== 'system') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = () => {
            setTheme(getSystemTheme());
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [preference]);

    const handleSetTheme = useCallback((newPreference: ThemePreference) => {
        setPreference(newPreference);
        setTheme(resolveTheme(newPreference));
        savePreference(newPreference);
    }, []);

    return (
        <ThemeContext.Provider value={{
            theme,
            preference,
            setTheme: handleSetTheme,
            isLoading,
        }}>
            {children}
        </ThemeContext.Provider>
    );
}

/**
 * Theme toggle button hook - cycles through themes
 */
export function useThemeToggle() {
    const { preference, setTheme } = useTheme();

    const cycle = useCallback(() => {
        const themes: ThemePreference[] = ['light', 'dark', 'sepia', 'system'];
        const currentIndex = themes.indexOf(preference);
        const nextIndex = (currentIndex + 1) % themes.length;
        setTheme(themes[nextIndex]);
    }, [preference, setTheme]);

    return { cycle, current: preference };
}
