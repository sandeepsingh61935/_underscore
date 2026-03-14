import { Globe, Copy, Paperclip, Trash2, ChevronLeft, Check } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { AppHeader } from '@/ui-system/components/layout/AppHeader';

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
 * Back nav + domain header + action bar + highlight cards
 */
export function DomainDetailsView({ domain: propDomain, onBack }: DomainDetailsViewProps = {}): React.JSX.Element {
    const params = useParams<{ domain: string }>();
    const domain = propDomain || params.domain;
    const navigate = useNavigate();
    const { isAuthenticated, user } = useApp();
    const [copiedId, setCopiedId] = useState<string | null>(null);


    React.useEffect(() => {
        if (!isAuthenticated) {
            navigate('/mode'); // This might need adjustment for popup context
        }
    }, [isAuthenticated, navigate]);

    /* Mock highlights matching domain-details.html */
    const mockHighlights: Highlight[] = [
        {
            id: '1',
            text: '"The key insight is that attention mechanisms allow the model to focus on relevant parts of the input sequence, regardless of their position."',
            path: '/understanding-transformers-from-scratch',
            createdAt: '2h ago',
        },
        {
            id: '2',
            text: '"Event sourcing stores every change as an immutable event, creating a complete audit trail and enabling temporal queries."',
            path: '/event-sourcing-made-simple',
            createdAt: '1 day ago',
        },
        {
            id: '3',
            text: '"Progressive disclosure reduces cognitive load by showing only the most relevant options at each step, revealing complexity on demand."',
            path: '/ux-patterns-for-knowledge-workers',
            createdAt: '3 days ago',
        },
        {
            id: '4',
            text: '"Shadow DOM provides true style encapsulation — CSS rules inside a shadow tree don\'t leak out, and styles from the outer page don\'t bleed in."',
            path: '/web-components-beyond-basics',
            createdAt: '1 week ago',
        },
    ];

    const handleCopy = (text: string, id: string): void => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleCopyAll = (): void => {
        const all = mockHighlights.map(h => h.text).join('\n\n');
        navigator.clipboard.writeText(all);
    };

    const exportFormats = ['PDF', 'TXT', 'JSON', 'CSV', 'MD'];

    return (
        <div
            className="h-full overflow-y-auto w-full flex flex-col items-center bg-surface text-on-surface"
        >
            <AppHeader
                variant="primary"
                action={
                    <div
                        className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-on-primary text-title-small font-semibold border border-outline-variant"
                        aria-hidden="true"
                    >
                        {(user?.displayName || 'U')[0]}
                    </div>
                }
            />

            <div className="w-full max-w-[640px] px-6 pb-6 flex-1 flex flex-col min-h-min">
                {/* Back nav */}
                {onBack ? (
                    <button
                        type="button"
                        onClick={onBack}
                        className="inline-flex min-h-[48px] items-center gap-1.5 rounded-md px-2 -mx-2 text-body-small mb-5 transition-colors text-outline hover:text-primary bg-transparent border-none cursor-pointer text-left font-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                        <ChevronLeft size={13} /> Collections
                    </button>
                ) : (
                    <Link
                        to="/collections"
                        className="inline-flex min-h-[48px] items-center gap-1.5 rounded-md px-2 -mx-2 text-body-small no-underline mb-5 transition-colors text-outline hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                        <ChevronLeft size={13} /> Collections
                    </Link>
                )}

                {/* Domain header */}
                <div className="flex items-center gap-4 mb-6">
                    <div
                        className="w-12 h-12 rounded-md flex items-center justify-center shrink-0 bg-[color-mix(in_srgb,var(--md-sys-color-primary)_8%,transparent)]"
                    >
                        <Globe size={24} className="text-primary" />
                    </div>
                    <div>
                        <h1
                            className="text-headline-small font-semibold text-on-surface"
                        >
                            {domain || 'medium.com'}
                        </h1>
                        <p className="text-body-small text-outline">
                            {mockHighlights.length} highlights · Dec 2025 – Feb 2026
                        </p>
                    </div>
                </div>

                {/* Action bar */}
                <div
                    className="flex flex-wrap items-center gap-2 mb-6 p-3 rounded-md bg-surface-container-low border border-outline-variant"
                >
                    <button
                        type="button"
                        onClick={handleCopyAll}
                        className="inline-flex min-h-[48px] items-center gap-1.5 rounded-full px-3 py-1.5 text-label-medium font-medium transition-all duration-short ease-standard border-none bg-transparent text-on-surface-variant hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-surface)_6%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                        <Copy size={12} /> Copy all
                    </button>
                    <div
                        className="flex flex-wrap items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--md-sys-color-error)_8%,transparent)] px-2 py-1"
                    >
                        <Paperclip size={12} className="text-outline" />
                        {exportFormats.map(fmt => (
                            <button
                                key={fmt}
                                type="button"
                                className="inline-flex min-h-[48px] items-center rounded-full px-3 py-1.5 text-label-small cursor-pointer border-none transition-all duration-short ease-standard hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-surface)_8%,transparent)] bg-transparent text-outline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            >
                                {fmt}
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        className="ml-auto inline-flex min-h-[48px] items-center gap-1.5 rounded-full px-3 py-1.5 text-label-medium font-medium cursor-pointer transition-all duration-short ease-standard border-none bg-transparent text-outline hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-surface)_6%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                        <Trash2 size={12} /> Clear all
                    </button>
                </div>

                {/* Highlight cards */}
                <div className="flex flex-col gap-3">
                    {mockHighlights.map(h => (
                        <div
                            key={h.id}
                            className="group rounded-md border border-outline-variant bg-surface-container-lowest p-5 transition-all duration-short ease-standard hover:shadow-elevation-3 focus-within:shadow-elevation-3"
                        >
                            {/* Quote */}
                            <div className="flex gap-3 mb-3">
                                <div
                                    className="w-[3px] rounded-full shrink-0 bg-primary"
                                />
                                <p className="text-body-medium leading-relaxed italic text-on-surface">
                                    {h.text}
                                </p>
                            </div>
                            {/* Meta */}
                            <div className="flex items-center justify-between">
                                <p className="text-label-medium text-outline">
                                    {h.path}
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(h.text, h.id)}
                                        className="inline-flex min-h-[48px] items-center justify-center rounded-full px-3 py-1.5 text-label-small cursor-pointer border-none opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-all duration-short ease-standard bg-[color-mix(in_srgb,var(--md-sys-color-primary)_8%,transparent)] text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                        aria-label={copiedId === h.id ? 'Copied highlight' : 'Copy highlight'}
                                    >
                                        {copiedId === h.id ? <Check size={11} /> : 'Copy'}
                                    </button>
                                    <span className="text-label-medium text-outline">
                                        {h.createdAt}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
