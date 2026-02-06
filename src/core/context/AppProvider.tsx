import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

type Mode = 'walk' | 'sprint' | 'vault' | 'neural';
type Theme = 'light' | 'dark' | 'sepia';

export interface User {
    id: string;
    email: string;
    displayName: string;
    photoUrl?: string;
    provider: 'google' | 'apple' | 'twitter' | 'facebook';
}

interface AppContextType {
    // Authentication
    isAuthenticated: boolean;
    user: User | null;
    login: (user: User) => void;
    logout: () => void;

    // Mode Management
    currentMode: Mode;
    setMode: (mode: Mode) => void;
    availableModes: Mode[];

    // Theme
    theme: Theme;
    setTheme: (theme: Theme) => void;

    // Loading states
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Authentication state
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<User | null>(null);

    // Mode state
    const [currentMode, setCurrentMode] = useState<Mode>('walk');
    const [isLoading, setIsLoading] = useState(false);

    // Theme state - get from localStorage or system preference
    const [theme, setThemeState] = useState<Theme>(() => {
        const saved = localStorage.getItem('underscore-theme') as Theme | null;
        if (saved) return saved;

        // Check system preference
        if (typeof window !== 'undefined') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return 'light';
    });

    // Available modes depends on auth state
    const availableModes: Mode[] = isAuthenticated
        ? ['walk', 'sprint', 'vault', 'neural']
        : ['walk', 'sprint'];

    // Apply theme to document
    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove('light', 'dark', 'sepia');
        if (theme !== 'light') {
            root.classList.add(theme);
        }
        localStorage.setItem('underscore-theme', theme);
    }, [theme]);

    const login = useCallback((newUser: User) => {
        setUser(newUser);
        setIsAuthenticated(true);
        localStorage.setItem('underscore-user', JSON.stringify(newUser));
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        setIsAuthenticated(false);
        setCurrentMode('walk'); // Reset to walk mode on logout
        localStorage.removeItem('underscore-user');
    }, []);

    const setMode = useCallback((mode: Mode) => {
        // Vault and Neural require authentication
        if ((mode === 'vault' || mode === 'neural') && !isAuthenticated) {
            return;
        }
        setCurrentMode(mode);
    }, [isAuthenticated]);

    const setTheme = useCallback((newTheme: Theme) => {
        setThemeState(newTheme);
    }, []);

    // Restore auth state from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('underscore-user');
        if (saved) {
            try {
                const savedUser = JSON.parse(saved) as User;
                setUser(savedUser);
                setIsAuthenticated(true);
            } catch (e) {
                console.error('Failed to restore user', e);
                localStorage.removeItem('underscore-user');
            }
        }
    }, []);

    const value: AppContextType = {
        isAuthenticated,
        user,
        login,
        logout,
        currentMode,
        setMode,
        availableModes,
        theme,
        setTheme,
        isLoading,
        setIsLoading,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within AppProvider');
    }
    return context;
};
