import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  applySectionLabel,
  defaultSectionTitle,
  displaySectionTitle,
  getDomainSectionLabels,
  loadSectionLabelsStore,
  sectionLabelScopeFromMode,
  sectionLabelsStorageKey,
  setDomainSectionLabel,
} from '@/shared/services/section-label-store';

describe('section-label-store pure helpers', () => {
  it('maps modes to basic vs pro storage scope', () => {
    expect(sectionLabelScopeFromMode('basic')).toBe('basic');
    expect(sectionLabelScopeFromMode(null)).toBe('basic');
    expect(sectionLabelScopeFromMode('pro')).toBe('pro');
    expect(sectionLabelScopeFromMode('pro_xai')).toBe('pro');
  });

  it('builds mode-scoped storage keys', () => {
    expect(sectionLabelsStorageKey('basic')).toBe('section_labels:basic');
    expect(sectionLabelsStorageKey('pro')).toBe('section_labels:pro');
  });

  it('defaults Home for root path', () => {
    expect(defaultSectionTitle('/')).toBe('Home');
    expect(defaultSectionTitle('/docs')).toBe('/docs');
  });

  it('displaySectionTitle prefers non-empty override', () => {
    expect(displaySectionTitle('/docs', { '/docs': 'Guides' })).toBe('Guides');
    expect(displaySectionTitle('/docs', { '/docs': '  ' })).toBe('/docs');
    expect(displaySectionTitle('/', {})).toBe('Home');
  });

  it('applySectionLabel sets, clears empty, and drops empty domains', () => {
    let store = applySectionLabel({}, 'github.com', '/docs', '  Guides  ');
    expect(store).toEqual({ 'github.com': { '/docs': 'Guides' } });

    store = applySectionLabel(store, 'github.com', '/docs', '   ');
    expect(store).toEqual({});

    store = applySectionLabel(
      { 'github.com': { '/docs': 'Guides', '/blog': 'Blog' } },
      'github.com',
      '/docs',
      ''
    );
    expect(store).toEqual({ 'github.com': { '/blog': 'Blog' } });
  });
});

describe('section-label-store chrome.storage', () => {
  let memory: Record<string, unknown>;

  beforeEach(() => {
    memory = {};
    (globalThis as { chrome?: unknown }).chrome = {
      storage: {
        local: {
          get: vi.fn(async (key: string | string[]) => {
            const k = Array.isArray(key) ? key[0] : key;
            if (k && memory[k] !== undefined) return { [k]: memory[k] };
            return {};
          }),
          set: vi.fn(async (items: Record<string, unknown>) => {
            Object.assign(memory, items);
          }),
        },
      },
    };
  });

  it('round-trips labels under basic scope', async () => {
    await setDomainSectionLabel('basic', 'github.com', '/docs', 'Guides');
    const labels = await getDomainSectionLabels('basic', 'github.com');
    expect(labels).toEqual({ '/docs': 'Guides' });
    expect(memory['section_labels:basic']).toEqual({
      'github.com': { '/docs': 'Guides' },
    });
  });

  it('keeps basic and pro maps isolated', async () => {
    await setDomainSectionLabel('basic', 'github.com', '/docs', 'Guest name');
    await setDomainSectionLabel('pro', 'github.com', '/docs', 'Account name');

    expect(await getDomainSectionLabels('basic', 'github.com')).toEqual({
      '/docs': 'Guest name',
    });
    expect(await getDomainSectionLabels('pro', 'github.com')).toEqual({
      '/docs': 'Account name',
    });
  });

  it('clears override when label is whitespace', async () => {
    await setDomainSectionLabel('basic', 'example.com', '/', 'Root');
    await setDomainSectionLabel('basic', 'example.com', '/', '  ');
    expect(await getDomainSectionLabels('basic', 'example.com')).toEqual({});
    expect(await loadSectionLabelsStore('basic')).toEqual({});
  });
});
