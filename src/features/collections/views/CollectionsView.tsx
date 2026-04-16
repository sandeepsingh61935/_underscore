import { motion } from 'framer-motion';
import { ChevronRight, Search, Settings } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { springs } from '@/ui-system/motion/springs';
import { cn } from '@/ui-system/utils/cn';

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 20, mass: 1.0 } },
};

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
  highlightCount: number;
  lastActivity: string;
}

type SortBy = 'most' | 'az' | 'newest';

const AUTH_REQUIRED_MODES: ModeType[] = ['vault', 'neural'];

interface CollectionsViewProps {
  onLogout?: () => void;
  onCollectionClick?: (domain: string) => void;
  onSignInClick?: () => void;
  onSettingsClick?: () => void;
  user?: { id: string; email: string; displayName: string; photoUrl?: string } | null;
  isAuthenticated?: boolean;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- JSX return type inferred
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
    if (!isAuthenticated && AUTH_REQUIRED_MODES.includes(mode)) {
      navigate('/mode');
    }
  }, [isAuthenticated, mode, navigate]);

  /* Mock data */
  const mockCollections: Collection[] = [
    { id: '1', domain: 'medium.com',             highlightCount: 23, lastActivity: '2 days ago'   },
    { id: '2', domain: 'developer.mozilla.org',  highlightCount: 15, lastActivity: '5 days ago'   },
    { id: '3', domain: 'arxiv.org',              highlightCount: 8,  lastActivity: '1 week ago'   },
    { id: '4', domain: 'github.com',             highlightCount: 5,  lastActivity: '2 weeks ago'  },
  ];

  const sorted = [...mockCollections].sort((a, b) => {
    switch (sortBy) {
      case 'az':     return a.domain.localeCompare(b.domain);
      case 'most':   return b.highlightCount - a.highlightCount;
      case 'newest': return 0; // mock order
      default:       return 0;
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
    <div className="h-full overflow-hidden w-full flex flex-col bg-surface text-on-surface">

      {/* Header — glass + mode badge + settings */}
      <header
        className="flex items-center justify-between px-4 py-3 border-b border-outline-variant flex-shrink-0"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--md-sys-color-surface) 88%, transparent)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <h1 className="font-display text-[20px] font-normal tracking-[-0.02em] text-on-surface">
          Collections
        </h1>
        <div className="flex items-center gap-2">
          {/* Mode badge pill */}
          <div className={cn(
            'flex items-center gap-[5px] px-[10px] py-1 rounded-full',
            'bg-[color-mix(in_srgb,var(--ink-mode)_12%,transparent)]',
            'border border-[color-mix(in_srgb,var(--ink-mode)_25%,transparent)]',
            'text-[11px] font-medium text-primary',
          )}>
            <span className="w-[5px] h-[5px] rounded-full bg-primary" />
            {MODE_DISPLAY[mode]}
          </div>
          {/* Settings button */}
          <button
            type="button"
            aria-label="Open settings"
            onClick={() => { if (_onSettingsClick) { _onSettingsClick(); } else { navigate('/settings'); } }}
            className="w-8 h-8 rounded-full flex items-center justify-center border border-outline-variant bg-surface-container-lowest text-outline transition-colors duration-[180ms] hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Settings size={15} />
          </button>
        </div>
      </header>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 [scrollbar-width:thin]">

        {/* Search */}
        <div className="flex items-center gap-[10px] px-3 py-[10px] rounded-[10px] mb-4 transition-all duration-[180ms] bg-surface-container-lowest border border-outline-variant focus-within:border-outline focus-within:shadow-elevation-1">
          <Search size={14} className="text-outline shrink-0" />
          <input
            type="text"
            aria-label="Search collections"
            placeholder="Search collections..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none text-[13px] text-on-surface placeholder:text-outline focus:outline-none"
          />
        </div>

        {/* Sort row */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
            {filtered.length} {filtered.length === 1 ? 'collection' : 'collections'}
          </span>
          <div className="flex items-center gap-1">
            {(['most', 'az', 'newest'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setSortBy(opt)}
                className={cn(
                  'px-[10px] py-[4px] rounded-full text-[10px] font-medium transition-all duration-[180ms]',
                  'border',
                  sortBy === opt
                    ? 'bg-[color-mix(in_srgb,var(--ink-mode)_12%,transparent)] border-[color-mix(in_srgb,var(--ink-mode)_30%,transparent)] text-primary'
                    : 'bg-transparent border-outline-variant text-outline hover:text-on-surface-variant hover:border-outline',
                )}
              >
                {opt === 'most' ? 'Most' : opt === 'az' ? 'A\u2013Z' : 'Recent'}
              </button>
            ))}
          </div>
        </div>

        {/* Collection cards */}
        <motion.div
          className="flex flex-col gap-2"
          variants={listVariants}
          initial="hidden"
          animate="show"
        >
          {filtered.map((c) => (
            <motion.div key={c.id} variants={itemVariants}>
              <motion.button
                type="button"
                onClick={() => handleCollectionClick(c)}
                whileHover={{ y: -2, scale: 1.012 }}
                whileTap={{ scale: 0.98 }}
                transition={springs.snappy}
                className={cn(
                  'group flex w-full items-center gap-3 rounded-[12px]',
                  'border border-outline-variant bg-surface-container-lowest',
                  'p-3 text-left',
                  'transition-colors transition-shadow duration-[280ms] ease-out',
                  'hover:shadow-elevation-2',
                  'hover:border-[color-mix(in_srgb,var(--ink-mode)_30%,transparent)]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                )}
              >
                {/* Domain initial favicon slot */}
                <div className="w-10 h-10 rounded-[8px] flex items-center justify-center shrink-0 bg-surface-container text-[13px] font-semibold text-on-surface-variant">
                  {(c.domain[0] ?? '?').toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate text-on-surface mb-[2px]">
                    {c.domain}
                  </p>
                  <p className="text-[11px] text-outline">
                    {c.lastActivity}
                  </p>
                </div>

                {/* Mode-colored count badge */}
                <div className={cn(
                  'flex items-center gap-[3px] px-[8px] py-[3px] rounded-full shrink-0',
                  'bg-[color-mix(in_srgb,var(--ink-mode)_12%,transparent)]',
                  'text-[10px] font-semibold text-primary',
                )}>
                  {c.highlightCount}
                </div>

                <ChevronRight
                  size={13}
                  className="text-outline shrink-0 transition-transform duration-[180ms] group-hover:translate-x-[2px] group-hover:text-primary"
                />
              </motion.button>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
