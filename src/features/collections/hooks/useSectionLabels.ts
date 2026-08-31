/**
 * @file useSectionLabels.ts
 * @description Load/save display labels for section rows under a domain.
 * Spec: docs/superpowers/specs/2026-07-17-section-label-rename-prd.md
 */

import { useCallback, useEffect, useState } from 'react';

import { isExtensionContext } from '@/features/collections/hooks/useHighlightExport';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import {
  getDomainSectionLabels,
  sectionLabelScopeFromMode,
  setDomainSectionLabel,
} from '@/shared/services/section-label-store';

export interface UseSectionLabelsResult {
  labels: Record<string, string>;
  /** Whether rename UI should be shown (extension with chrome.storage). */
  canEdit: boolean;
  isLoading: boolean;
  saveLabel: (sectionKey: string, label: string) => Promise<boolean>;
}

export function useSectionLabels(
  domain: string,
  mode: ModeType | string | null | undefined
): UseSectionLabelsResult {
  const scope = sectionLabelScopeFromMode(mode);
  const canEdit = isExtensionContext();
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(canEdit && !!domain);

  useEffect(() => {
    if (!canEdit || !domain) {
      setLabels({});
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    void getDomainSectionLabels(scope, domain).then((next) => {
      if (!cancelled) {
        setLabels(next);
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [canEdit, domain, scope]);

  const saveLabel = useCallback(
    async (sectionKey: string, label: string): Promise<boolean> => {
      if (!canEdit || !domain || !sectionKey) return false;
      try {
        const next = await setDomainSectionLabel(scope, domain, sectionKey, label);
        setLabels(next);
        return true;
      } catch {
        return false;
      }
    },
    [canEdit, domain, scope]
  );

  return { labels, canEdit, isLoading, saveLabel };
}
