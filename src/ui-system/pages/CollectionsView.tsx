import { Grid, List, Plus, Search } from 'lucide-react';
import React, { useState } from 'react';

import { CollectionCard } from '../components/composed/CollectionCard';
import { cn } from '../utils/cn';
import {
  tonalPillActiveClass,
  tonalPillBaseClass,
  tonalPillInactiveClass,
  tonalPillShellClass,
} from '../utils/tonalPill';

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
  /** Current active mode */
  mode?: 'basic' | 'pro' | 'pro_xai';
  /** Callback to change mode */
  onModeChange?: (mode: 'basic' | 'pro' | 'pro_xai') => void;
  className?: string;
}

export function CollectionsView({
  collections,
  onCollectionClick,
  onAddNew,
  mode,
  onModeChange,
  className,
}: CollectionsViewProps): React.JSX.Element {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter collections by search
  const filteredCollections = collections.filter(
    (c) =>
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
    <div className={cn('collections-view', className)}>
      {/* Header Controls */}
      <div className="cv-controls">
        {/* Mode Switcher (New Navigation Fix) */}
        {mode && onModeChange && (
          <button
            onClick={() => onModeChange('basic')}
            // Mode selection page removed — fallback to collections/home
            className="mode-back"
            aria-label="Change mode"
            title="Change mode"
          >
            <span className="mode-back-label">
              <span className="mode-back-arrow">←</span> {mode}
            </span>
          </button>
        )}

        {/* Search */}
        <div className="search-wrap">
          <Search className="search-icon" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search collections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search collections"
            className="search-input"
          />
        </div>

        {/* View & Sort Controls */}
        <div className="cv-tools">
          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            aria-label="Sort collections by"
            className="toolbar-select"
          >
            <option value="recent">Recent</option>
            <option value="alphabetical">A-Z</option>
            <option value="count">Most highlights</option>
          </select>

          {/* View Toggle */}
          <div
            className={cn(tonalPillShellClass)}
            role="group"
            aria-label="View mode"
          >
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                tonalPillBaseClass,
                'pill-icon',
                viewMode === 'list' ? tonalPillActiveClass : tonalPillInactiveClass
              )}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
            >
              <List aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={cn(
                tonalPillBaseClass,
                'pill-icon',
                viewMode === 'grid' ? tonalPillActiveClass : tonalPillInactiveClass
              )}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
            >
              <Grid aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Collections List/Grid */}
      {sortedCollections.length > 0 ? (
        <div
          className={cn(
viewMode === 'grid' ? 'toolbar-grid' : 'toolbar-list'
          )}
        >
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
        <div className="empty-state">
          <div className="empty-icon">
            <Search aria-hidden="true" />
          </div>
          <h3 className="empty-title">
            {searchQuery ? 'No collections found' : 'No collections yet'}
          </h3>
          <p className="empty-desc">
            {searchQuery
              ? `No collections match "${searchQuery}"`
              : 'Start highlighting content on websites to build your collection.'}
          </p>
        </div>
      )}

      {/* Add New Button (FAB-style) */}
      {onAddNew && (
        <button
          onClick={onAddNew}
          aria-label="Add new collection"
          className="fab"
        >
          <Plus aria-hidden="true" />
        </button>
      )}

      {/* Stats Footer */}
      <div className="stats-footer">
        {collections.length} collections •{' '}
        {collections.reduce((sum, c) => sum + c.count, 0)} total highlights
      </div>
    </div>
  );
}
