import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '@/core/context/AppProvider';
import { Logo } from '@/ui-system/components/primitives/Logo';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';

/* Display name mapping (internal → UI) */
const MODE_DISPLAY: Record<ModeType, string> = {
    walk: 'Focus',
    sprint: 'Capture',
    vault: 'Memory',
    neural: 'Neural',
};

interface Collection {
    id: string;
    domain: string;
    emoji: string;
    highlightCount: number;
    lastActivity: string;
}

type SortBy = 'most' | 'az' | 'newest' | 'oldest';

interface CollectionsViewProps {
    onLogout?: () => void;
    onCollectionClick?: (domain: string) => void;
    onSignInClick?: () => void;
    onSettingsClick?: () => void;
    user?: { id: string; email: string; displayName: string; photoUrl?: string } | null;
    isAuthenticated?: boolean;
}

export function CollectionsView({
    onLogout: _onLogout,
    onCollectionClick: _onCollectionClickProp,
    onSignInClick: _onSignInClick,
    onSettingsClick: _onSettingsClick,
    user: _propUser,
    isAuthenticated: propIsAuthenticated,
}: CollectionsViewProps = {}) {
    const navigate = useNavigate();
    const appContext = useApp();

    const isAuthenticated = propIsAuthenticated ?? appContext.isAuthenticated;
    const mode = (appContext.currentMode ?? 'walk') as ModeType;

    const [sortBy, setSortBy] = useState<SortBy>('most');
    const [search, setSearch] = useState('');

    React.useEffect(() => {
        if (!isAuthenticated) {
            navigate('/mode');
        }
    }, [isAuthenticated, navigate]);

    /* Mock data matching collections.html mockup */
    const mockCollections: Collection[] = [
        { id: '1', domain: 'medium.com', emoji: '📰', highlightCount: 23, lastActivity: '2 days ago' },
        { id: '2', domain: 'developer.mozilla.org', emoji: '📄', highlightCount: 15, lastActivity: '5 days ago' },
        { id: '3', domain: 'arxiv.org', emoji: '🔬', highlightCount: 8, lastActivity: '1 week ago' },
        { id: '4', domain: 'github.com', emoji: '💻', highlightCount: 5, lastActivity: '2 weeks ago' },
    ];

    const sorted = [...mockCollections].sort((a, b) => {
        switch (sortBy) {
            case 'az': return a.domain.localeCompare(b.domain);
            case 'most': return b.highlightCount - a.highlightCount;
            case 'newest': return 0; // mock order
            case 'oldest': return 0;
            default: return 0;
        }
    });

    const filtered = search
        ? sorted.filter(c => c.domain.includes(search.toLowerCase()))
        : sorted;

    const handleCollectionClick = (c: Collection) => {
        if (_onCollectionClickProp) {
            _onCollectionClickProp(c.domain);
        } else {
            navigate(`/domain/${c.domain}`, { state: { collection: c } });
        }
    };

    return (
        <div
            className="h-full overflow-y-auto w-full flex flex-col items-center"
            style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}
        >
            {/* Header */}
            <header
                className="w-full max-w-[640px] flex items-center justify-between py-4 px-6 shrink-0 z-10 sticky top-0"
                style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', backgroundColor: 'var(--bg-glass, rgba(249, 249, 255, 0.8))' }}
            >
                <Link to="/mode" className="no-underline">
                    <Logo size="md" />
                </Link>
                <a
                    href="/settings"
                    title="Settings"
                    onClick={e => {
                        e.preventDefault();
                        if (_onSettingsClick) {
                            _onSettingsClick();
                        } else {
                            navigate('/settings');
                        }
                    }}
                    className="w-9 h-9 flex items-center justify-center rounded-full text-[17px] no-underline transition-all duration-150 hover:-translate-y-0.5"
                    style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-tertiary)',
                        boxShadow: 'var(--shadow-rest)',
                    }}
                >
                    ⚙
                </a>
            </header>

            <div className="w-full max-w-[640px] px-6 pb-6 flex-1 flex flex-col min-h-min">
                {/* Mode badge */}
                <div
                    className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-full mb-5"
                    style={{
                        background: 'var(--accent-soft)',
                        color: 'var(--accent-text)',
                    }}
                >
                    <span style={{ fontSize: '8px' }}>●</span>
                    {MODE_DISPLAY[mode]} mode
                </div>

                {/* Search */}
                <div
                    className="flex items-center gap-[10px] px-4 py-3 rounded-[var(--radius)] mb-6 transition-all duration-150"
                    style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                    }}
                >
                    <span className="text-[15px] opacity-50">🔍</span>
                    <input
                        type="text"
                        placeholder="Search collections..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="flex-1 bg-transparent border-none outline-none text-[14px]"
                        style={{ color: 'var(--text-primary)' }}
                    />
                </div>

                {/* Sort row */}
                <div className="flex items-center justify-between mb-4">
                    <p
                        className="text-[11px] font-medium uppercase tracking-[0.15em]"
                        style={{ color: 'var(--text-tertiary)' }}
                    >
                        Collections
                    </p>
                    <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value as SortBy)}
                        className="text-[12px] bg-transparent border-none outline-none cursor-pointer"
                        style={{ color: 'var(--text-tertiary)' }}
                    >
                        <option value="most">Most highlights</option>
                        <option value="az">A → Z</option>
                        <option value="newest">Newest first</option>
                        <option value="oldest">Oldest first</option>
                    </select>
                </div>

                {/* Collection cards */}
                <div className="flex flex-col gap-2">
                    {filtered.map(c => (
                        <button
                            key={c.id}
                            onClick={() => handleCollectionClick(c)}
                            className="flex items-center gap-3 p-3 rounded-[var(--radius)] text-left cursor-pointer transition-all duration-150 hover:-translate-y-0.5 w-full border-none font-[inherit]"
                            style={{
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border)',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-hover)'; }}
                            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
                        >
                            <div
                                className="w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center text-[16px] shrink-0"
                                style={{ background: 'var(--accent-soft)' }}
                            >
                                {c.emoji}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-medium truncate mb-0.5" style={{ color: 'var(--text-primary)' }}>
                                    {c.domain}
                                </p>
                                <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                                    {c.highlightCount} highlights · {c.lastActivity}
                                </p>
                            </div>
                            <span className="text-[13px] shrink-0" style={{ color: 'var(--text-tertiary)' }}>→</span>
                        </button>
                    ))}
                </div>

                {/* Mode reminder */}
                <p
                    className="text-center text-[13px] mt-8"
                    style={{ color: 'var(--text-tertiary)' }}
                >
                    Switch modes anytime in{' '}
                    <a
                        href="/settings"
                        className="underline"
                        style={{ color: 'var(--accent-text)' }}
                        onClick={e => {
                            e.preventDefault();
                            if (_onSettingsClick) {
                                _onSettingsClick();
                            } else {
                                navigate('/settings');
                            }
                        }}
                    >
                        Settings
                    </a>
                </p>
            </div>
        </div>
    );
}
