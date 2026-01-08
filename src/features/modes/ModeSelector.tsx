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
                            "group relative flex flex-col items-start p-6 w-full text-left transition-all duration-200 border rounded-lg",
                            // Active State
                            isActive
                                ? "border-primary bg-primary/5 dark:bg-primary/10"
                                : "border-border-light dark:border-border-dark hover:border-text-secondary-light/30 bg-bg-surface-light dark:bg-bg-surface-dark",

                            disabled && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <div className="flex items-center justify-between w-full mb-1">
                            <Text
                                variant={isActive ? "h2" : "h2"}
                                className={cn(
                                    "font-light tracking-tight transition-colors",
                                    isActive ? "text-primary" : "text-text-primary-light dark:text-text-primary-dark group-hover:text-primary"
                                )}
                            >
                                {mode.name}
                            </Text>

                            {mode.badge && (
                                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-bg-alt-light dark:bg-bg-alt-dark text-text-secondary-light">
                                    {mode.badge}
                                </span>
                            )}
                        </div>

                        <Text
                            variant="body"
                            className={cn(
                                "line-clamp-2",
                                isActive ? "text-text-primary-light dark:text-text-primary-dark" : "text-text-secondary-light dark:text-text-secondary-dark"
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
