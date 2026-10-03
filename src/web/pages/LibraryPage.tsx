/**
 * @file LibraryPage.tsx
 * @description Product Library — OD viewLibrary parity: domain/section rail,
 * client-side search/filters, URL-synced selection. No extension runtime messaging.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { useBillingContextOptional } from '@/features/billing/BillingProvider';
import { DeleteConfirmDialog } from '@/features/collections/components/DeleteConfirmDialog';
import { HighlightSearchBar } from '@/features/collections/components/HighlightSearchBar';
import { useUpdateHighlightMetadata } from '@/features/collections/hooks/useUpdateHighlightMetadata';
import { libraryEmptyInstallCopy } from '@/shared/copy/product-surface-copy';
import type { ExportFormat } from '@/shared/highlight-export';
import { deleteDomainCopy, deleteSectionCopy } from '@/shared/utils/confirm-dialog-copy';
import { useFilterStore } from '@/features/collections/stores/filter.store';
import { aggregateLibrary } from '@/web/lib/aggregateLibrary';
import { filterHighlightsByRefineAndTags } from '@/shared/utils/highlight-filter';
import {
  formatMatchBadge,
  searchHighlights,
  type SearchField,
} from '@/shared/utils/highlight-search';
import { displaySectionPath, pageHrefForLibrary } from '@/shared/utils/page-href';
import { resolveWebCaps } from '@/web/caps/resolveWebCaps';
import { resolveWebPaidActive } from '@/web/caps/resolveWebPaidActive';
import { DomainFavicon } from '@/web/components/DomainFavicon';
import { LibraryHighlightDetail } from '@/web/components/LibraryHighlightDetail';
import { RelatedPagesSection } from '@/web/components/RelatedPagesSection';
import { RelatedTagsSection } from '@/web/components/RelatedTagsSection';
import { WebHighlightCard } from '@/web/components/WebHighlightCard';
import { useExtensionPresence } from '@/web/extension-presence-context';
import {
  useRelatedHighlights,
  useRelatednessService,
  useRelatedPages,
  useRelatedTags,
} from '@/web/hooks/useRelatedness';
import { useVaultSync } from '@/web/hooks/useVaultSync';
import { useWebGroups } from '@/web/hooks/useWebGroups';
import { useWebHighlightDelete } from '@/web/hooks/useWebHighlightDelete';
import { useWebLibrary, type WebHighlight } from '@/web/hooks/useWebLibrary';
import { trackEvent } from '@/web/lib/analytics';
import { isHandheldClient } from '@/web/lib/classify-web-client';
import { useMobileWebViewport } from '@/web/lib/is-mobile-web-viewport';
import { useWebClientKind } from '@/web/lib/use-web-client-kind';
import { clampPage } from '@/web/lib/buildPagerItems';
import { createWebGroupRepository } from '@/web/lib/web-group-repository';
import { LibraryPager } from '@/web/components/LibraryPager';
import { createOptimisticMetadataHandlers } from '@/web/lib/optimisticMetadataSave';
import {
  exportScopeFromSelection,
  exportWebHighlights,
} from '@/web/lib/webHighlightExport';
import {
  buildLibrarySearch,
  parseLibrarySelection,
} from '@/web/routing/librarySelection';
import { PhoneLibrary } from '@/web/components/PhoneLibrary';
import { buildGroupPageUrlSet } from '@/shared/utils/group-library-search';

type LibSort = 'newest' | 'oldest' | 'domain' | 'quote';

const SORT_LABELS: Record<LibSort, string> = {
  newest: 'Newest',
  oldest: 'Oldest',
  domain: 'Domain A–Z',
  quote: 'Quote A–Z',
};

const PAGE_SIZE = 12;

const SORT_FNS: Record<LibSort, (a: WebHighlight, b: WebHighlight) => number> = {
  newest: (a, b) => b.savedAt - a.savedAt || a.id.localeCompare(b.id),
  oldest: (a, b) => a.savedAt - b.savedAt || a.id.localeCompare(b.id),
  domain: (a, b) => a.domain.localeCompare(b.domain) || b.savedAt - a.savedAt,
  quote: (a, b) => a.quote.localeCompare(b.quote) || b.savedAt - a.savedAt,
};

function ChevDown(): React.ReactElement {
  return (
    <svg
      className="chev"
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 4.5 6 8l3-3.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIco(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3.5 4.5h9M6 4.5V3.5h4v1M5.5 4.5l.5 8h4l.5-8"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function domainOdId(domain: string): string {
  return `lib-domain-${domain.replace(/\./g, '-')}`;
}

function sectionOdId(path: string): string {
  return `lib-sec-${path.replace(/[^a-z0-9]+/gi, '-')}`;
}

type SearchableRow = WebHighlight & {
  text: string;
  notes: string;
  url: string;
};

function toSearchable(h: WebHighlight): SearchableRow {
  return {
    ...h,
    text: h.quote,
    notes: h.note,
    url: `https://${h.domain}${h.path || '/'}`,
  };
}

function filterBySelection(
  rows: WebHighlight[],
  domain: string | null,
  section: string | null
): WebHighlight[] {
  if (!domain) return rows;
  let list = rows.filter((h) => h.domain === domain);
  if (section) {
    list = list.filter((h) => h.path === section);
  }
  return list;
}

function corpusTags(rows: WebHighlight[]): { label: string; n: number }[] {
  const counts = new Map<string, { label: string; n: number }>();
  for (const h of rows) {
    for (const t of h.tags) {
      const k = t.toLowerCase();
      const prev = counts.get(k);
      counts.set(k, { label: prev?.label ?? t, n: (prev?.n ?? 0) + 1 });
    }
  }
  return [...counts.values()].sort((a, b) => b.n - a.n || a.label.localeCompare(b.label));
}

/**
 * Library master-detail. Guest is always empty (useWebLibrary).
 * Selection lives in the URL (`?domain=&section=`).
 */
function LibraryEmptyInstall({ isGuest }: { isGuest: boolean }): React.ReactElement {
  const extPresence = useExtensionPresence();
  const extensionInstalled = extPresence === 'installed';
  const copy = libraryEmptyInstallCopy({ guest: isGuest, extensionInstalled });
  const showInstall = Boolean(copy.installHref && copy.installLabel);
  return (
    <>
      <h3>{copy.title}</h3>
      <p>{copy.body}</p>
      {showInstall || copy.signInLabel ? (
        <div className="actions">
          {showInstall ? (
            <Link
              to={copy.installHref}
              state={{ from: '/library' }}
              className="btn primary sm"
              data-od-id="library-empty-install"
            >
              {copy.installLabel}
            </Link>
          ) : null}
          {copy.signInLabel ? (
            <Link
              to="/sign-in"
              className="btn accent sm"
              data-od-id="library-guest-signin"
            >
              {copy.signInLabel}
            </Link>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

export function LibraryPage(): React.ReactElement {
  const { isAuthenticated } = useApp();
  const billing = useBillingContextOptional();
  const location = useLocation();
  const navigate = useNavigate();

  const isPaidActive = resolveWebPaidActive(billing?.snapshot);
  const caps = useMemo(
    () =>
      resolveWebCaps({
        isAuthenticated,
        isPaidActive,
        billingStatus: billing?.snapshot.entitlement.status ?? null,
      }),
    [isAuthenticated, isPaidActive, billing?.snapshot.entitlement.status]
  );

  const clientKind = useWebClientKind();
  const handheld = isHandheldClient(clientKind);
  const consumeOnly = caps.isGuest || handheld;
  const phoneLayout = useMobileWebViewport();

  const lib = useWebLibrary({
    isAuthenticated,
    planLabel: caps.planLabel,
  });
  const { updateMetadata } = useUpdateHighlightMetadata();
  const patchHighlight = lib.patchHighlight;
  const { deleteScope } = useWebHighlightDelete({
    highlights: lib.highlights,
    removeHighlights: lib.removeHighlights,
  });

  const vault = useVaultSync({
    highlights: lib.highlights,
    isAuthenticated: !caps.isGuest,
    autoSync: true,
  });

  const groupsRepository = useMemo(() => createWebGroupRepository(), []);
  const webGroups = useWebGroups({
    isAuthenticated: !caps.isGuest,
    repository: groupsRepository,
  });

  const corpusBase = lib.highlights;

  const selection = useMemo(
    () => parseLibrarySelection(location.search),
    [location.search]
  );

  /** Optional `?tag=` from Home chip navigation (seed into filters once). */
  const initialTagFromUrl = useMemo(() => {
    const raw = new URLSearchParams(location.search).get('tag');
    return raw?.trim() || null;
  }, [location.search]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const {
    query,
    fields,
    refine,
    tagFilters,
    setQuery,
    setFields,
    setRefine,
    setTagFilters,
    toggleTagFilter: storeToggleTagFilter,
  } = useFilterStore();
  const [groupFilters, setGroupFilters] = useState<string[]>([]);
  const [sort, setSort] = useState<LibSort>('newest');
  const [sortOpen, setSortOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [deleteDomainTarget, setDeleteDomainTarget] = useState<{
    domain: string;
    count: number;
  } | null>(null);
  const [deleteSectionTarget, setDeleteSectionTarget] = useState<{
    domain: string;
    path: string;
    count: number;
  } | null>(null);
  const [isDeletingScope, setIsDeletingScope] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const seededTagRef = useRef<string | null>(null);

  // Apply tag filter when arriving from Home with ?tag=
  useEffect(() => {
    if (!initialTagFromUrl) return;
    if (seededTagRef.current === initialTagFromUrl) return;
    seededTagRef.current = initialTagFromUrl;
    const lower = initialTagFromUrl.toLowerCase();
    if (!tagFilters.some((t) => t.toLowerCase() === lower)) {
      setTagFilters([...tagFilters, initialTagFromUrl]);
    }
  }, [initialTagFromUrl, tagFilters, setTagFilters]);

  // Auto-expand domain when URL points at it
  useEffect(() => {
    if (selection.domain) {
      setExpanded((prev) =>
        prev[selection.domain!] ? prev : { ...prev, [selection.domain!]: true }
      );
    }
  }, [selection.domain]);

  // Close menus on outside click
  useEffect(() => {
    if (!sortOpen && !exportOpen) return;
    const onDoc = (e: MouseEvent): void => {
      const t = e.target as Node;
      if (sortOpen && sortRef.current && !sortRef.current.contains(t)) {
        setSortOpen(false);
      }
      if (exportOpen && exportRef.current && !exportRef.current.contains(t)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [sortOpen, exportOpen]);

  const setSelection = useCallback(
    (domain: string | null, section: string | null, highlight: string | null = null) => {
      const search = buildLibrarySearch({ domain, section, highlight });
      void navigate(
        { pathname: '/library', search: search ? `?${search}` : '' },
        { replace: false }
      );
      if (domain) {
        setExpanded((prev) => ({ ...prev, [domain]: true }));
      }
    },
    [navigate]
  );

  const selectAll = useCallback(() => {
    setSelection(null, null, null);
  }, [setSelection]);

  const selectDomain = useCallback(
    (domain: string) => {
      setSelection(domain, null, null);
    },
    [setSelection]
  );

  const selectSection = useCallback(
    (domain: string, path: string) => {
      setSelection(domain, path, null);
    },
    [setSelection]
  );

  const highlightDetailHref = useCallback(
    (id: string) => {
      // Prefer the related highlight's own domain/path so detail lands in its page context.
      const row = lib.highlights.find((h) => h.id === id);
      const search = buildLibrarySearch({
        domain: row?.domain ?? selection.domain,
        section: row ? row.path || null : selection.section,
        highlight: id,
      });
      return search
        ? `/library?${search}`
        : `/library?highlight=${encodeURIComponent(id)}`;
    },
    [lib.highlights, selection.domain, selection.section]
  );

  const openHighlightDetail = useCallback(
    (id: string) => {
      const row = lib.highlights.find((h) => h.id === id);
      // Navigate into the target highlight's page context + detail.
      setSelection(
        row?.domain ?? selection.domain,
        row ? row.path || null : selection.section,
        id
      );
    },
    [lib.highlights, selection.domain, selection.section, setSelection]
  );

  const closeHighlightDetail = useCallback(() => {
    setSelection(selection.domain, selection.section, null);
  }, [selection.domain, selection.section, setSelection]);

  const highlightsRef = useRef(lib.highlights);
  highlightsRef.current = lib.highlights;

  const { handleNoteSave, handleTagsChange } = useMemo(
    () =>
      createOptimisticMetadataHandlers({
        getHighlight: (id) => highlightsRef.current.find((h) => h.id === id),
        patchHighlight,
        updateMetadata,
      }),
    [patchHighlight, updateMetadata]
  );

  const handleHighlightDelete = useCallback(
    async (id: string): Promise<boolean> => {
      const result = await deleteScope({ scope: 'highlight', id });
      if (result.success && selection.highlight === id) {
        setSelection(selection.domain, selection.section, null);
      }
      return result.success;
    },
    [deleteScope, selection.domain, selection.highlight, selection.section, setSelection]
  );

  const confirmDeleteDomain = useCallback(async (): Promise<void> => {
    if (!deleteDomainTarget || isDeletingScope) return;
    setIsDeletingScope(true);
    try {
      const result = await deleteScope({
        scope: 'domain',
        domain: deleteDomainTarget.domain,
      });
      if (result.success) {
        setDeleteDomainTarget(null);
        if (selection.domain === deleteDomainTarget.domain) {
          setSelection(null, null, null);
        }
      }
    } finally {
      setIsDeletingScope(false);
    }
  }, [deleteDomainTarget, deleteScope, isDeletingScope, selection.domain, setSelection]);

  const confirmDeleteSection = useCallback(async (): Promise<void> => {
    if (!deleteSectionTarget || isDeletingScope) return;
    setIsDeletingScope(true);
    try {
      const result = await deleteScope({
        scope: 'section',
        domain: deleteSectionTarget.domain,
        sectionKey: deleteSectionTarget.path,
      });
      if (result.success) {
        setDeleteSectionTarget(null);
        if (
          selection.domain === deleteSectionTarget.domain &&
          selection.section === deleteSectionTarget.path
        ) {
          setSelection(deleteSectionTarget.domain, null, null);
        }
      }
    } finally {
      setIsDeletingScope(false);
    }
  }, [
    deleteScope,
    deleteSectionTarget,
    isDeletingScope,
    selection.domain,
    selection.section,
    setSelection,
  ]);

  const handleToggleTagFilter = useCallback(
    (tag: string) => {
      storeToggleTagFilter(tag);
    },
    [storeToggleTagFilter]
  );

  /** Related tag click = replace single-tag filter (normal tag navigation). */
  const handleRelatedTag = useCallback(
    (tag: string, rank: number) => {
      trackEvent('related_tag_clicked', { rank, reason: 'co-occur' });
      setTagFilters([tag]);
    },
    [setTagFilters]
  );

  const openPage = useCallback(
    (domain: string, path: string) => {
      selectSection(domain, path);
    },
    [selectSection]
  );

  const toggleDomain = useCallback((domain: string) => {
    setExpanded((prev) => ({ ...prev, [domain]: !prev[domain] }));
  }, []);

  const scoped = useMemo(() => {
    return filterBySelection(corpusBase, selection.domain, selection.section);
  }, [corpusBase, selection.domain, selection.section]);

  const filtering =
    query.trim().length > 0 ||
    refine.length > 0 ||
    tagFilters.length > 0 ||
    groupFilters.length > 0;

  const knownGroupPages = useMemo(
    () =>
      lib.highlights.map((h) => ({
        urlNormalized: `https://${h.domain}${h.path || '/'}`,
        title: h.quote.slice(0, 120),
        faviconUrl: null,
      })),
    [lib.highlights]
  );

  /** All group items flattened for the Group filter's resolved-page set. */
  const allGroupItems = useMemo(
    () => Object.values(webGroups.itemsByGroup).flat(),
    [webGroups.itemsByGroup]
  );
  const availableGroups = useMemo(
    () => webGroups.groups.map((g) => ({ id: g.id, name: g.name })),
    [webGroups.groups]
  );

  const groupUrlSet = useMemo(
    () => buildGroupPageUrlSet(allGroupItems, knownGroupPages, groupFilters),
    [allGroupItems, knownGroupPages, groupFilters]
  );

  const allFilteredHighlights = useMemo(() => {
    if (!filtering) return lib.highlights;
    const base = [...lib.highlights].sort(SORT_FNS.newest);
    const refined = filterHighlightsByRefineAndTags(base.map(toSearchable), {
      refine,
      tagFilters,
      groupUrlSet,
    });
    const q = query.trim();
    if (!q) {
      return refined as WebHighlight[];
    }
    return searchHighlights(refined, q, fields).map((m) => m.highlight as WebHighlight);
  }, [lib.highlights, filtering, refine, tagFilters, groupUrlSet, query, fields]);

  const visibleDomains = useMemo(() => {
    if (!filtering) return lib.domains;
    return aggregateLibrary(allFilteredHighlights).domains;
  }, [filtering, allFilteredHighlights, lib.domains]);

  const refinedHighlights = useMemo(() => {
    const base = [...scoped].sort(SORT_FNS.newest);
    return filterHighlightsByRefineAndTags(base.map(toSearchable), {
      refine,
      tagFilters,
      groupUrlSet,
    });
  }, [scoped, refine, tagFilters, groupUrlSet]);

  const filtered = useMemo(() => {
    const q = query.trim();
    let rows: { highlight: WebHighlight; matchedFields: SearchField[] }[];
    if (!q) {
      rows = refinedHighlights.map((h) => ({
        highlight: h as WebHighlight,
        matchedFields: [] as SearchField[],
      }));
    } else {
      rows = searchHighlights(refinedHighlights, q, fields).map((m) => ({
        highlight: m.highlight as WebHighlight,
        matchedFields: m.matchedFields,
      }));
    }
    const cmp = SORT_FNS[sort] ?? SORT_FNS.newest;
    return [...rows].sort((a, b) => cmp(a.highlight, b.highlight));
  }, [refinedHighlights, query, fields, sort]);

  // Reset page when filters / selection / sort change
  useEffect(() => {
    setPage(1);
  }, [selection.domain, selection.section, query, refine, tagFilters, groupFilters, sort]);

  useEffect(() => {
    if (!isAuthenticated) return;
    try {
      if (
        typeof sessionStorage !== 'undefined' &&
        sessionStorage.getItem('underscore:library_open')
      ) {
        return;
      }
      sessionStorage.setItem('underscore:library_open', clientKind);
    } catch {
      // private mode: still emit
    }
    trackEvent('library_open', { client: clientKind });
    // First authenticated paint only — resize must not re-count the kill test.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clientKind snapshot
  }, [isAuthenticated]);

  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const t = window.setTimeout(() => {
      trackEvent('library_search', {
        client: clientKind,
        result_count: filtered.length,
      });
    }, 400);
    return () => window.clearTimeout(t);
  }, [query, filtered.length, clientKind]);

  const tags = useMemo(() => corpusTags(scoped), [scoped]);
  const allTagSuggestions = useMemo(
    () => Array.from(new Set(lib.highlights.flatMap((h) => h.tags || []))),
    [lib.highlights]
  );

  const relatedness = useRelatednessService(lib.highlights);
  const relatedTagResults = useRelatedTags(relatedness, tagFilters);
  const relatedHighlightResults = useRelatedHighlights(relatedness, selection.highlight);
  const relatedPageResults = useRelatedPages(
    relatedness,
    selection.domain,
    selection.section,
    selection.highlight
  );

  const detailHighlight = useMemo(() => {
    if (!selection.highlight) return null;
    return lib.highlights.find((h) => h.id === selection.highlight) ?? null;
  }, [lib.highlights, selection.highlight]);

  const relatedHighlightRows = useMemo(() => {
    const byId = new Map(lib.highlights.map((h) => [h.id, h]));
    return relatedHighlightResults.flatMap((r) => {
      const highlight = byId.get(r.id);
      if (!highlight) return [];
      return [{ ...r, highlight }];
    });
  }, [lib.highlights, relatedHighlightResults]);

  const detailSeedPath = detailHighlight
    ? detailHighlight.path && detailHighlight.path !== '/'
      ? detailHighlight.path
      : selection.section
    : null;
  const detailRelatedPages = useMemo(() => {
    if (!selection.domain || !detailSeedPath) return [];
    return relatedness.relatedPages(selection.domain, detailSeedPath);
  }, [relatedness, selection.domain, detailSeedPath]);
  const detailRelatedLabel = detailSeedPath
    ? `Related to ${displaySectionPath(detailSeedPath)}`
    : 'Related pages';

  const relatedPageHref = useCallback((domain: string, section: string) => {
    const search = buildLibrarySearch({
      domain,
      section,
      highlight: null,
    });
    return search ? `/library?${search}` : '/library';
  }, []);

  const handleOpenRelatedPage = useCallback(
    (_domain: string, _section: string, rank: number, reason: string) => {
      trackEvent('related_page_clicked', { rank, reason });
    },
    []
  );

  const handleOpenRelatedHighlight = useCallback(
    (_id: string, rank: number, reason: string) => {
      // Navigation is handled by the <Link href>; this only records analytics.
      trackEvent('related_highlight_clicked', { rank, reason });
    },
    []
  );

  const title = selection.section
    ? displaySectionPath(selection.section)
    : selection.domain
      ? selection.domain
      : 'All highlights';
  const openPageHref =
    selection.domain && selection.section
      ? pageHrefForLibrary(selection.domain, selection.section)
      : null;

  const totalCount = lib.highlights.length;
  const showDomainSrc = !selection.domain;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = clampPage(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const handleExport = useCallback(
    (format: ExportFormat) => {
      if (consumeOnly || !caps.flags.export || filtered.length === 0) return;
      exportWebHighlights(
        filtered.map((m) => m.highlight),
        format,
        exportScopeFromSelection({
          domain: selection.domain,
          section: selection.section,
        })
      );
      setExportOpen(false);
    },
    [consumeOnly, caps.flags.export, filtered, selection.domain, selection.section]
  );

  if (phoneLayout) {
    if (lib.status === 'loading') {
      return (
        <div
          className="phone-library"
          data-od-id="phone-library-loading"
          aria-busy="true"
        >
          <p className="phone-empty">Loading…</p>
        </div>
      );
    }
    if (lib.status === 'error') {
      return (
        <div className="phone-library" data-od-id="phone-library-error">
          <p className="phone-empty">{lib.error || 'Try again in a moment.'}</p>
          <button
            type="button"
            className="btn sm"
            onClick={() => {
              void lib.refresh();
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    const canWrite = isAuthenticated && !caps.isGuest;
    const seedPath = selection.highlight
      ? (lib.highlights.find((h) => h.id === selection.highlight)?.path ??
        selection.section)
      : (selection.section ??
        lib.highlights
          .filter((h) => h.domain === selection.domain)
          .sort((a, b) => b.savedAt - a.savedAt)[0]?.path ??
        null);
    const phoneRelated =
      selection.domain && seedPath
        ? relatedness.relatedPages(selection.domain, seedPath)
        : [];
    const phoneRelatedLabel =
      seedPath && seedPath !== '/'
        ? `Related to ${displaySectionPath(seedPath)}`
        : 'Related pages';
    const exportRows = lib.highlights.filter(
      (h) =>
        h.domain === selection.domain &&
        (!selection.section || (h.path || '/') === selection.section)
    );

    return (
      <PhoneLibrary
        highlights={filtered.map((row) => row.highlight)}
        query={query}
        onQueryChange={setQuery}
        sort={sort}
        onSortChange={setSort}
        hasLibrary={lib.highlights.length > 0}
        filters={{
          fields,
          onFieldsChange: setFields,
          refine,
          onRefineChange: setRefine,
          tagFilters,
          onTagFiltersChange: setTagFilters,
          availableTags: tags,
          availableGroups,
          groupFilters,
          onGroupFiltersChange: setGroupFilters,
        }}
        domain={selection.domain}
        section={selection.section}
        highlightId={selection.highlight}
        onOpenDomain={(d) => setSelection(d, null, null)}
        onSelectSection={(path) => {
          if (!selection.domain) return;
          setSelection(selection.domain, path, null);
        }}
        onOpenHighlight={(id) => {
          setSelection(selection.domain, selection.section, id);
        }}
        clientKind={clientKind}
        canExport={canWrite && caps.flags.export}
        onExport={
          canWrite && caps.flags.export
            ? (format) => {
                if (exportRows.length === 0 || !selection.domain) return;
                exportWebHighlights(
                  exportRows,
                  format,
                  exportScopeFromSelection({
                    domain: selection.domain,
                    section: selection.section,
                  })
                );
              }
            : undefined
        }
        onDeletePages={
          canWrite && selection.domain
            ? async (paths) => {
                const domainName = selection.domain;
                if (!domainName || paths.length === 0) return false;
                const result = await deleteScope({
                  scope: 'sections',
                  domain: domainName,
                  sectionKeys: paths,
                });
                return result.success;
              }
            : undefined
        }
        onDeleteDomain={
          canWrite && selection.domain
            ? async () => {
                const domain = selection.domain;
                if (!domain) return false;
                const result = await deleteScope({ scope: 'domain', domain });
                if (result.success) setSelection(null, null, null);
                return result.success;
              }
            : undefined
        }
        onNoteSave={handleNoteSave}
        onTagsChange={handleTagsChange}
        onDeleteHighlight={handleHighlightDelete}
        onDeleteHighlights={async (ids) => {
          if (ids.length === 0) return false;
          const result = await deleteScope({ scope: 'highlights', ids });
          if (
            result.success &&
            selection.highlight &&
            ids.includes(selection.highlight)
          ) {
            setSelection(selection.domain, selection.section, null);
          }
          return result.success;
        }}
        relatedPages={phoneRelated}
        relatedLabel={phoneRelatedLabel}
        tagSuggestions={allTagSuggestions}
        onOpenRelatedPage={(domain, section, rank, reason) => {
          trackEvent('related_page_clicked', { rank, reason });
          setSelection(domain, section, null);
        }}
      />
    );
  }

  if (lib.status === 'loading') {
    return (
      <div className="lib-shell" data-od-id="library">
        <div
          className="skeleton-stage"
          data-od-id="loading-state"
          aria-busy="true"
          aria-label="Loading library"
          style={{ padding: 24, gridColumn: '1 / -1' }}
        >
          <div
            className="skeleton sk-line"
            style={{ width: '28%', height: 24, marginBottom: 16 }}
          />
          <div
            className="skeleton"
            style={{ height: 280, borderRadius: 'var(--r-lg)' }}
          />
        </div>
      </div>
    );
  }

  if (lib.status === 'error') {
    return (
      <div className="lib-shell" data-od-id="library">
        <div
          className="state-box"
          data-od-id="error-state"
          style={{ gridColumn: '1 / -1' }}
        >
          <h3>Library unavailable</h3>
          <p>{lib.error || 'Try again in a moment.'}</p>
          <div className="actions">
            <button
              type="button"
              className="btn primary sm"
              onClick={() => {
                void lib.refresh();
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const detailBody = detailHighlight ? (
    <LibraryHighlightDetail
      key={detailHighlight.id}
      highlight={detailHighlight}
      related={relatedHighlightRows}
      relatedPages={detailRelatedPages}
      relatedLabel={detailRelatedLabel}
      onOpenRelatedPage={(domain, section, rank, reason) => {
        trackEvent('related_page_clicked', { rank, reason });
        setSelection(domain, section, null);
      }}
      readOnly={consumeOnly}
      activeTagFilters={tagFilters}
      onBack={closeHighlightDetail}
      relatedHrefFor={highlightDetailHref}
      onOpenRelated={handleOpenRelatedHighlight}
      onOpenPage={openPage}
      onToggleTagFilter={consumeOnly ? undefined : handleToggleTagFilter}
      onNoteSave={consumeOnly ? undefined : handleNoteSave}
      onTagsChange={consumeOnly ? undefined : handleTagsChange}
      onDelete={consumeOnly ? undefined : handleHighlightDelete}
    />
  ) : filtered.length > 0 ? (
    <div className="lib-reading">
      <RelatedTagsSection tags={relatedTagResults} onSelectTag={handleRelatedTag} />
      <RelatedPagesSection
        pages={relatedPageResults}
        hrefFor={relatedPageHref}
        onOpen={handleOpenRelatedPage}
      />
      <div className="lib-toolbar" data-od-id="library-toolbar">
        <span className="lib-toolbar-meta" data-od-id="library-result-count">
          {filtered.length} highlight{filtered.length === 1 ? '' : 's'}
        </span>
        <div className="sort-menu" data-od-id="library-sort" ref={sortRef}>
          <button
            type="button"
            className="sort-trigger"
            aria-haspopup="menu"
            aria-expanded={sortOpen}
            onClick={() => {
              setSortOpen((o) => !o);
              setExportOpen(false);
            }}
          >
            <span>Sort: {SORT_LABELS[sort]}</span>
            <ChevDown />
          </button>
          {sortOpen ? (
            <div className="sort-menu-pop" role="menu" data-od-id="library-sort-menu">
              {(Object.keys(SORT_LABELS) as LibSort[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  className={`sort-menu-item${sort === k ? ' active' : ''}`}
                  role="menuitem"
                  onClick={() => {
                    setSort(k);
                    setSortOpen(false);
                  }}
                >
                  {SORT_LABELS[k]}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <div className="stack">
        {pageRows.map(({ highlight: h, matchedFields }) => {
          const badge = formatMatchBadge(matchedFields);
          return (
            <WebHighlightCard
              key={h.id}
              highlight={h}
              showDomain={showDomainSrc}
              matchBadge={badge}
              readOnly={consumeOnly}
              activeTagFilters={tagFilters}
              onOpenHighlight={openHighlightDetail}
              onOpenPage={openPage}
              onToggleTagFilter={consumeOnly ? undefined : handleToggleTagFilter}
              onNoteSave={consumeOnly ? undefined : handleNoteSave}
              onTagsChange={consumeOnly ? undefined : handleTagsChange}
              onDelete={consumeOnly ? undefined : handleHighlightDelete}
              clientKind={clientKind}
              tagSuggestions={allTagSuggestions}
            />
          );
        })}
      </div>
      {totalPages > 1 ? (
        <LibraryPager page={safePage} totalPages={totalPages} onPageChange={setPage} />
      ) : null}
    </div>
  ) : (
    <div className="state-box" data-od-id="library-empty">
      <RelatedTagsSection tags={relatedTagResults} onSelectTag={handleRelatedTag} />
      {filtering ? (
        <>
          <h3>No matches</h3>
          <p>Clear filters or try another query.</p>
        </>
      ) : (
        <LibraryEmptyInstall isGuest={caps.isGuest} />
      )}
    </div>
  );

  return (
    <div className="lib-shell" data-od-id="library">
      <div className="lib-rail" data-od-id="library-rail">
        <div className="lib-rail-head">
          <h1 data-od-id="library-title">Library</h1>
        </div>
        <div className="lib-rail-body">
          <div className="tree-row">
            <span className="tree-chev-slot" aria-hidden="true" />
            <button
              type="button"
              className={`tree-item${!selection.domain ? ' active' : ''}`}
              data-od-id="lib-all"
              onClick={selectAll}
            >
              <span className="folder-ico" aria-hidden="true">
                ◈
              </span>
              <span className="tree-label">All</span>
            </button>
          </div>

          {visibleDomains.map((d) => {
            const open = filtering ? expanded[d.domain] !== false : !!expanded[d.domain];
            const activeDom = selection.domain === d.domain && !selection.section;
            return (
              <div key={d.domain} className="tree-group" data-tree-group={d.domain}>
                <div className="tree-row">
                  <button
                    type="button"
                    className={`tree-toggle${open ? ' open' : ''}`}
                    aria-label={`${open ? 'Collapse' : 'Expand'} ${d.domain}`}
                    aria-expanded={open}
                    onClick={() => toggleDomain(d.domain)}
                  >
                    <svg
                      className="tree-chevron"
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M4 2.5 8 6 4 9.5"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className={`tree-item${activeDom ? ' active' : ''}`}
                    data-od-id={domainOdId(d.domain)}
                    onClick={() => selectDomain(d.domain)}
                  >
                    <DomainFavicon domain={d.domain} />
                    <span className="tree-label">{d.domain}</span>
                  </button>
                  {!consumeOnly && d.count > 0 ? (
                    <button
                      type="button"
                      className="tree-delete sr-icon is-delete"
                      data-od-id={`lib-domain-delete-${d.domain.replace(/\./g, '-')}`}
                      aria-label={`Delete site ${d.domain}`}
                      title="Delete site"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const totalDomainCount =
                          lib.domains.find((x) => x.domain === d.domain)?.count ?? d.count;
                        setDeleteDomainTarget({ domain: d.domain, count: totalDomainCount });
                      }}
                    >
                      <TrashIco />
                    </button>
                  ) : null}
                </div>
                <div
                  className={`tree-children${open ? ' is-open' : ''}`}
                  data-tree-children
                >
                  <div className="tree-children-inner">
                    {d.sections.map((s) => {
                      const activeSec =
                        selection.domain === d.domain && selection.section === s.path;
                      return (
                        <div key={s.path} className="tree-row is-child">
                          <button
                            type="button"
                            className={`tree-item is-child${activeSec ? ' active' : ''}`}
                            data-od-id={sectionOdId(s.path)}
                            onClick={() => selectSection(d.domain, s.path)}
                          >
                            <span className="tree-label" title={s.path}>
                              {displaySectionPath(s.path)}
                            </span>
                          </button>
                          {!consumeOnly && s.count > 0 ? (
                            <button
                              type="button"
                              className="tree-delete sr-icon is-delete"
                              data-od-id={`lib-sec-delete-${s.path.replace(/[^a-z0-9]+/gi, '-')}`}
                              aria-label={`Delete page ${s.path}`}
                              title="Delete page"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const totalSecCount =
                                  lib.highlights.filter(
                                    (h) => h.domain === d.domain && (h.path || '/') === s.path
                                  ).length || s.count;
                                setDeleteSectionTarget({
                                  domain: d.domain,
                                  path: s.path,
                                  count: totalSecCount,
                                });
                              }}
                            >
                              <TrashIco />
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}

          {visibleDomains.length === 0 ? (
            <div className="state-box" style={{ minHeight: 80, padding: 16 }}>
              <h3>{filtering ? 'No matching domains' : 'No domains'}</h3>
            </div>
          ) : null}
        </div>
      </div>

      <div className="lib-main" data-od-id="library-main">
        {(() => {
          const downloadButtonNode =
            !consumeOnly && caps.flags.export ? (
              <div className="export-menu" data-od-id="library-export" ref={exportRef}>
                <button
                  type="button"
                  className="btn sm ghost"
                  data-od-id="library-export-btn"
                  aria-haspopup="menu"
                  aria-expanded={exportOpen}
                  disabled={filtered.length === 0}
                  onClick={() => {
                    setExportOpen((o) => !o);
                    setSortOpen(false);
                  }}
                >
                  Download
                  <ChevDown />
                </button>
                {exportOpen ? (
                  <div
                    className="export-menu-pop"
                    role="menu"
                    data-od-id="library-export-menu"
                  >
                    <button
                      type="button"
                      className="export-menu-item"
                      role="menuitem"
                      data-od-id="library-export-md"
                      disabled={filtered.length === 0}
                      onClick={() => handleExport('md')}
                    >
                      Markdown
                    </button>
                    <button
                      type="button"
                      className="export-menu-item"
                      role="menuitem"
                      data-od-id="library-export-xlsx"
                      disabled={filtered.length === 0}
                      onClick={() => handleExport('xlsx')}
                    >
                      Spreadsheet
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null;

          return (
            <div className="lib-main-head">
              <h2
                data-od-id="library-scope-title"
                className="lib-scope-title"
                title={selection.section ?? selection.domain ?? undefined}
              >
                {title}
              </h2>
              <div className="lib-main-head-actions">
                    {openPageHref ? (
                      <a
                        className="btn sm ghost"
                        href={openPageHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-od-id="library-open-page"
                      >
                        Open
                      </a>
                    ) : null}
                    {!consumeOnly && selection.domain && !selection.highlight ? (
                      <button
                        type="button"
                        className="sr-icon is-delete"
                        data-od-id="library-scope-delete"
                        aria-label={
                          selection.section
                            ? `Delete page ${selection.section}`
                            : `Delete site ${selection.domain}`
                        }
                        title={selection.section ? 'Delete page' : 'Delete site'}
                        disabled={scoped.length === 0}
                        onClick={() => {
                          if (!selection.domain) return;
                          if (selection.section) {
                            setDeleteSectionTarget({
                              domain: selection.domain,
                              path: selection.section,
                              count: scoped.length,
                            });
                          } else {
                            setDeleteDomainTarget({
                              domain: selection.domain,
                              count: scoped.length,
                            });
                          }
                        }}
                      >
                        <TrashIco />
                      </button>
                    ) : null}
                    {!consumeOnly && vault.connectionState === 'connected' ? (
                      <button
                        type="button"
                        className="btn sm ghost"
                        data-od-id="library-vault-sync"
                        data-testid="library-vault-sync"
                        disabled={vault.isSyncing}
                        title={
                          vault.isSyncing
                            ? 'Syncing to vault…'
                            : vault.lastSyncedAt
                              ? `Vault last synced: ${vault.lastSyncedAt}`
                              : 'Sync to local vault'
                        }
                        onClick={() => void vault.syncNow()}
                      >
                        {vault.isSyncing ? '…' : 'Sync Vault'}
                      </button>
                    ) : null}
                    {downloadButtonNode}
                  </div>
            </div>
          );
        })()}
        <div className="lib-search-wrap" data-od-id="library-search">
          <HighlightSearchBar
            query={query}
            onQueryChange={setQuery}
            fields={fields}
            onFieldsChange={setFields}
            refine={refine}
            onRefineChange={setRefine}
            tagFilters={tagFilters}
            onTagFiltersChange={setTagFilters}
            availableTags={tags}
            availableGroups={availableGroups}
            groupFilters={groupFilters}
            onGroupFiltersChange={setGroupFilters}
            resultCount={filtering ? filtered.length : undefined}
            placeholder="Search highlights…"
            disabled={totalCount === 0 && !filtering}
          />
        </div>
        <div className="lib-main-body">
          {detailBody}
        </div>
      </div>

      {(() => {
        const copy = deleteDomainTarget
          ? deleteDomainCopy(deleteDomainTarget.domain, deleteDomainTarget.count)
          : null;
        return (
          <DeleteConfirmDialog
            open={deleteDomainTarget !== null}
            onClose={() => {
              if (!isDeletingScope) setDeleteDomainTarget(null);
            }}
            severity={copy?.severity}
            title={copy?.title ?? 'Delete this site?'}
            message={copy?.message ?? ''}
            note={copy?.note}
            strongNames={copy?.strongNames}
            confirmLabel={copy?.confirmLabel}
            cancelLabel={copy?.cancelLabel}
            onConfirm={() => {
              void confirmDeleteDomain();
            }}
            isConfirming={isDeletingScope}
          />
        );
      })()}

      {(() => {
        const copy = deleteSectionTarget
          ? deleteSectionCopy(
              deleteSectionTarget.domain,
              deleteSectionTarget.path,
              deleteSectionTarget.count
            )
          : null;
        return (
          <DeleteConfirmDialog
            open={deleteSectionTarget !== null}
            onClose={() => {
              if (!isDeletingScope) setDeleteSectionTarget(null);
            }}
            severity={copy?.severity}
            title={copy?.title ?? 'Delete this page?'}
            message={copy?.message ?? ''}
            note={copy?.note}
            strongNames={copy?.strongNames}
            confirmLabel={copy?.confirmLabel}
            cancelLabel={copy?.cancelLabel}
            onConfirm={() => {
              void confirmDeleteSection();
            }}
            isConfirming={isDeletingScope}
          />
        );
      })()}
    </div>
  );
}
