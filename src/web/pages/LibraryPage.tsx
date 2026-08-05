/**
 * @file LibraryPage.tsx
 * @description Product Library — OD viewLibrary parity: domain/section rail,
 * client-side search/filters, URL-synced selection. No extension runtime messaging.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '@/core/context/AppProvider';
import { useBillingContextOptional } from '@/features/billing/BillingProvider';
import { HighlightSearchBar } from '@/features/collections/components/HighlightSearchBar';
import { downloadTextFile } from '@/shared/highlight-export';
import {
  DEFAULT_SEARCH_FIELDS,
  filterHighlightsByRefineAndTags,
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
import {
  useWebLibrary,
  type WebHighlight,
} from '@/web/hooks/useWebLibrary';
import {
  buildLibrarySearch,
  parseLibrarySelection,
} from '@/web/routing/librarySelection';

function shortPath(p: string): string {
  const parts = String(p).split('/').filter(Boolean);
  return parts.length ? parts[parts.length - 1]! : p;
}

function relativeTime(ts: number, now = Date.now()): string {
  const d = now - ts;
  if (d < 3600e3) return `${Math.max(1, Math.round(d / 60e3))}m ago`;
  if (d < 86400e3) return `${Math.round(d / 3600e3)}h ago`;
  return `${Math.round(d / 86400e3)}d ago`;
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

function exportJson(rows: WebHighlight[]): void {
  const payload = rows.map((h) => ({
    id: h.id,
    domain: h.domain,
    path: h.path,
    quote: h.quote,
    note: h.note,
    tags: h.tags,
    savedAt: new Date(h.savedAt).toISOString(),
  }));
  const stamp = new Date().toISOString().slice(0, 10);
  downloadTextFile(
    `underscore-library-${stamp}.json`,
    JSON.stringify(payload, null, 2),
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

  const selection = useMemo(
    () => parseLibrarySelection(location.search),
    [location.search],
  );

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState('');
  const [fields, setFields] = useState<SearchField[]>([...DEFAULT_SEARCH_FIELDS]);
  const [refine, setRefine] = useState<RefineFilter[]>([]);
  const [tagFilters, setTagFilters] = useState<string[]>([]);

  // Auto-expand domain when URL points at it
  React.useEffect(() => {
    if (selection.domain) {
      setExpanded((prev) =>
        prev[selection.domain!] ? prev : { ...prev, [selection.domain!]: true },
      );
    }
  }, [selection.domain]);

  const setSelection = useCallback(
    (domain: string | null, section: string | null) => {
      const search = buildLibrarySearch({ domain, section });
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
    setSelection(null, null);
  }, [setSelection]);

  const selectDomain = useCallback(
    (domain: string) => {
      setSelection(domain, null);
    },
    [setSelection],
  );

  const selectSection = useCallback(
    (domain: string, path: string) => {
      setSelection(domain, path);
    },
    [setSelection],
  );

  const toggleDomain = useCallback((domain: string) => {
    setExpanded((prev) => ({ ...prev, [domain]: !prev[domain] }));
  }, []);

  const scoped = useMemo(
    () => filterBySelection(lib.highlights, selection.domain, selection.section),
    [lib.highlights, selection.domain, selection.section],
  );

  const sortedScoped = useMemo(
    () =>
      [...scoped].sort(
        (a, b) => b.savedAt - a.savedAt || a.id.localeCompare(b.id),
      ),
    [scoped],
  );

  const filtering =
    query.trim().length > 0 || refine.length > 0 || tagFilters.length > 0;

  const filtered = useMemo(() => {
    const refined = filterHighlightsByRefineAndTags(
      sortedScoped.map(toSearchable),
      { refine, tagFilters },
    );
    const q = query.trim();
    if (!q) {
      return refined.map((h) => ({
        highlight: h as WebHighlight,
        matchedFields: [] as SearchField[],
      }));
    }
    return searchHighlights(refined, q, fields).map((m) => ({
      highlight: m.highlight as WebHighlight,
      matchedFields: m.matchedFields,
    }));
  }, [sortedScoped, refine, tagFilters, query, fields]);

  const tags = useMemo(() => corpusTags(scoped), [scoped]);

  const title = selection.section
    ? shortPath(selection.section)
    : selection.domain
      ? selection.domain
      : 'All highlights';

  const totalCount = lib.highlights.length;
  const domainCount = lib.domains.length;
  const showDomainSrc = !selection.domain;

  const handleExport = useCallback(() => {
    if (!caps.flags.export) return;
    exportJson(filtered.map((m) => m.highlight));
  }, [caps.flags.export, filtered]);

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

  const listBody =
    filtered.length > 0 ? (
      <div className="stack">
        {filtered.map(({ highlight: h, matchedFields }) => {
          const badge = formatMatchBadge(matchedFields);
          return (
            <button
              key={h.id}
              type="button"
              className="hl"
              data-od-id={`hl-${h.id}`}
              onClick={() => selectSection(h.domain, h.path)}
            >
              <p className="hl-quote">“{h.quote}”</p>
              <div className="hl-meta">
                {showDomainSrc ? <span className="src">{h.domain}</span> : null}
                <span>{h.path}</span>
                <span>{relativeTime(h.savedAt)}</span>
                {h.note.trim() ? <span>{h.note.trim()}</span> : null}
                {badge ? <span className="match-badge">{badge}</span> : null}
              </div>
            </button>
          );
        })}
      </div>
    ) : (
      <div className="state-box" data-od-id="library-empty">
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
          <div className="lib-rail-meta">
            {totalCount} · {domainCount} domains
          </div>
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
              <span className="tree-count">{totalCount}</span>
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
                    <span className="tree-count">{d.count}</span>
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
                          <span className="tree-count">{s.count}</span>
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
          <span className="count" data-od-id="library-result-count">
            {filtered.length}
          </span>
          {caps.flags.export ? (
            <button
              type="button"
              className="btn sm ghost"
              data-od-id="library-export"
              onClick={handleExport}
            >
              Export
            </button>
          ) : null}
          {selection.domain && caps.flags.ai ? (
            <Link
              to={`/ask?${buildLibrarySearch({
                domain: selection.domain,
                section: selection.section,
              })}`}
              className="btn sm accent"
              data-od-id="library-ask"
            >
              Ask
            </Link>
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
