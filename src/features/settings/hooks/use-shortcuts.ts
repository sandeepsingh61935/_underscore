import { useEffect, useState } from 'react';

import type { Chord, ShortcutPlatform } from '@/shared/keyboard/shortcut-chord';
import { detectShortcutPlatform } from '@/shared/keyboard/shortcut-chord';
import type { IShortcutStorage } from '@/shared/keyboard/shortcut-storage';
import { getShortcutStorage } from '@/shared/keyboard/shortcut-storage';
import type { ShortcutRow } from '@/shared/keyboard/shortcuts-table';
import { buildShortcutsTable } from '@/shared/keyboard/shortcuts-table';

export interface UseShortcutsResult {
  overrides: Record<string, Chord>;
  rows: ShortcutRow[];
  platform: ShortcutPlatform;
  hasOverrides: boolean;
  setOverride: (id: string, chord: Chord) => Promise<void>;
  resetOverride: (id: string) => Promise<void>;
  resetAll: () => Promise<void>;
}

export function useShortcuts(storage: IShortcutStorage = getShortcutStorage()): UseShortcutsResult {
  const [platform] = useState<ShortcutPlatform>(() => detectShortcutPlatform());
  const [overrides, setOverrides] = useState<Record<string, Chord>>({});

  useEffect(() => {
    let mounted = true;
    void storage.getOverrides().then((initial) => {
      if (mounted) {
        setOverrides(initial);
      }
    });

    const unsubscribe = storage.onChange((updated) => {
      if (mounted) {
        setOverrides(updated);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [storage]);

  const rows = buildShortcutsTable(platform);
  const hasOverrides = Object.keys(overrides).length > 0;

  const setOverride = async (id: string, chord: Chord): Promise<void> => {
    await storage.setOverride(id, chord);
    const updated = await storage.getOverrides();
    setOverrides(updated);
  };

  const resetOverride = async (id: string): Promise<void> => {
    await storage.resetOverride(id);
    const updated = await storage.getOverrides();
    setOverrides(updated);
  };

  const resetAll = async (): Promise<void> => {
    await storage.resetAll();
    setOverrides({});
  };

  return {
    overrides,
    rows,
    platform,
    hasOverrides,
    setOverride,
    resetOverride,
    resetAll,
  };
}
