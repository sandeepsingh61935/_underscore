import { Settings, Search, ChevronRight } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { Logo } from '@/ui-system/components/primitives/Logo';

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
}: CollectionsViewProps = {}): React.ReactElement {
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
    {
      id: '1',
      domain: 'medium.com',
      emoji: 'news',
      highlightCount: 23,
      lastActivity: '2 days ago',
    },
    {
      id: '2',
      domain: 'developer.mozilla.org',
      emoji: 'doc',
      highlightCount: 15,
      lastActivity: '5 days ago',
    },
    {
      id: '3',
      domain: 'arxiv.org',
      emoji: 'sci',
      highlightCount: 8,
      lastActivity: '1 week ago',
    },
    {
      id: '4',
      domain: 'github.com',
      emoji: 'code',
      highlightCount: 5,
      lastActivity: '2 weeks ago',
    },
  ];

  const sorted = [...mockCollections].sort((a, b) => {
    switch (sortBy) {
      case 'az':
        return a.domain.localeCompare(b.domain);
      case 'most':
        return b.highlightCount - a.highlightCount;
      case 'newest':
        return 0; // mock order
      case 'oldest':
        return 0;
      default:
        return 0;
    }
  });

  const filtered = search
    ? sorted.filter((c) => c.domain.includes(search.toLowerCase()))
    : sorted;

  const handleCollectionClick = (c: Collection): void => {
    if (_onCollectionClickProp) {
      _onCollectionClickProp(c.domain);
    } else {
      navigate(`/domain/${c.domain}`, { state: { collection: c } });
    }
  };

  return (
    <div className="h-full overflow-y-auto w-full flex flex-col items-center bg-surface text-on-surface">
      {/* Header */}
      <header
        className="w-full max-w-[640px] flex items-center justify-between py-4 px-6 shrink-0 z-10 sticky top-0 backdrop-blur-md"
        style={{
          backgroundColor:
            'color-mix(in srgb, var(--md-sys-color-surface) 80%, transparent)',
        }}
      >
        <Link
          to="/mode"
          className="inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-full no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Logo size="md" />
        </Link>
        <button
          type="button"
          aria-label="Open settings"
          onClick={() => {
            if (_onSettingsClick) {
              _onSettingsClick();
            } else {
              navigate('/settings');
            }
          }}
          className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest text-outline shadow-elevation-1 transition-all duration-short ease-standard hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Settings size={17} />
        </button>
      </header>

      <div className="w-full max-w-[640px] px-6 pb-6 flex-1 flex flex-col min-h-min">
        {/* Mode badge */}
        <div className="inline-flex items-center gap-1.5 text-label-medium font-medium px-3 py-1.5 rounded-full mb-5 bg-[color-mix(in_srgb,var(--md-sys-color-primary)_8%,transparent)] text-primary">
          <span className="text-label-small leading-none">&#x25CF;</span>
          {MODE_DISPLAY[mode]} mode
        </div>

        {/* Search */}
        <div className="flex items-center gap-[10px] px-4 py-3 rounded-md mb-6 transition-all duration-short ease-standard bg-surface-container-lowest border border-outline-variant focus-within:border-outline focus-within:shadow-elevation-1">
          <Search size={15} className="text-outline opacity-50" />
          <input
            type="text"
            aria-label="Search collections"
            placeholder="Search collections..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-sm bg-transparent border-none text-body-medium text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          />
        </div>

        {/* Sort row */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-label-small font-medium uppercase tracking-[0.15em] text-outline">
            Collections
          </p>
          <select
            value={sortBy}
            aria-label="Sort collections"
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="rounded-sm bg-transparent text-label-medium text-outline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <option value="most">Most highlights</option>
            <option value="az">A - Z</option>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>

        {/* Collection cards */}
        <div className="flex flex-col gap-2">
          {filtered.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => handleCollectionClick(c)}
              className="flex w-full items-center gap-3 rounded-md border border-outline-variant bg-surface-container-lowest p-3 text-left font-[inherit] shadow-elevation-1 transition-all duration-short ease-standard hover:-translate-y-0.5 hover:shadow-elevation-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <div className="w-9 h-9 rounded-sm flex items-center justify-center text-title-medium leading-none shrink-0 bg-[color-mix(in_srgb,var(--md-sys-color-primary)_8%,transparent)]">
                {c.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body-small font-medium truncate mb-0.5 text-on-surface">
                  {c.domain}
                </p>
                <p className="text-label-small text-outline">
                  {c.highlightCount} highlights - {c.lastActivity}
                </p>
              </div>
              <ChevronRight size={13} className="text-outline shrink-0" />
            </button>
          ))}
        </div>

        {/* Mode reminder */}
        <p className="text-center text-body-small mt-8 text-outline">
          Switch modes anytime in{' '}
          <a
            href="/settings"
            className="inline-flex min-h-[48px] items-center rounded-md px-2 -mx-2 underline text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            onClick={(e) => {
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
