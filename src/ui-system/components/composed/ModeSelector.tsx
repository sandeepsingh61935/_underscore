import React from 'react';
import { ModeCard } from './ModeCard';
import { Footprints, Zap, Archive, Brain } from 'lucide-react';

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
            id: 'focus',
            label: 'Focus',
            description: 'Capture content without distractions.',
            icon: <Footprints className="w-5 h-5" />,
            isLocked: false
        },
        {
            id: 'capture',
            label: 'Capture',
            description: 'High-speed capture session.',
            icon: <Zap className="w-5 h-5" />,
            isLocked: false
        },
        {
            id: 'memory',
            label: 'Memory',
            description: 'Secure storage for sensitive clips.',
            icon: <Archive className="w-5 h-5" />,
            isLocked: !isAuthenticated
        },
        {
            id: 'neural',
            label: 'Neural',
            description: 'AI-powered organization.',
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
