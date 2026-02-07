import React, { useState } from 'react';
import { useCurrentUser } from '../../../features/auth/hooks/useCurrentUser';


interface AuthViewProps {
    onLoginSuccess: () => void;
    onBackToModeSelection?: () => void;
}

import { SignInView } from '@/ui-system/pages/SignInView';

export function AuthView({ onLoginSuccess, onBackToModeSelection }: AuthViewProps) {
    const { login, isLoading, error } = useCurrentUser();
    // Local error state not strictly needed if useCurrentUser provides it, but useful for immediate feedback or clearing
    const [loginError, setLoginError] = useState<string | null>(null);

    const handleProviderSelect = async (provider: any) => {
        setLoginError(null);
        console.log('[AuthView] Starting login with provider:', provider);

        // Map UI provider to Auth provider if needed, or ensure types match
        // Assuming 'google' matches
        const result = await login(provider); // 'google'

        if (result.success) {
            console.log('[AuthView] Login successful!');
            onLoginSuccess();
        } else {
            console.error('[AuthView] Login failed:', result.error);
            setLoginError(result.error || 'Login failed. Please try again.');
        }
    };

    return (
        <SignInView
            onBack={onBackToModeSelection}
            onProviderSelect={handleProviderSelect}
            isLoading={isLoading}
            error={loginError || error}
            className="h-full"
        />
    );
}
