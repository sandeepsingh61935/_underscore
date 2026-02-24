import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useApp } from '@/core/context/AppProvider';
import { Logo } from '@/ui-system/components/primitives/Logo';

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
export function DomainDetailsView({ domain: propDomain, onBack }: DomainDetailsViewProps = {}) {
    const params = useParams<{ domain: string }>();
    const domain = propDomain || params.domain;
    const navigate = useNavigate();
    const { isAuthenticated, user } = useApp();
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Use prop if available (popup), otherwise param (router)
    const domain = propDomain || paramDomain || '';

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

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleCopyAll = () => {
        const all = mockHighlights.map(h => h.text).join('\n\n');
        navigator.clipboard.writeText(all);
    };

    const exportFormats = ['PDF', 'TXT', 'JSON', 'CSV', 'MD'];

    return (
        <div
            className="h-full overflow-y-auto w-full flex flex-col items-center"
            style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}
        >
            {/* Header */}
            <header className="w-full max-w-[640px] flex items-center justify-between py-4 px-6 shrink-0 z-10 sticky top-0"
                style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', backgroundColor: 'var(--bg-glass, rgba(249, 249, 255, 0.8))' }}>
                <Link to="/mode" className="no-underline">
                    <Logo size="md" />
                </Link>
                <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[14px] font-semibold cursor-pointer transition-all duration-150 hover:scale-105"
                    style={{
                        background: 'var(--accent)',
                        color: '#ffffff',
                        border: '1px solid var(--border)',
                    }}
                    title={user?.displayName || 'User'}
                >
                    {(user?.displayName || 'U')[0]}
                </div>
            </header>

            <div className="w-full max-w-[640px] px-6 pb-6 flex-1 flex flex-col min-h-min">
                {/* Back nav */}
                {onBack ? (
                    <button
                        onClick={onBack}
                        className="inline-flex items-center gap-1.5 text-[13px] mb-5 transition-colors hover:text-[var(--accent)] bg-transparent border-none p-0 cursor-pointer text-left font-[inherit]"
                        style={{ color: 'var(--text-tertiary)' }}
                    >
                        ← Collections
                    </button>
                ) : (
                    <Link
                        to="/collections"
                        className="inline-flex items-center gap-1.5 text-[13px] no-underline mb-5 transition-colors hover:text-[var(--accent)]"
                        style={{ color: 'var(--text-tertiary)' }}
                    >
                        ← Collections
                    </Link>
                )}

                {/* Domain header */}
                <div className="flex items-center gap-4 mb-6">
                    <div
                        className="w-12 h-12 rounded-[var(--radius)] flex items-center justify-center text-[24px] shrink-0"
                        style={{ background: 'var(--accent-soft)' }}
                    >
                        📰
                    </div>
                    <div>
                        <h1
                            className="text-[20px] font-semibold"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            {domain || 'medium.com'}
                        </h1>
                        <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                            {mockHighlights.length} highlights · Dec 2025 – Feb 2026
                        </p>
                    </div>
                </div>

                {/* Action bar */}
                <div
                    className="flex flex-wrap items-center gap-2 mb-6 p-3 rounded-[var(--radius)]"
                    style={{
                        background: 'var(--bg-elevated, var(--bg-card))',
                        border: '1px solid var(--border)',
                    }}
                >
                    <button
                        onClick={handleCopyAll}
                        className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-[var(--radius-sm)] cursor-pointer transition-all duration-150 border-none"
                        style={{
                            background: 'transparent',
                            color: 'var(--text-secondary)',
                        }}
                    >
                        📋 Copy all
                    </button>
                    <div
                        className="flex items-center gap-1 px-2 py-1 rounded-[var(--radius-sm)]"
                        style={{ background: 'rgba(224,82,82,0.08)' }}
                    >
                        <span className="text-[12px]">📎</span>
                        {exportFormats.map(fmt => (
                            <button
                                key={fmt}
                                className="text-[11px] px-2 py-1 rounded-[4px] cursor-pointer border-none transition-all hover:opacity-70"
                                style={{
                                    background: 'transparent',
                                    color: 'var(--text-tertiary)',
                                }}
                            >
                                {fmt}
                            </button>
                        ))}
                    </div>
                    <button
                        className="ml-auto flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-[var(--radius-sm)] cursor-pointer transition-all duration-150 border-none"
                        style={{
                            background: 'transparent',
                            color: 'var(--text-tertiary)',
                        }}
                    >
                        🗑 Clear all
                    </button>
                </div>

                {/* Highlight cards */}
                <div className="flex flex-col gap-3">
                    {mockHighlights.map(h => (
                        <div
                            key={h.id}
                            className="group p-5 rounded-[var(--radius)] transition-all duration-150"
                            style={{
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border)',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-hover)'; }}
                            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
                        >
                            {/* Quote */}
                            <div className="flex gap-3 mb-3">
                                <div
                                    className="w-[3px] rounded-full shrink-0"
                                    style={{ background: 'var(--accent)' }}
                                />
                                <p className="text-[14px] leading-relaxed italic" style={{ color: 'var(--text-primary)' }}>
                                    {h.text}
                                </p>
                            </div>
                            {/* Meta */}
                            <div className="flex items-center justify-between">
                                <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                                    {h.path}
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleCopy(h.text, h.id)}
                                        className="text-[11px] px-2 py-1 rounded-[4px] cursor-pointer border-none opacity-0 group-hover:opacity-100 transition-all duration-150"
                                        style={{
                                            background: 'var(--accent-soft)',
                                            color: 'var(--accent-text)',
                                        }}
                                    >
                                        {copiedId === h.id ? '✓' : 'Copy'}
                                    </button>
                                    <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
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
