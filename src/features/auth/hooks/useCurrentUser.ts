import { useState, useEffect } from 'react';

export interface User {
    id: string;
    email: string;
    name?: string;
    avatarUrl?: string;
}

export function useCurrentUser() {
    // TODO: Connect to real AuthManager via MessageBus
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // No artificial delay - check auth immediately
        setUser(null); // Unauthenticated by default
        setIsLoading(false);
    }, []);

    const login = async () => {
        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, 800));
        setUser({ id: '1', email: 'demo@underscore.io', name: 'Demo User' });
        setIsLoading(false);
    };

    const logout = async () => {
        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, 300));
        setUser(null);
        setIsLoading(false);
    };

    return { user, isLoading, login, logout };
}
