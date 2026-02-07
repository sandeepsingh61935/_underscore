import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ModeSelectionPage } from '@/ui-system/pages/ModeSelectionView';
import { useApp } from '@/core/context/AppProvider';

interface ModeSelectionViewProps {
    /** Callback when mode is selected (for popup) */
    onModeSelect?: (modeId: string) => void;
    /** Callback for sign-in click (for popup) */
    onSignInClick?: () => void;
}

export function ModeSelectionView({ onModeSelect, onSignInClick }: ModeSelectionViewProps = {}) {
    const navigate = useNavigate();
    const { isAuthenticated, setMode, currentMode: selectedMode } = useApp(); // Get current mode

    const handleModeClick = (modeId: string) => {
        const mode = modeId as 'walk' | 'sprint' | 'vault' | 'neural';

        if ((mode === 'vault' || mode === 'neural') && !isAuthenticated) {
            // Use callback if provided (popup), otherwise navigate (web)
            if (onSignInClick) {
                onSignInClick();
            } else {
                navigate('/sign-in');
            }
            return;
        }

        // Use callback if provided (popup), otherwise use context + navigate (web)
        if (onModeSelect) {
            onModeSelect(mode);
        } else {
            setMode(mode);
            if (mode === 'vault') {
                navigate('/collections');
            }
        }
    };

    const handleSignInClick = () => {
        if (onSignInClick) {
            onSignInClick();
        } else {
            navigate('/sign-in');
        }
    };

    return (
        <ModeSelectionPage
            selectedMode={selectedMode}
            onModeSelect={handleModeClick}
            isAuthenticated={isAuthenticated}
            onSignInClick={handleSignInClick}
            className="h-full"
        />
    );
}
