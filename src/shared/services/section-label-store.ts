/**
 * @file section-label-store.ts
 * @description Mode-scoped display labels for Library section rows (cosmetic only).
 * Spec: docs/superpowers/specs/2026-07-17-section-label-rename-prd.md
 */

import type { HighlightStorageScope } from '@/shared/constants/highlight-storage-scope';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';

/** domain -> sectionKey -> display label */
export type SectionLabelsMap = Record<string, Record<string, string>>;

export function sectionLabelsStorageKey(scope: HighlightStorageScope): string {
  return `section_labels:${scope}`;
}

/** Guest/Basic → basic; Pro / Pro-xAI → pro. */
export function sectionLabelScopeFromMode(
  mode: ModeType | string | null | undefined
): HighlightStorageScope {
  if (mode === 'pro' || mode === 'pro_xai') return 'pro';
  return 'basic';
}

export function defaultSectionTitle(sectionKey: string): string {
  return sectionKey === '/' ? 'Home' : sectionKey;
}

export function displaySectionTitle(
  sectionKey: string,
  labels: Record<string, string> | undefined
): string {
  const override = labels?.[sectionKey];
  if (override !== undefined && override.trim() !== '') {
    return override;
  }
  return defaultSectionTitle(sectionKey);
}

/**
 * Apply a label update to an in-memory store.
 * Empty/whitespace label removes the override for that section.
 */
export function applySectionLabel(
  store: SectionLabelsMap,
  domain: string,
  sectionKey: string,
  label: string
): SectionLabelsMap {
  const trimmed = label.trim();
  const next: SectionLabelsMap = { ...store };
  const domainMap = { ...(next[domain] ?? {}) };

  if (trimmed === '') {
    delete domainMap[sectionKey];
  } else {
    domainMap[sectionKey] = trimmed;
  }

  if (Object.keys(domainMap).length === 0) {
    delete next[domain];
  } else {
    next[domain] = domainMap;
  }

  return next;
}

function hasChromeLocalStorage(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.storage?.local;
}

export async function loadSectionLabelsStore(
  scope: HighlightStorageScope
): Promise<SectionLabelsMap> {
  if (!hasChromeLocalStorage()) return {};
  const key = sectionLabelsStorageKey(scope);
  const result = await chrome.storage.local.get(key);
  const raw = result[key];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as SectionLabelsMap;
}

export async function getDomainSectionLabels(
  scope: HighlightStorageScope,
  domain: string
): Promise<Record<string, string>> {
  if (!domain) return {};
  const store = await loadSectionLabelsStore(scope);
  return { ...(store[domain] ?? {}) };
}

export async function setDomainSectionLabel(
  scope: HighlightStorageScope,
  domain: string,
  sectionKey: string,
  label: string
): Promise<Record<string, string>> {
  if (!domain || !sectionKey) {
    return getDomainSectionLabels(scope, domain);
  }
  if (!hasChromeLocalStorage()) {
    // In-memory no-op for non-extension; caller still gets computed domain map.
    const empty = applySectionLabel({}, domain, sectionKey, label);
    return { ...(empty[domain] ?? {}) };
  }

  const store = await loadSectionLabelsStore(scope);
  const next = applySectionLabel(store, domain, sectionKey, label);
  await chrome.storage.local.set({ [sectionLabelsStorageKey(scope)]: next });
  return { ...(next[domain] ?? {}) };
}
