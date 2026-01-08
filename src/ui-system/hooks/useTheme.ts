import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
    const [theme, setTheme] = useState<Theme>(() => {
        // Get stored theme preference or default to 'system'
        const stored = localStorage.getItem('underscore_theme') as Theme;
        return stored || 'system';
    });

    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

    useEffect(() => {
        // Apply theme to document
        const applyTheme = (themeMode: Theme) => {
            let effectiveTheme: 'light' | 'dark' = 'light';

            if (themeMode === 'system') {
                // Detect system preference
                effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
                    ? 'dark'
                    : 'light';
            } else {
                effectiveTheme = themeMode;
            }

            setResolvedTheme(effectiveTheme);

            // Apply to document
            if (effectiveTheme === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        };

        applyTheme(theme);

        // Listen for system theme changes when in 'system' mode
        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = () => applyTheme('system');

            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
    }, [theme]);

    const changeTheme = (newTheme: Theme) => {
        setTheme(newTheme);
        localStorage.setItem('underscore_theme', newTheme);
    };

    return {
        theme,
        resolvedTheme,
        setTheme: changeTheme,
    };
}
