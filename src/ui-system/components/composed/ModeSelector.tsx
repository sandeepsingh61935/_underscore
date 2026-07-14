import React from 'react';
import { ModeCard } from './ModeCard';
import { Circle, Archive, Brain } from 'lucide-react';

import { MODE_BRANDING } from '@/shared/constants/mode-branding';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';

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

const MODE_ICONS: Record<ModeType, React.ReactNode> = {
    basic: <Circle className="w-5 h-5" />,
    pro: <Archive className="w-5 h-5" />,
    pro_xai: <Brain className="w-5 h-5" />,
};

export function ModeSelector({
    currentModeId,
    onSelect,
    isAuthenticated = false,
    className
}: ModeSelectorProps) {
    const modes: ModeOption[] = (Object.keys(MODE_BRANDING) as ModeType[]).map((id) => {
        const branding = MODE_BRANDING[id];
        return {
            id,
            label: branding.displayName,
            description: branding.description,
            icon: MODE_ICONS[id],
            isLocked: id !== 'basic' && !isAuthenticated,
        };
    });

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
