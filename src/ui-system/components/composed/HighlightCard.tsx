import React, { useState } from 'react';
import { Copy, Trash2, Check, ExternalLink } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface Highlight {
    id: string;
    text: string;
    /** URL path where this highlight was captured */
    urlPath?: string;
    /** Timestamp when captured */
    createdAt: Date | string;
    /** Optional color role */
    colorRole?: 'yellow' | 'orange' | 'blue' | 'green' | 'purple' | 'pink' | 'teal';
}

export interface HighlightCardProps {
    highlight: Highlight;
    onCopy?: (text: string) => void;
    onDelete?: (id: string) => void;
    onNavigate?: (urlPath: string) => void;
    className?: string;
}

const colorMap: Record<string, string> = {
    yellow: 'border-l-yellow-400',
    orange: 'border-l-orange-400',
    blue: 'border-l-blue-400',
    green: 'border-l-green-400',
    purple: 'border-l-purple-400',
    pink: 'border-l-pink-400',
    teal: 'border-l-teal-400',
};

function formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return 'Today';
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
}

export function HighlightCard({
    highlight,
    onCopy,
    onDelete,
    onNavigate,
    className,
}: HighlightCardProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onCopy) {
            onCopy(highlight.text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onDelete) {
            onDelete(highlight.id);
        }
    };

    const colorClass = highlight.colorRole ? colorMap[highlight.colorRole] : 'border-l-primary';

    return (
        <div
            className={cn(
                "group relative p-4 bg-card border border-border rounded-lg",
                "border-l-4 transition-all duration-200",
                "hover:shadow-md hover:bg-secondary/30",
                colorClass,
                className
            )}
        >
            {/* Highlight Text */}
            <p className="text-sm text-foreground leading-relaxed line-clamp-3 pr-8">
                "{highlight.text}"
            </p>

            {/* Metadata */}
            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                <span>{formatDate(highlight.createdAt)}</span>
                {highlight.urlPath && (
                    <>
                        <span>•</span>
                        <button
                            onClick={() => onNavigate?.(highlight.urlPath!)}
                            className="hover:text-primary hover:underline truncate max-w-[200px] text-left"
                        >
                            {highlight.urlPath}
                        </button>
                    </>
                )}
            </div>

            {/* Action Buttons - Revealed on hover */}
            <div className={cn(
                "absolute top-3 right-3 flex items-center gap-1",
                "opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            )}>
                {highlight.urlPath && onNavigate && (
                    <button
                        onClick={() => onNavigate(highlight.urlPath!)}
                        className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        title="Open source"
                    >
                        <ExternalLink className="w-4 h-4" />
                    </button>
                )}

                {onCopy && (
                    <button
                        onClick={handleCopy}
                        className={cn(
                            "p-1.5 rounded-md hover:bg-secondary transition-colors",
                            copied
                                ? "text-green-600 dark:text-green-400"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                        title={copied ? "Copied!" : "Copy"}
                    >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                )}

                {onDelete && (
                    <button
                        onClick={handleDelete}
                        className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
}
