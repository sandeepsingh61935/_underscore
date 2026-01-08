import React from 'react';
import { SignInView } from '../../../features/auth/SignInView';
import { useCurrentUser } from '../../../features/auth/hooks/useCurrentUser';

interface AuthViewProps {
    onLoginSuccess: () => void;
    onBackToModeSelection?: () => void;
}

export function AuthView({ onLoginSuccess, onBackToModeSelection }: AuthViewProps) {
    const { login } = useCurrentUser();

    const handleGoogleLogin = async () => {
        await login();
        onLoginSuccess();
    };

    return (
        <SignInView
            onGoogleLogin={handleGoogleLogin}
            onBackToModeSelection={onBackToModeSelection}
        // Other providers not implemented yet, leave disabled
        />
    );
}
