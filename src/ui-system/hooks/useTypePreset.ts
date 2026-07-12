/**
 * @file useTypePreset.ts
 * @description Reactive read/write of the user's typography preset.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  TYPE_PRESET_DEFAULT,
  TYPE_PRESET_STORAGE_KEY,
  applyTypePresetSelection,
  getPresetDisplayName,
  getTypePresetSelection,
  isTypePresetSelection,
  resolveTypographyTokens,
  setTypePresetSelection,
  type TypePresetSelection,
  type TypographyTokens,
} from '@/shared/constants/type-presets';
import { applyTypePresetWithImports } from '@/shared/services/font-import-store';

export function useTypePreset(): {
  selection: TypePresetSelection;
  tokens: TypographyTokens;
  displayName: string;
  ready: boolean;
  setSelection: (selection: TypePresetSelection) => Promise<void>;
  resetToDefault: () => Promise<void>;
} {
  const [selection, setSelectionState] = useState<TypePresetSelection>(TYPE_PRESET_DEFAULT);
  const [ready, setReady] = useState(false);

  const tokens = useMemo(() => resolveTypographyTokens(selection), [selection]);
  const displayName = useMemo(() => getPresetDisplayName(selection), [selection]);

  const applySelection = useCallback((next: TypePresetSelection): void => {
    void applyTypePresetWithImports(next, applyTypePresetSelection);
  }, []);

  useEffect(() => {
    let mounted = true;

    getTypePresetSelection()
      .then((stored) => {
        if (!mounted) return;
        setSelectionState(stored);
        applySelection(stored);
        setReady(true);
      })
      .catch(() => {
        if (mounted) setReady(true);
      });

    const onStorage = (raw: unknown): void => {
      if (!isTypePresetSelection(raw)) return;
      setSelectionState(raw);
      applySelection(raw);
    };

    const chromeListener = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ): void => {
      if (area !== 'local' || !changes[TYPE_PRESET_STORAGE_KEY]) return;
      onStorage(changes[TYPE_PRESET_STORAGE_KEY].newValue);
    };

    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged?.addListener) {
      chrome.storage.onChanged.addListener(chromeListener);
    }

    const localListener = (event: StorageEvent): void => {
      if (event.key !== TYPE_PRESET_STORAGE_KEY || !event.newValue) return;
      try {
        onStorage(JSON.parse(event.newValue) as unknown);
      } catch {
        // ignore malformed storage events
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', localListener);
    }

    return () => {
      mounted = false;
      if (typeof chrome !== 'undefined' && chrome.storage?.onChanged?.removeListener) {
        chrome.storage.onChanged.removeListener(chromeListener);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', localListener);
      }
    };
  }, [applySelection]);

  const setSelection = useCallback(async (next: TypePresetSelection): Promise<void> => {
    await setTypePresetSelection(next);
    setSelectionState(next);
    applySelection(next);
  }, [applySelection]);

  const resetToDefault = useCallback(async (): Promise<void> => {
    await setSelection(TYPE_PRESET_DEFAULT);
  }, [setSelection]);

  return { selection, tokens, displayName, ready, setSelection, resetToDefault };
}

/** Mount at app root to apply stored typography before any view renders. */
export function TypePresetBootstrap(): null {
  useTypePreset();
  return null;
}
