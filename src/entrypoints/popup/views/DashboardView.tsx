import { motion } from 'framer-motion';
import { Home, Layers, Search, Settings } from 'lucide-react';
import React, { useState } from 'react';

import { useCurrentUser } from '../../../features/auth/hooks/useCurrentUser';
import { CollectionList } from '../../../features/collections/components/CollectionList';
import { useCollections } from '../../../features/collections/hooks/useCollections';
import { Logo } from '../../../ui-system/components/primitives/Logo';

import { useApp } from '@/core/context/AppProvider';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { springs } from '@/ui-system/motion/springs';
import { cn } from '@/ui-system/utils/cn';

const MODE_DISPLAY: Record<ModeType, string> = {
    walk:   'Focus',
    sprint: 'Capture',
    vault:  'Memory',
    neural: 'Neural',
};

type Tab = 'home' | 'collections' | 'search' | 'settings';

const TABS = [
  { id: 'home'        as const, label: 'Home',        Icon: Home    },
  { id: 'collections' as const, label: 'Collections', Icon: Layers  },
  { id: 'search'      as const, label: 'Search',      Icon: Search  },
  { id: 'settings'    as const, label: 'Settings',    Icon: Settings },
] as const;

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 20, mass: 1.0 } },
};

interface DashboardViewProps {
  onLogout: () => void;
  onTabChange?: (tab: Tab) => void;
  activeTab?: Tab;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- JSX return type inferred
export function DashboardView({ onLogout, onTabChange, activeTab = 'home' }: DashboardViewProps) {
  const { user, logout } = useCurrentUser();
  const { currentMode } = useApp();
  const { collections, isLoading: isCollectionsLoading } = useCollections();

  const [selectedCollectionId, setSelectedCollectionId] = useState<string>();

  const handleLogout = async (): Promise<void> => {
    await logout();
    onLogout();
  };

  if (!user) return null;

  return (
    <div className="h-full w-full flex flex-col bg-surface overflow-hidden">

      {/* Header — glass + mode pill */}
      <header
        className="flex items-center justify-between px-4 py-3 border-b border-outline-variant flex-shrink-0"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--md-sys-color-surface) 88%, transparent)',
          backdropFilter: 'blur(12px)',
          backgroundImage: 'linear-gradient(to bottom, color-mix(in srgb, var(--ink-mode) 5%, transparent), transparent)',
        }}
      >
        {/* Logo + mode pill */}
        <div className="flex items-center gap-2">
          <Logo size="sm" showText={false} />
          <div className={cn(
            'flex items-center gap-[5px] px-[10px] py-1 rounded-full',
            'bg-[color-mix(in_srgb,var(--ink-mode)_12%,transparent)]',
            'border border-[color-mix(in_srgb,var(--ink-mode)_25%,transparent)]',
            'text-[11px] font-medium text-primary',
          )}>
            <span className="w-[5px] h-[5px] rounded-full bg-primary animate-pulse" />
            {MODE_DISPLAY[currentMode] ?? 'Focus'}
          </div>
        </div>

        {/* Avatar */}
        <button
          type="button"
          onClick={handleLogout}
          className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center text-[12px] font-semibold text-on-surface-variant cursor-pointer hover:bg-surface-container transition-colors duration-[180ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {(user.displayName?.[0] ?? user.email?.[0] ?? 'U').toUpperCase()}
        </button>
      </header>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 [scrollbar-width:thin]">

        {/* Recent highlights */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
              Recent highlights
            </span>
            <button
              type="button"
              className="text-[10px] text-primary hover:opacity-80 transition-opacity duration-[180ms] border-0 bg-transparent cursor-pointer"
            >
              See all
            </button>
          </div>
          <motion.div
            className="rounded-[10px] border border-outline-variant bg-surface-container-lowest"
            variants={listVariants}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={itemVariants} className="px-4 py-6 text-center">
              <p className="text-[12px] text-outline">No recent highlights</p>
            </motion.div>
          </motion.div>
        </section>

        {/* Collections */}
        <section className="pb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
              Collections
            </span>
            <button
              type="button"
              onClick={() => onTabChange?.('collections')}
              className="text-[10px] text-primary hover:opacity-80 transition-opacity duration-[180ms] border-0 bg-transparent cursor-pointer"
            >
              View all
            </button>
          </div>
          <CollectionList
            collections={collections.map((c) => ({
              id: c.id,
              domain: c.domain,
              count: c.highlightCount,
              lastActive: c.lastActive,
            }))}
            isLoading={isCollectionsLoading}
            selectedId={selectedCollectionId}
            onSelect={setSelectedCollectionId}
          />
        </section>
      </div>

      {/* Tab bar */}
      <nav
        className="flex-shrink-0 border-t border-outline-variant"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--md-sys-color-surface) 90%, transparent)',
          backdropFilter: 'blur(12px)',
        }}
        aria-label="Main navigation"
      >
        <div className="flex items-stretch">
          {TABS.map(({ id, label, Icon }) => {
            const isActive = activeTab === id;
            return (
              <motion.button
                key={id}
                type="button"
                onClick={() => onTabChange?.(id)}
                whileTap={{ scale: 0.9 }}
                transition={springs.snappy}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
                className="flex flex-1 flex-col items-center gap-[3px] py-[10px] min-h-[56px] border-0 bg-transparent cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Icon
                  size={20}
                  style={{ color: isActive ? 'var(--ink-mode)' : undefined }}
                  className={isActive ? '' : 'text-outline'}
                />
                <span
                  className="text-[10px] font-medium"
                  style={{ color: isActive ? 'var(--ink-mode)' : undefined }}
                >
                  {isActive ? label : <span className="text-outline">{label}</span>}
                </span>
              </motion.button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
