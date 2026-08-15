import React from 'react';

import type { ActiveTab } from '../../../entrypoints/popup/chrome';

export interface TabBarProps {
  active?: ActiveTab;
  onChange?: (tab: ActiveTab) => void;
}

const TABS: ReadonlyArray<{ id: ActiveTab; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'collections', label: 'Library' },
  { id: 'settings', label: 'Settings' },
];

export function TabBar({ active = 'home', onChange }: TabBarProps): React.ReactElement {
  return (
    <nav className="tabbar" aria-label="Primary">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={active === t.id ? 'active' : ''}
          aria-current={active === t.id ? 'page' : undefined}
          onClick={() => onChange?.(t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}
