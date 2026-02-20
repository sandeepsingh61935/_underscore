import React from 'react';
import { Lock, Check } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ModeCardProps {
    id: string;
    label: string;
    description?: string;
    /** Icon component to render */
    icon?: React.ReactNode;
    isActive?: boolean;
    isLocked?: boolean;
    onClick?: () => void;
    className?: string;
}

export function ModeCard({
    id,
    label,
    description,
    icon,
    isActive = false,
    isLocked = false,
    onClick,
    className
}: ModeCardProps) {
    return (
        <button
            onClick={onClick}
            disabled={isLocked}
            className={cn(
                "group relative flex flex-col items-start p-5 w-full text-left transition-all duration-200 border rounded-xl overflow-hidden",
                // Active/Selected State
                isActive
                    ? "border-primary bg-primary shadow-md"
                    : "border-outline hover:border-primary/50 hover:bg-surface-container-low hover:shadow-sm",

                // Locked State
                isLocked && "opacity-50 cursor-not-allowed hover:border-outline hover:bg-transparent hover:shadow-none bg-surface-container-lowest",

                className
            )}
            aria-pressed={isActive}
            aria-disabled={isLocked}
        >
            <div className="flex items-start justify-between w-full mb-2">
                {/* Icon & Label Group */}
                <div className="flex items-center gap-3">
                    {icon && (
                        <div className={cn(
                            "p-2 rounded-lg transition-colors",
                            isActive ? "bg-on-primary/20 text-on-primary" : "bg-surface-container-high text-on-surface-variant group-hover:text-primary group-hover:bg-primary/5"
                        )}>
                            {icon}
                        </div>
                    )}
                    <div>
                        <h3 className={cn(
                            "text-base font-medium tracking-tight transition-colors",
                            isActive ? "text-on-primary" : "text-on-surface group-hover:text-on-surface"
                        )}>
                            {label}
                        </h3>
                    </div>
                </div>

                {/* Status Indicator */}
                <div className="shrink-0">
                    {isLocked ? (
                        <Lock className="w-4 h-4 text-on-surface-variant/70" />
                    ) : isActive ? (
                        <div className="w-5 h-5 rounded-full bg-on-primary flex items-center justify-center">
                            <Check className="w-3 h-3 text-primary" strokeWidth={3} />
                        </div>
                    ) : (
                        <div className="w-5 h-5 rounded-full border border-outline-variant group-hover:border-primary/50 transition-colors" />
                    )}
                </div>
            </div>

            {description && (
                <p className={cn(
                    "text-sm leading-relaxed pl-[calc(2.5rem+0.75rem)]", // Align with text start (icon width + gap)
                    isActive ? "text-on-primary/90" : "text-muted-foreground"
                )}>
                    {description}
                </p>
            )}
        </button>
    );
}
