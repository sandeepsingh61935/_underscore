import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/ui-system/components/layout/Header';
import { useApp } from '@/core/context/AppProvider';
import { LayoutGrid, List, Plus, ChevronRight } from 'lucide-react';

interface Collection {
    id: string;
    domain: string;
    category: string;
    highlightCount: number;
    lastModified: Date;
}

type SortBy = 'alphabetical' | 'usage' | 'recent';
type ViewMode = 'list' | 'grid';

interface CollectionsViewProps {
    /** Custom logout handler for popup context */
    onLogout?: () => void;
    mode?: string;
    onModeChange?: (mode: string) => void;
    onSignInClick?: () => void;
    onCollectionClick?: (domain: string) => void;
    userEmail?: string;
    isAuthenticated?: boolean;
}

export function CollectionsView({ onLogout, onCollectionClick: onCollectionClickProp }: CollectionsViewProps = {}) {
    const navigate = useNavigate();
    const { isAuthenticated } = useApp();
    const [sortBy, setSortBy] = useState<SortBy>('alphabetical');
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [mode, setMode] = useState<'vault' | 'xai' | 'neural'>('vault');

    React.useEffect(() => {
        if (!isAuthenticated) {
            navigate('/mode');
        }
    }, [isAuthenticated, navigate]);

    // Mock collection data with real favicon URLs
    const mockCollections: Collection[] = [
        {
            id: '1',
            domain: 'nytimes.com',
            category: 'News & Media',
            highlightCount: 24,
            lastModified: new Date(Date.now() - 2 * 60 * 60 * 1000),
        },
        {
            id: '2',
            domain: 'wikipedia.org',
            category: 'Reference',
            highlightCount: 12,
            lastModified: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        },
        {
            id: '3',
            domain: 'github.com',
            category: 'Development',
            highlightCount: 8,
            lastModified: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
        {
            id: '4',
            domain: 'dribbble.com',
            category: 'Design Inspiration',
            highlightCount: 3,
            lastModified: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        },
    ];

    const sortedCollections = [...mockCollections].sort((a, b) => {
        switch (sortBy) {
            case 'alphabetical':
                return a.domain.localeCompare(b.domain);
            case 'usage':
                return b.highlightCount - a.highlightCount;
            case 'recent':
                return b.lastModified.getTime() - a.lastModified.getTime();
            default:
                return 0;
        }
    });

    const handleCollectionClick = (collection: Collection) => {
        navigate(`/domain/${collection.domain}`, { state: { collection } });
    };

    const faviconUrls: Record<string, string> = {
        'nytimes.com': 'https://www.nytimes.com/favicon.ico',
        'wikipedia.org': 'https://en.wikipedia.org/favicon.ico',
        'github.com': 'https://github.com/favicon.ico',
        'dribbble.com': 'https://dribbble.com/favicon.ico',
    };

    return (
        <div className="min-h-screen flex flex-col bg-background text-foreground">
            <Header onLogout={onLogout} />

            <main className="flex-1 w-full max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12 flex flex-col">
                {/* Mode Toggle */}
                <div className="w-full flex justify-center mb-12">
                    <div className="inline-flex h-12 items-center justify-center rounded-full bg-secondary/50 p-1">
                        {['vault', 'xai'].map((m) => (
                            <button
                                key={m}
                                onClick={() => setMode(m as 'vault' | 'xai')}
                                className={`relative flex cursor-pointer items-center justify-center px-6 h-full rounded-full transition-all duration-300 ${mode === m
                                    ? 'bg-card text-primary shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <span className="text-sm font-medium tracking-wide capitalize">
                                    {m === 'xai' ? 'xAI' : 'Vault'}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Page Header */}
                <div className="mb-10 flex flex-col items-center text-center">
                    <h1 className="text-4xl md:text-5xl font-light tracking-tight mb-2">Collections</h1>
                    <p className="text-muted-foreground text-sm font-light mt-2 max-w-md">
                        Securely manage your collected underscores within individual domain collections.
                    </p>
                </div>

                {/* Controls */}
                <div className="w-full flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                    {/* Sort Controls */}
                    <div className="inline-flex h-10 items-center justify-center rounded-full bg-secondary/50 p-1">
                        {(['alphabetical', 'usage', 'recent'] as const).map((sort) => (
                            <button
                                key={sort}
                                onClick={() => setSortBy(sort)}
                                className={`relative flex cursor-pointer items-center justify-center px-4 h-full rounded-full transition-all duration-300 text-sm font-medium tracking-wide ${sortBy === sort
                                    ? 'bg-card text-primary shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                {sort === 'alphabetical' && 'Alphabetical'}
                                {sort === 'usage' && 'By Usage'}
                                {sort === 'recent' && 'Recently Added'}
                            </button>
                        ))}
                    </div>

                    {/* View Toggle */}
                    <div className="inline-flex items-center rounded-full bg-secondary/50 p-1">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`flex items-center justify-center p-2 rounded-full transition-all ${viewMode === 'list'
                                ? 'bg-card text-primary shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <List className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`flex items-center justify-center p-2 rounded-full transition-all ${viewMode === 'grid'
                                ? 'bg-card text-primary shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <LayoutGrid className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Collections List/Grid */}
                {viewMode === 'list' ? (
                    <div className="flex flex-col gap-3 w-full">
                        {sortedCollections.map((collection) => (
                            <button
                                key={collection.id}
                                onClick={() => handleCollectionClick(collection)}
                                className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 rounded-xl bg-card border border-border shadow-sm shadow-black/5 hover:shadow-md hover:shadow-black/10 transition-all duration-300 cursor-pointer text-left"
                            >
                                <div className="flex items-center gap-5 overflow-hidden w-full sm:w-auto mb-4 sm:mb-0">
                                    <div className="h-14 w-14 shrink-0 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground overflow-hidden border border-border/50 shadow-inner">
                                        <img
                                            alt={`${collection.domain} favicon`}
                                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                            src={faviconUrls[collection.domain]}
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                            }}
                                        />
                                    </div>
                                    <div className="flex flex-col truncate">
                                        <p className="text-base font-medium text-foreground truncate group-hover:text-primary transition-colors">
                                            {collection.domain}
                                        </p>
                                        <span className="text-sm text-muted-foreground font-light mt-1">
                                            {collection.category}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 shrink-0 w-full sm:w-auto justify-end">
                                    <p className="text-base font-medium text-muted-foreground group-hover:text-primary transition-colors">
                                        {collection.highlightCount} underscores
                                    </p>
                                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                        {sortedCollections.map((collection) => (
                            <button
                                key={collection.id}
                                onClick={() => handleCollectionClick(collection)}
                                className="group flex flex-col items-center p-6 rounded-xl bg-card border border-border shadow-sm shadow-black/5 hover:shadow-lg hover:shadow-black/10 transition-all duration-200 cursor-pointer relative overflow-hidden"
                            >
                                <div className="h-20 w-20 shrink-0 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground overflow-hidden border border-border/50 shadow-inner mb-4">
                                    <img
                                        alt={`${collection.domain} favicon`}
                                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                        src={faviconUrls[collection.domain]}
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                        }}
                                    />
                                </div>
                                <p className="text-base font-medium text-foreground truncate w-full text-center mb-1">
                                    {collection.domain}
                                </p>
                                <span className="text-xs text-muted-foreground font-light text-center mb-4">
                                    {collection.category}
                                </span>
                                <div className="absolute bottom-3 right-3 text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors px-2 py-1 rounded-md bg-secondary/50">
                                    {collection.highlightCount}
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Add New Collection Button */}
                <div className="mt-8 flex justify-center">
                    <button className="text-sm text-primary font-medium hover:text-primary/80 transition-colors flex items-center gap-1 group">
                        <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                        Add new collection
                    </button>
                </div>
            </main>

            {/* Footer */}
            <footer className="w-full py-8 mt-auto">
                <div className="max-w-4xl mx-auto px-4 md:px-6 flex justify-between items-center text-xs text-muted-foreground">
                    <p>© 2024 _underscore.</p>
                    <div className="flex gap-6">
                        <a href="#privacy" className="hover:text-foreground transition-colors">
                            Privacy
                        </a>
                        <a href="#help" className="hover:text-foreground transition-colors">
                            Help
                        </a>
                        <a href="#terms" className="hover:text-foreground transition-colors">
                            Terms
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
