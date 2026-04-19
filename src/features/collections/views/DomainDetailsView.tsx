import { motion } from 'framer-motion';
import { Check, ChevronLeft, Copy, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useApp } from '@/core/context/AppProvider';
import { useHighlightsByDomain } from '@/features/collections/hooks/useHighlightsByDomainFactory';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { springs } from '@/ui-system/motion/springs';
import { cn } from '@/ui-system/utils/cn';

const AUTH_REQUIRED_MODES: ModeType[] = ['vault', 'neural'];

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 20, mass: 1.0 } },
};

interface Highlight {
    id: string;
    text: string;
    path: string;
    createdAt: string;
}

export interface DomainDetailsViewProps {
    domain?: string;
    onBack?: () => void;
}

/**
 * Domain Details View — adapts dynamically to popup and web
 * Compact back-nav header + domain header + action chips + highlight marginalia cards
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- JSX return type inferred
export function DomainDetailsView({ domain: propDomain, onBack }: DomainDetailsViewProps = {}) {
    const params = useParams<{ domain: string }>();
    const domain = propDomain ?? params.domain;
    const navigate = useNavigate();
    const { isAuthenticated, currentMode } = useApp();
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const mode = (currentMode ?? 'walk') as ModeType;

    /* Auth redirect: only redirect for modes that require authentication */
    React.useEffect(() => {
        if (!isAuthenticated && AUTH_REQUIRED_MODES.includes(mode)) {
            navigate('/mode');
        }
    }, [isAuthenticated, mode, navigate]);

    /* Real data from useHighlightsByDomain hook */
    const { highlights: realHighlights, isLoading, error } = useHighlightsByDomain(domain);

    /* Format createdAt to relative time */
    function formatCreatedAt(date: Date): string {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffHours < 1) return 'Just now';
        if (diffHours === 1) return '1h ago';
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return '1 day ago';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 14) return '1 week ago';
        return `${Math.floor(diffDays / 7)} weeks ago`;
    }

    /* Map real highlights to display format */
    const highlights: Highlight[] = realHighlights.map((hl) => ({
        id: hl.id,
        text: `"${hl.text}"`,
        path: hl.path,
        createdAt: formatCreatedAt(hl.createdAt),
    }));

    const handleCopy = (text: string, id: string): void => {
        void (async () => {
            try {
                await navigator.clipboard.writeText(text);
                setCopiedId(id);
                toast('Copied to clipboard');
                setTimeout(() => setCopiedId(null), 1600);
            } catch {
                toast.error('Copy failed \u2014 clipboard permission denied');
            }
        })();
    };

    const handleCopyAll = (): void => {
        const all = highlights.map(h => h.text).join('\n\n');
        navigator.clipboard.writeText(all);
    };

    const exportFormats = ['PDF', 'TXT', 'JSON', 'CSV', 'MD'];

    return (
        <div className="h-full overflow-hidden w-full flex flex-col bg-surface text-on-surface">

            {/* Compact back-nav header */}
            <header
                className="flex items-center px-4 py-3 border-b border-outline-variant flex-shrink-0"
                style={{
                    backgroundColor: 'color-mix(in srgb, var(--md-sys-color-surface) 88%, transparent)',
                    backdropFilter: 'blur(12px)',
                }}
            >
                {onBack ? (
                    <button
                        type="button"
                        onClick={onBack}
                        className="inline-flex items-center gap-1.5 min-h-[44px] px-2 -mx-2 text-[12px] text-outline hover:text-primary transition-colors duration-[180ms] bg-transparent border-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
                    >
                        <ChevronLeft size={14} />
                        Collections
                    </button>
                ) : (
                    <Link
                        to="/collections"
                        className="inline-flex items-center gap-1.5 min-h-[44px] px-2 -mx-2 text-[12px] text-outline hover:text-primary transition-colors duration-[180ms] no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
                    >
                        <ChevronLeft size={14} />
                        Collections
                    </Link>
                )}
            </header>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-4 py-4 [scrollbar-width:thin]">

                {/* Domain header */}
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-11 h-11 rounded-[10px] flex items-center justify-center shrink-0 bg-surface-container text-[16px] font-semibold text-on-surface-variant">
                        {((domain ?? 'M')[0] ?? 'M').toUpperCase()}
                    </div>
                    <div>
                        <h1 className="text-[17px] font-semibold tracking-[-0.01em] text-on-surface mb-[1px]">
                            {domain ?? 'loading...'}
                        </h1>
                        <p className="text-[11px] text-outline">
                            {highlights.length} {highlights.length === 1 ? 'highlight' : 'highlights'}
                        </p>
                    </div>
                </div>

                {/* Loading state */}
                {isLoading && (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <div className="w-8 h-8 border-2 border-outline-variant border-t-primary rounded-full animate-spin" />
                        <p className="text-[12px] text-outline">Loading highlights...</p>
                    </div>
                )}

                {/* Error state */}
                {error && !isLoading && (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-4">
                        <p className="text-[13px] text-error">Failed to load highlights</p>
                        <p className="text-[11px] text-outline">{error.message}</p>
                    </div>
                )}

                {/* Empty state */}
                {!isLoading && !error && highlights.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-4">
                        <p className="text-[13px] text-on-surface-variant">No highlights on {domain}</p>
                        <p className="text-[11px] text-outline">Highlight text on this domain to save it here.</p>
                    </div>
                )}

                {/* Action chips - only show when highlights exist */}
                {!isLoading && !error && highlights.length > 0 && (
                <div className="flex items-center gap-2 mb-4 overflow-x-auto [scrollbar-width:none] pb-1">
                    {/* Copy all chip */}
                    <motion.button
                        type="button"
                        onClick={handleCopyAll}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.97 }}
                        transition={springs.snappy}
                        className={cn(
                            'inline-flex items-center gap-[6px] shrink-0',
                            'px-3 py-[6px] rounded-full',
                            'border border-outline-variant bg-surface-container-lowest',
                            'text-[11px] font-medium text-on-surface-variant',
                            'transition-colors duration-[180ms]',
                            'hover:border-outline hover:text-on-surface',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                        )}
                    >
                        <Copy size={11} />
                        Copy all
                    </motion.button>

                    {/* Export chips */}
                    {exportFormats.map(fmt => (
                        <motion.button
                            key={fmt}
                            type="button"
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.97 }}
                            transition={springs.snappy}
                            className={cn(
                                'inline-flex items-center shrink-0',
                                'px-3 py-[6px] rounded-full',
                                'border border-outline-variant bg-surface-container-lowest',
                                'text-[11px] font-medium text-outline',
                                'transition-colors duration-[180ms]',
                                'hover:border-[color-mix(in_srgb,var(--ink-mode)_35%,transparent)]',
                                'hover:text-primary hover:bg-[color-mix(in_srgb,var(--ink-mode)_6%,transparent)]',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                            )}
                        >
                            {fmt}
                        </motion.button>
                    ))}

                    {/* Spacer + Clear chip */}
                    <div className="flex-1" />
                    <motion.button
                        type="button"
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.97 }}
                        transition={springs.snappy}
                        className={cn(
                            'inline-flex items-center gap-[6px] shrink-0',
                            'px-3 py-[6px] rounded-full',
                            'border border-[color-mix(in_srgb,var(--md-sys-color-error)_25%,transparent)]',
                            'bg-[color-mix(in_srgb,var(--md-sys-color-error)_6%,transparent)]',
                            'text-[11px] font-medium text-error',
                            'transition-colors duration-[180ms]',
                            'hover:border-[color-mix(in_srgb,var(--md-sys-color-error)_45%,transparent)]',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                        )}
                    >
                        <Trash2 size={11} />
                        Clear
                    </motion.button>
                </div>
                )}

                {/* Highlight cards — marginalia style */}
                {!isLoading && !error && highlights.length > 0 && (
                <motion.div
                    className="flex flex-col gap-3"
                    variants={listVariants}
                    initial="hidden"
                    animate="show"
                >
                    {highlights.map(h => (
                        <motion.div key={h.id} variants={itemVariants}>
                        <motion.div
                            whileHover={{ y: -2, scale: 1.008 }}
                            whileTap={{ scale: 0.99 }}
                            transition={springs.snappy}
                            className={cn(
                                'group relative rounded-[12px]',
                                'border border-outline-variant bg-surface-container-lowest',
                                'p-4 overflow-hidden',
                                'transition-colors transition-shadow duration-[280ms] ease-out',
                                'hover:shadow-elevation-2',
                                'hover:border-[color-mix(in_srgb,var(--ink-mode)_25%,transparent)]',
                            )}
                        >
                            {/* Quote area */}
                            <div className="flex gap-3 mb-3">
                                {/* Mode-colored left accent bar */}
                                <div
                                    className="w-[2.5px] rounded-full shrink-0 self-stretch"
                                    style={{ background: 'var(--ink-mode)' }}
                                />
                                <p className="text-[13px] leading-[1.55] italic text-on-surface line-clamp-3">
                                    {h.text}
                                </p>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-[10px] text-outline font-mono truncate">
                                    {h.path}
                                </p>
                                <div className="flex items-center gap-2 shrink-0">
                                    {/* Copy button — hidden at rest, revealed on hover */}
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(h.text, h.id)}
                                        aria-label={copiedId === h.id ? 'Copied' : 'Copy highlight'}
                                        className={cn(
                                            'inline-flex items-center gap-[4px] px-[10px] py-[4px] rounded-full',
                                            'text-[10px] font-medium cursor-pointer',
                                            'border transition-all duration-[200ms]',
                                            'opacity-0 group-hover:opacity-100',
                                            copiedId === h.id
                                                ? 'border-[color-mix(in_srgb,var(--ink-memory)_35%,transparent)] bg-[color-mix(in_srgb,var(--ink-memory)_10%,transparent)] text-[var(--ink-memory)]'
                                                : 'border-outline-variant bg-surface-container text-outline hover:border-outline hover:text-on-surface-variant',
                                        )}
                                    >
                                        {copiedId === h.id
                                            ? <><Check size={9} /> Copied</>
                                            : <><Copy size={9} /> Copy</>
                                        }
                                    </button>
                                    <span className="text-[10px] text-outline">{h.createdAt}</span>
                                </div>
                            </div>
                        </motion.div>
                        </motion.div>
                    ))}
                </motion.div>
                )}
            </div>
        </div>
    );
}
