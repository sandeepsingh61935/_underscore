import React, { useState } from 'react';
import { Grid, List, ArrowUpDown, Plus, Search } from 'lucide-react';
import { CollectionCard } from '../components/composed/CollectionCard';
import { cn } from '../utils/cn';

export interface Collection {
    id: string;
    domain: string;
    category?: string;
    favicon?: string;
    count: number;
    lastAccessed?: Date;
}

export type SortOption = 'alphabetical' | 'recent' | 'count';
export type ViewMode = 'list' | 'grid';

export interface CollectionsViewProps {
    collections: Collection[];
    onCollectionClick: (collection: Collection) => void;
    onAddNew?: () => void;
    className?: string;
}

export function CollectionsView({
    collections,
    onCollectionClick,
    onAddNew,
    className,
}: CollectionsViewProps) {
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [sortBy, setSortBy] = useState<SortOption>('recent');
    const [searchQuery, setSearchQuery] = useState('');

    // Filter collections by search
    const filteredCollections = collections.filter(c =>
        c.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort collections
    const sortedCollections = [...filteredCollections].sort((a, b) => {
        switch (sortBy) {
            case 'alphabetical':
                return a.domain.localeCompare(b.domain);
            case 'count':
                return b.count - a.count;
            case 'recent':
            default:
                if (!a.lastAccessed || !b.lastAccessed) return 0;
                return new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime();
        }
    });

    return (
        <div className={cn("flex flex-col h-full", className)}>
            {/* Header Controls */}
            <div className="flex items-center justify-between gap-3 mb-4">
                {/* Search */}
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search collections..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm bg-secondary/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                    />
                </div>

                {/* View & Sort Controls */}
                <div className="flex items-center gap-2">
                    {/* Sort Dropdown */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                        className="px-3 py-2 text-sm bg-secondary/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                    >
                        <option value="recent">Recent</option>
                        <option value="alphabetical">A-Z</option>
                        <option value="count">Most highlights</option>
                    </select>

                    {/* View Toggle */}
                    <div className="flex items-center rounded-lg border border-border overflow-hidden">
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn(
                                "p-2 transition-colors",
                                viewMode === 'list'
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                            )}
                            title="List view"
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn(
                                "p-2 transition-colors",
                                viewMode === 'grid'
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                            )}
                            title="Grid view"
                        >
                            <Grid className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Collections List/Grid */}
            {sortedCollections.length > 0 ? (
                <div className={cn(
                    "flex-1 overflow-y-auto scrollbar-hide",
                    viewMode === 'grid'
                        ? "grid grid-cols-2 gap-3"
                        : "flex flex-col gap-2"
                )}>
                    {sortedCollections.map((collection) => (
                        <CollectionCard
                            key={collection.id}
                            domain={collection.domain}
                            category={collection.category}
                            favicon={collection.favicon}
                            count={collection.count}
                            onClick={() => onCollectionClick(collection)}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                    <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                        <Search className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-1">
                        {searchQuery ? 'No collections found' : 'No collections yet'}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-xs">
                        {searchQuery
                            ? `No collections match "${searchQuery}"`
                            : 'Start highlighting content on websites to build your collection.'
                        }
                    </p>
                </div>
            )}

            {/* Add New Button (FAB-style) */}
            {onAddNew && (
                <button
                    onClick={onAddNew}
                    className="fixed bottom-6 right-6 p-4 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
                >
                    <Plus className="w-5 h-5" />
                </button>
            )}

            {/* Stats Footer */}
            <div className="pt-3 mt-3 border-t border-border text-xs text-muted-foreground text-center">
                {collections.length} collections • {collections.reduce((sum, c) => sum + c.count, 0)} total highlights
            </div>
        </div>
    );
}
