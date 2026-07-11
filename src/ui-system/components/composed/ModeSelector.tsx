import React from 'react';
import { ModeCard } from './ModeCard';
import { Circle, Archive, Brain } from 'lucide-react';

export interface ModeOption {
    id: string;
    label: string;
    description: string;
    icon?: React.ReactNode;
    isLocked?: boolean;
}

interface ModeSelectorProps {
    currentModeId: string;
    onSelect: (modeId: string) => void;
    isAuthenticated?: boolean;
    className?: string;
}

export function ModeSelector({
    currentModeId,
    onSelect,
    isAuthenticated = false,
    className
}: ModeSelectorProps) {

    // Mode Definitions
    // In a real app, these might come from a config or prop, but standardizing them here for the UI system is fine for now.
    const modes: ModeOption[] = [
        {
            id: 'basic',
            label: 'Basic',
            description: 'Highlights live on this device, with a configurable TTL.',
            icon: <Circle className="w-5 h-5" />,
            isLocked: false
        },
        {
            id: 'pro',
            label: 'Pro',
            description: 'Signed in. Synced across every device you use.',
            icon: <Archive className="w-5 h-5" />,
            isLocked: !isAuthenticated
        },
        {
            id: 'pro_xai',
            label: '10x-Pro',
            description: 'Everything in Pro, plus AI-powered organization.',
            icon: <Brain className="w-5 h-5" />,
            isLocked: !isAuthenticated
        }
    ];

    return (
        <div className={`flex flex-col gap-3 w-full ${className || ''}`}>
            {modes.map((mode) => (
                <ModeCard
                    key={mode.id}
                    id={mode.id}
                    label={mode.label}
                    description={mode.description}
                    icon={mode.icon}
                    isActive={currentModeId === mode.id}
                    isLocked={mode.isLocked}
                    onClick={() => onSelect(mode.id)}
                />
            ))}
        </div>
    );
}
