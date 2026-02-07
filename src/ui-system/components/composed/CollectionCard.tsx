import React from 'react';
import { ArrowRight, Globe } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface CollectionCardProps {
    /** Domain name (e.g., "github.com") */
    domain: string;
    /** Optional category label */
    category?: string;
    /** Favicon URL */
    favicon?: string;
    /** Number of highlights in this collection */
    count: number;
    /** Click handler */
    onClick?: () => void;
    /** Additional className */
    className?: string;
}

export function CollectionCard({
    domain,
    category,
    favicon,
    count,
    onClick,
    className,
}: CollectionCardProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "group relative flex items-center gap-4 p-4 w-full text-left",
                "bg-card hover:bg-secondary/50 border border-border rounded-xl",
                "transition-all duration-200 hover:shadow-md hover:border-primary/30",
                "focus:outline-none focus:ring-2 focus:ring-primary/20",
                className
            )}
        >
            {/* Favicon */}
            <div className="shrink-0 w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center overflow-hidden border border-border/50">
                {favicon ? (
                    <img
                        src={favicon}
                        alt={`${domain} favicon`}
                        className="w-6 h-6 object-contain"
                        onError={(e) => {
                            // Fallback to globe icon on error
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                    />
                ) : null}
                <Globe className={cn("w-5 h-5 text-muted-foreground", favicon && "hidden")} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {domain}
                    </h3>
                    {category && (
                        <span className="shrink-0 px-2 py-0.5 text-xs font-medium text-muted-foreground bg-secondary rounded-full">
                            {category}
                        </span>
                    )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {count} {count === 1 ? 'highlight' : 'highlights'}
                </p>
            </div>

            {/* Arrow - animates on hover */}
            <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-secondary/50 group-hover:bg-primary/10 transition-colors">
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>
        </button>
    );
}
