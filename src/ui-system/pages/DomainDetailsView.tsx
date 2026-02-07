import React from 'react';
import { ChevronLeft, Download, Trash2, Globe, ExternalLink } from 'lucide-react';
import { HighlightCard, Highlight } from '../components/composed/HighlightCard';
import { cn } from '../utils/cn';

export interface DomainDetailsViewProps {
    domain: string;
    favicon?: string;
    highlights: Highlight[];
    onBack: () => void;
    onHighlightCopy?: (text: string) => void;
    onHighlightDelete?: (id: string) => void;
    onHighlightNavigate?: (urlPath: string) => void;
    onExportAll?: () => void;
    onClearAll?: () => void;
    onVisitDomain?: () => void;
    className?: string;
}

export function DomainDetailsView({
    domain,
    favicon,
    highlights,
    onBack,
    onHighlightCopy,
    onHighlightDelete,
    onHighlightNavigate,
    onExportAll,
    onClearAll,
    onVisitDomain,
    className,
}: DomainDetailsViewProps) {
    return (
        <div className={cn("flex flex-col h-full", className)}>
            {/* Header with Breadcrumb */}
            <div className="flex items-center gap-3 pb-4 border-b border-border mb-4">
                <button
                    onClick={onBack}
                    className="p-1.5 -ml-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    title="Back to collections"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>

                {/* Domain Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center overflow-hidden border border-border/50">
                        {favicon ? (
                            <img
                                src={favicon}
                                alt={`${domain} favicon`}
                                className="w-5 h-5 object-contain"
                            />
                        ) : (
                            <Globe className="w-4 h-4 text-muted-foreground" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-base font-medium text-foreground truncate">{domain}</h1>
                        <p className="text-xs text-muted-foreground">
                            {highlights.length} {highlights.length === 1 ? 'highlight' : 'highlights'}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                    {onVisitDomain && (
                        <button
                            onClick={onVisitDomain}
                            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                            title="Visit website"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </button>
                    )}
                    {onExportAll && highlights.length > 0 && (
                        <button
                            onClick={onExportAll}
                            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                            title="Export all"
                        >
                            <Download className="w-4 h-4" />
                        </button>
                    )}
                    {onClearAll && highlights.length > 0 && (
                        <button
                            onClick={onClearAll}
                            className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            title="Clear all"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Highlights List */}
            {highlights.length > 0 ? (
                <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col gap-3">
                    {highlights.map((highlight) => (
                        <HighlightCard
                            key={highlight.id}
                            highlight={highlight}
                            onCopy={onHighlightCopy}
                            onDelete={onHighlightDelete}
                            onNavigate={onHighlightNavigate}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                    <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                        <Globe className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-1">
                        No highlights yet
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-xs">
                        Visit {domain} and start highlighting content to save it here.
                    </p>
                </div>
            )}
        </div>
    );
}
