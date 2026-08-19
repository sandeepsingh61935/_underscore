/**
 * @file LibraryPage.tsx
 * @description Product Library — OD viewLibrary parity: domain/section rail,
 * client-side search/filters, URL-synced selection. No extension runtime messaging.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { useBillingContextOptional } from '@/features/billing/BillingProvider';
import { HighlightSearchBar } from '@/features/collections/components/HighlightSearchBar';
import { useUpdateHighlightMetadata } from '@/features/collections/hooks/useUpdateHighlightMetadata';
import type { ExportFormat } from '@/shared/highlight-export';
import {
  DEFAULT_SEARCH_FIELDS,
  filterHighlightsByRefineAndTags,
  toggleTagFilter,
  type RefineFilter,
} from '@/shared/utils/highlight-filter';
import {
  formatMatchBadge,
  searchHighlights,
  type SearchField,
} from '@/shared/utils/highlight-search';
import { resolveWebCaps } from '@/web/caps/resolveWebCaps';
import { resolveWebPaidActive } from '@/web/caps/resolveWebPaidActive';
import { GuestBanner } from '@/web/components/GuestBanner';
import { LibraryHighlightDetail } from '@/web/components/LibraryHighlightDetail';
import { RelatedTagsSection } from '@/web/components/RelatedTagsSection';
import { WebHighlightCard } from '@/web/components/WebHighlightCard';
import {
  useRelatedHighlights,
  useRelatednessService,
  useRelatedTags,
} from '@/web/hooks/useRelatedness';
import {
  useWebLibrary,
  type WebHighlight,
} from '@/web/hooks/useWebLibrary';
import { trackEvent } from '@/web/lib/analytics';
import {
  exportScopeFromSelection,
  exportWebHighlights,
} from '@/web/lib/webHighlightExport';
import {
  buildLibrarySearch,
  parseLibrarySelection,
} from '@/web/routing/librarySelection';

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
    <svg className="chev" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
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

function shortPath(p: string): string {
  const parts = String(p).split('/').filter(Boolean);
  return parts.length ? parts[parts.length - 1]! : p;
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
  section: string | null,
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
  return [...counts.values()].sort(
    (a, b) => b.n - a.n || a.label.localeCompare(b.label),
  );
}

/**
 * Library master-detail. Guest is always empty (useWebLibrary).
 * Selection lives in the URL (`?domain=&section=`).
 */
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
    [isAuthenticated, isPaidActive, billing?.snapshot.entitlement.status],
  );

  const lib = useWebLibrary({
    isAuthenticated,
    planLabel: caps.planLabel,
  });
  const { updateMetadata } = useUpdateHighlightMetadata();
  const patchHighlight = lib.patchHighlight;

  const selection = useMemo(
    () => parseLibrarySelection(location.search),
    [location.search],
  );

  /** Optional `?tag=` from Home chip navigation (seed into filters once). */
  const initialTagFromUrl = useMemo(() => {
    const raw = new URLSearchParams(location.search).get('tag');
    return raw?.trim() || null;
  }, [location.search]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState('');
  const [fields, setFields] = useState<SearchField[]>([...DEFAULT_SEARCH_FIELDS]);
  const [refine, setRefine] = useState<RefineFilter[]>([]);
  const [tagFilters, setTagFilters] = useState<string[]>(() =>
    initialTagFromUrl ? [initialTagFromUrl] : [],
  );
  const [sort, setSort] = useState<LibSort>('newest');
  const [sortOpen, setSortOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [page, setPage] = useState(1);
  const sortRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const seededTagRef = useRef<string | null>(initialTagFromUrl);

  // Apply tag filter when arriving from Home with ?tag=
  useEffect(() => {
    if (!initialTagFromUrl) return;
    if (seededTagRef.current === initialTagFromUrl) return;
    seededTagRef.current = initialTagFromUrl;
    setTagFilters((prev) => {
      const lower = initialTagFromUrl.toLowerCase();
      if (prev.some((t) => t.toLowerCase() === lower)) return prev;
      return [...prev, initialTagFromUrl];
    });
  }, [initialTagFromUrl]);

  // Auto-expand domain when URL points at it
  useEffect(() => {
    if (selection.domain) {
      setExpanded((prev) =>
        prev[selection.domain!] ? prev : { ...prev, [selection.domain!]: true },
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
    (
      domain: string | null,
      section: string | null,
      highlight: string | null = null,
    ) => {
      const search = buildLibrarySearch({ domain, section, highlight });
      void navigate(
        { pathname: '/library', search: search ? `?${search}` : '' },
        { replace: false },
      );
      if (domain) {
        setExpanded((prev) => ({ ...prev, [domain]: true }));
      }
    },
    [navigate],
  );

  const selectAll = useCallback(() => {
    setSelection(null, null, null);
  }, [setSelection]);

  const selectDomain = useCallback(
    (domain: string) => {
      setSelection(domain, null, null);
    },
    [setSelection],
  );

  const selectSection = useCallback(
    (domain: string, path: string) => {
      setSelection(domain, path, null);
    },
    [setSelection],
  );

  const openHighlightDetail = useCallback(
    (id: string) => {
      // Keep domain/section filters; detail is an overlay on current browse context.
      setSelection(selection.domain, selection.section, id);
    },
    [selection.domain, selection.section, setSelection],
  );

  const closeHighlightDetail = useCallback(() => {
    setSelection(selection.domain, selection.section, null);
  }, [selection.domain, selection.section, setSelection]);

  const handleNoteSave = useCallback(
    async (id: string, note: string): Promise<boolean> => {
      const ok = await updateMetadata(id, { notes: note }, { silent: true });
      if (ok) patchHighlight(id, { note });
      return ok;
    },
    [updateMetadata, patchHighlight],
  );

  const handleTagsChange = useCallback(
    async (id: string, tags: string[]): Promise<boolean> => {
      const ok = await updateMetadata(id, { tags }, { silent: true });
      if (ok) patchHighlight(id, { tags });
      return ok;
    },
    [updateMetadata, patchHighlight],
  );

  const handleToggleTagFilter = useCallback((tag: string) => {
    setTagFilters((prev) => toggleTagFilter(prev, tag));
  }, []);

  /** Related tag click = replace single-tag filter (normal tag navigation). */
  const handleRelatedTag = useCallback((tag: string, rank: number) => {
    trackEvent('related_tag_clicked', { rank, reason: 'co-occur' });
    setTagFilters([tag]);
  }, []);

  const openPage = useCallback(
    (domain: string, path: string) => {
      selectSection(domain, path);
    },
    [selectSection],
  );

  const toggleDomain = useCallback((domain: string) => {
    setExpanded((prev) => ({ ...prev, [domain]: !prev[domain] }));
  }, []);

  const scoped = useMemo(
    () => filterBySelection(lib.highlights, selection.domain, selection.section),
    [lib.highlights, selection.domain, selection.section],
  );

  const filtering =
    query.trim().length > 0 || refine.length > 0 || tagFilters.length > 0;

  const filtered = useMemo(() => {
    const base = [...scoped].sort(SORT_FNS.newest);
    const refined = filterHighlightsByRefineAndTags(base.map(toSearchable), {
      refine,
      tagFilters,
    });
    const q = query.trim();
    let rows: { highlight: WebHighlight; matchedFields: SearchField[] }[];
    if (!q) {
      rows = refined.map((h) => ({
        highlight: h as WebHighlight,
        matchedFields: [] as SearchField[],
      }));
    } else {
      rows = searchHighlights(refined, q, fields).map((m) => ({
        highlight: m.highlight as WebHighlight,
        matchedFields: m.matchedFields,
      }));
    }
    const cmp = SORT_FNS[sort] ?? SORT_FNS.newest;
    return [...rows].sort((a, b) => cmp(a.highlight, b.highlight));
  }, [scoped, refine, tagFilters, query, fields, sort]);

  // Reset page when filters / selection / sort change
  useEffect(() => {
    setPage(1);
  }, [selection.domain, selection.section, query, refine, tagFilters, sort]);

  const tags = useMemo(() => corpusTags(scoped), [scoped]);

  const relatedness = useRelatednessService(lib.highlights);
  const relatedTagResults = useRelatedTags(relatedness, tagFilters);
  const relatedHighlightResults = useRelatedHighlights(
    relatedness,
    selection.highlight,
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

  const handleOpenRelatedHighlight = useCallback(
    (id: string, rank: number, reason: string) => {
      trackEvent('related_highlight_clicked', { rank, reason });
      openHighlightDetail(id);
    },
    [openHighlightDetail],
  );

  const title = selection.section
    ? shortPath(selection.section)
    : selection.domain
      ? selection.domain
      : 'All highlights';

  const totalCount = lib.highlights.length;
  const showDomainSrc = !selection.domain;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const handleExport = useCallback(
    (format: ExportFormat) => {
      if (!caps.flags.export || filtered.length === 0) return;
      exportWebHighlights(
        filtered.map((m) => m.highlight),
        format,
        exportScopeFromSelection({
          domain: selection.domain,
          section: selection.section,
        }),
      );
      setExportOpen(false);
    },
    [caps.flags.export, filtered, selection.domain, selection.section],
  );

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
        <div className="state-box" data-od-id="error-state" style={{ gridColumn: '1 / -1' }}>
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

  const listBody = detailHighlight ? (
    <LibraryHighlightDetail
      highlight={detailHighlight}
      related={relatedHighlightRows}
      readOnly={caps.isGuest}
      activeTagFilters={tagFilters}
      onBack={closeHighlightDetail}
      onOpenRelated={handleOpenRelatedHighlight}
      onOpenPage={openPage}
      onToggleTagFilter={caps.isGuest ? undefined : handleToggleTagFilter}
      onNoteSave={caps.isGuest ? undefined : handleNoteSave}
      onTagsChange={caps.isGuest ? undefined : handleTagsChange}
    />
  ) : filtered.length > 0 ? (
      <>
        <RelatedTagsSection tags={relatedTagResults} onSelectTag={handleRelatedTag} />
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
                readOnly={caps.isGuest}
                activeTagFilters={tagFilters}
                onOpenHighlight={openHighlightDetail}
                onOpenPage={openPage}
                onToggleTagFilter={caps.isGuest ? undefined : handleToggleTagFilter}
                onNoteSave={caps.isGuest ? undefined : handleNoteSave}
                onTagsChange={caps.isGuest ? undefined : handleTagsChange}
              />
            );
          })}
        </div>
        {totalPages > 1 ? (
          <nav className="pager" data-od-id="library-pager" aria-label="Pagination">
            <button
              type="button"
              className="pager-btn"
              aria-label="Previous page"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ←
            </button>
            <span className="pager-label">
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              className="pager-btn"
              aria-label="Next page"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              →
            </button>
          </nav>
        ) : null}
      </>
    ) : (
      <div className="state-box" data-od-id="library-empty">
        <RelatedTagsSection tags={relatedTagResults} onSelectTag={handleRelatedTag} />
        <h3>{filtering ? 'No matches' : 'No highlights'}</h3>
        <p>
          {filtering
            ? 'Clear filters or try another query.'
            : caps.isGuest
              ? 'Sign in and capture text with the extension to fill this view.'
              : 'Capture text with the extension to fill this view.'}
        </p>
        {caps.isGuest ? (
          <div className="actions">
            <Link to="/sign-in" className="btn primary sm" data-od-id="library-guest-signin">
              Sign in
            </Link>
          </div>
        ) : null}
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

          {lib.domains.map((d) => {
            const open = !!expanded[d.domain];
            const activeDom =
              selection.domain === d.domain && !selection.section;
            return (
              <div
                key={d.domain}
                className="tree-group"
                data-tree-group={d.domain}
              >
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
                    <span className="folder-ico" aria-hidden="true">
                      {d.domain.slice(0, 1)}
                    </span>
                    <span className="tree-label">{d.domain}</span>
                  </button>
                </div>
                <div
                  className={`tree-children${open ? ' is-open' : ''}`}
                  data-tree-children
                >
                  <div className="tree-children-inner">
                    {d.sections.map((s) => {
                      const activeSec =
                        selection.domain === d.domain &&
                        selection.section === s.path;
                      return (
                        <button
                          key={s.path}
                          type="button"
                          className={`tree-item is-child${activeSec ? ' active' : ''}`}
                          data-od-id={sectionOdId(s.path)}
                          onClick={() => selectSection(d.domain, s.path)}
                        >
                          <span className="tree-label">{s.path}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}

          {lib.domains.length === 0 ? (
            <div className="state-box" style={{ minHeight: 80, padding: 16 }}>
              <h3>No domains</h3>
            </div>
          ) : null}
        </div>
      </div>

      <div className="lib-main" data-od-id="library-main">
        {caps.isGuest ? (
          <div style={{ padding: '12px 22px 0' }}>
            <GuestBanner />
          </div>
        ) : null}
        <div className="lib-main-head">
          <h2 data-od-id="library-scope-title">{title}</h2>
          {caps.flags.export ? (
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
          ) : null}

        </div>
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
            resultCount={filtering ? filtered.length : undefined}
            placeholder="Search highlights…"
            disabled={totalCount === 0 && !filtering}
          />
        </div>
        <div className="lib-main-body">{listBody}</div>
      </div>
    </div>
  );
}
