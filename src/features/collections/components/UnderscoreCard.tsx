import React from 'react';
import { Copy, Trash2, Clock } from 'lucide-react';

interface UnderscoreCardProps {
    id: string;
    text: string;
    url: string;
    timestamp: string;
    isCode?: boolean;
    onCopy: (id: string) => void;
    onDelete: (id: string) => void;
}

export function UnderscoreCard({
    id,
    text,
    url,
    timestamp,
    isCode = false,
    onCopy,
    onDelete,
}: UnderscoreCardProps) {
    return (
        <article className="group relative flex flex-col gap-3 p-4 -mx-4 rounded-lg transition-all hover:bg-bg-surface-light dark:hover:bg-bg-surface-dark border border-transparent hover:border-border-light dark:hover:border-border-dark">
            <div className="flex justify-between items-start gap-4">
                {isCode ? (
                    <div className="w-full">
                        <p className="text-base font-medium leading-relaxed text-text-primary-light dark:text-text-primary-dark font-mono bg-bg-alt-light dark:bg-bg-alt-dark p-3 rounded text-sm border border-border-light dark:border-border-dark">
                            {text}
                        </p>
                    </div>
                ) : (
                    <p className="text-base font-medium leading-relaxed text-text-primary-light dark:text-text-primary-dark">
                        {text}
                    </p>
                )}

                {/* Action buttons (visible on mobile, hover on desktop) */}
                <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                        onClick={() => onCopy(id)}
                        className="p-2 text-text-muted-light dark:text-text-muted-dark hover:text-primary hover:bg-bg-alt-light dark:hover:bg-bg-alt-dark rounded transition-colors"
                        title="Copy to clipboard"
                    >
                        <Copy size={18} />
                    </button>
                    <button
                        onClick={() => onDelete(id)}
                        className="p-2 text-text-muted-light dark:text-text-muted-dark hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Delete"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-2 text-xs text-text-secondary-light dark:text-text-secondary-dark">
                <Clock size={14} />
                <time>{timestamp}</time>
                <span className="w-1 h-1 rounded-full bg-border-light dark:bg-border-dark"></span>
                <span>{url}</span>
            </div>
        </article>
    );
}
