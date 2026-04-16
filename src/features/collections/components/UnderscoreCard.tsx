import { Copy, Trash2, Clock } from 'lucide-react';
import React from 'react';

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
}: UnderscoreCardProps): React.JSX.Element {
    return (
        <article className="group relative flex flex-col gap-3 p-4 -mx-4 rounded-md transition-all duration-short ease-standard hover:bg-surface-container border border-transparent hover:border-outline">
            <div className="flex justify-between items-start gap-4">
                {isCode ? (
                    <div className="w-full">
                        <p className="text-body-large text-on-surface font-mono bg-surface-container p-3 rounded-sm border border-outline">
                            {text}
                        </p>
                    </div>
                ) : (
                    <p className="text-body-large text-on-surface">
                        {text}
                    </p>
                )}

                {/* Action buttons (visible on mobile, hover on desktop) */}
                <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                        type="button"
                        onClick={() => onCopy(id)}
                        className="inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-sm text-on-surface-variant transition-colors duration-short ease-standard hover:bg-surface-container hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        aria-label="Copy to clipboard"
                    >
                        <Copy size={18} />
                    </button>
                    <button
                        type="button"
                        onClick={() => onDelete(id)}
                        className="inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-sm text-on-surface-variant transition-colors duration-short ease-standard hover:bg-error-container hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        aria-label="Delete highlight"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-2 text-label-small text-on-surface-variant">
                <Clock size={14} />
                <time>{timestamp}</time>
                <span className="w-1 h-1 rounded-full bg-outline"></span>
                <span>{url}</span>
            </div>
        </article>
    );
}
