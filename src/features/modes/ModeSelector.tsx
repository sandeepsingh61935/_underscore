import React from 'react';
import { cn } from '../../ui-system/utils/cn';
import { Text } from '../../ui-system/components/primitives/Text';
import { ModeDefinition } from './registry';

interface ModeSelectorProps {
    modes: ModeDefinition[];
    currentModeId: string;
    onSelect: (modeId: string) => void;
    disabled?: boolean;
}

export function ModeSelector({ modes, currentModeId, onSelect, disabled }: ModeSelectorProps) {
    return (
        <div className="flex flex-col gap-4 w-full">
            {modes.map((mode) => {
                const isActive = mode.id === currentModeId;

                return (
                    <button
                        key={mode.id}
                        onClick={() => onSelect(mode.id)}
                        disabled={disabled}
                        className={cn(
                            "group relative flex flex-col items-start p-6 w-full text-left transition-all duration-short border rounded-md",
                            // Active State
                            isActive
                                ? "border-primary bg-primary/5"
                                : "border-outline hover:border-on-surface-variant bg-surface-container",

                            disabled && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <div className="flex items-center justify-between w-full mb-1">
                            <Text
                                variant={isActive ? "h2" : "h2"}
                                className={cn(
                                    "font-light tracking-tight transition-colors",
                                    isActive ? "text-primary" : "text-on-surface group-hover:text-primary"
                                )}
                            >
                                {mode.name}
                            </Text>

                            {mode.badge && (
                                <span className="px-2 py-0.5 text-label-small rounded-full bg-surface-container-highest text-on-surface-variant">
                                    {mode.badge}
                                </span>
                            )}
                        </div>

                        <Text
                            variant="body"
                            className={cn(
                                "line-clamp-2",
                                isActive ? "text-on-surface" : "text-on-surface-variant"
                            )}
                        >
                            {mode.description}
                        </Text>
                    </button>
                );
            })}
        </div>
    );
}
