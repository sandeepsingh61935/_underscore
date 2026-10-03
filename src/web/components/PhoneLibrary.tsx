import React, { useEffect, useMemo, useState } from 'react';

import { DeleteConfirmDialog } from '@/features/collections/components/DeleteConfirmDialog';
import type { RelatedPageResult } from '@/shared/relatedness';
import { deleteDomainCopy, deleteSectionCopy } from '@/shared/utils/confirm-dialog-copy';
import { formatHighlightWhen } from '@/shared/utils/format-highlight-when';
import { displaySectionPath } from '@/shared/utils/page-href';
import { HighlightSearchBar } from '@/features/collections/components/HighlightSearchBar';
import { LibrarySortControl } from '@/features/collections/components/LibrarySortControl';
import type {
  AvailableGroup,
  AvailableTag,
} from '@/features/collections/components/HighlightSearchBar';
import type { RefineFilter } from '@/shared/utils/highlight-filter';
import type { SearchField } from '@/shared/utils/highlight-search';
import { DomainFavicon } from '@/web/components/DomainFavicon';
import type { WebHighlight } from '@/web/hooks/useWebLibrary';
import type { WebClientKind } from '@/web/lib/classify-web-client';

import { PhoneDomainRow } from './PhoneDomainRow';
import { PhoneHighlightCard } from './PhoneHighlightCard';
import { PhoneQuoteScreen } from './PhoneQuoteScreen';
import { PhoneRelatedPages } from './PhoneRelatedPages';
import { LibraryPager } from '@/web/components/LibraryPager';
import { clampPage } from '@/web/lib/buildPagerItems';

export type PhoneExportFormat = 'md' | 'xlsx';

export type PhoneLibSort = 'newest' | 'oldest' | 'domain' | 'quote';

export const PHONE_PAGE_SIZE = 12;

export type PhoneLibraryProps = {
  highlights: WebHighlight[];
  query: string;
  onQueryChange: (q: string) => void;
  sort?: PhoneLibSort;
  onSortChange?: (sort: PhoneLibSort) => void;
  /** When set, the search bar includes the library filter panel and `highlights` are already filtered. */
  filters?: {
    fields: SearchField[];
    onFieldsChange: (fields: SearchField[]) => void;
    refine: RefineFilter[];
    onRefineChange: (refine: RefineFilter[]) => void;
    tagFilters: string[];
    onTagFiltersChange: (tags: string[]) => void;
    availableTags: AvailableTag[];
    availableGroups?: AvailableGroup[];
    groupFilters?: string[];
    onGroupFiltersChange?: (groupIds: string[]) => void;
  };
  /** Library has rows before filters. Distinguishes an empty library from no matches. */
  hasLibrary?: boolean;
  domain: string | null;
  section?: string | null;
  highlightId: string | null;
  onOpenDomain: (domain: string) => void;
  onOpenHighlight: (id: string) => void;
  onSelectSection?: (path: string | null) => void;
  clientKind: WebClientKind;
  canExport?: boolean;
  onExport?: (format: PhoneExportFormat) => void;
  onDeleteDomain?: () => Promise<boolean>;
  /** Delete every highlight on the given pages. */
  onDeletePages?: (paths: string[]) => Promise<boolean>;
  onNoteSave?: (id: string, note: string) => Promise<boolean>;
  onTagsChange?: (id: string, tags: string[]) => Promise<boolean>;
  onDeleteHighlight?: (id: string) => Promise<boolean>;
  onDeleteHighlights?: (ids: string[]) => Promise<boolean>;
  relatedPages?: RelatedPageResult[];
  relatedLabel?: string;
  onOpenRelatedPage?: (
    domain: string,
    section: string,
    rank: number,
    reason: string
  ) => void;
  tagSuggestions?: string[];
};

type DomainGroup = {
  domain: string;
  count: number;
  highlights: WebHighlight[];
};

type DomainPageGroup = {
  path: string;
  count: number;
  lastActive: number;
};

function pagesInDomain(highlights: WebHighlight[], keepOrder = false): DomainPageGroup[] {
  const map = new Map<string, DomainPageGroup>();
  for (const h of highlights) {
    const path = h.path || '/';
    const prev = map.get(path);
    if (!prev) {
      map.set(path, { path, count: 1, lastActive: h.savedAt });
    } else {
      prev.count += 1;
      prev.lastActive = Math.max(prev.lastActive, h.savedAt);
    }
  }
  const pages = [...map.values()];
  if (keepOrder) return pages;
  return pages.sort(
    (a, b) =>
      b.lastActive - a.lastActive || b.count - a.count || a.path.localeCompare(b.path)
  );
}

function groupByDomain(highlights: WebHighlight[], keepOrder = false): DomainGroup[] {
  const map = new Map<string, WebHighlight[]>();
  for (const h of highlights) {
    const list = map.get(h.domain);
    if (list) {
      list.push(h);
    } else {
      map.set(h.domain, [h]);
    }
  }
  const groups = [...map.entries()].map(([domain, hls]) => ({
    domain,
    count: hls.length,
    highlights: hls,
  }));
  if (keepOrder) return groups;
  return groups.sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain));
}

function filterByQuery(groups: DomainGroup[], query: string): DomainGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return groups;
  return groups.filter((g) => {
    // Match domain name
    if (g.domain.toLowerCase().includes(q)) return true;
    // Match any quote text in the domain
    return g.highlights.some((h) => h.quote.toLowerCase().includes(q));
  });
}

export function PhoneLibrary({
  highlights,
  query,
  onQueryChange,
  sort,
  onSortChange,
  filters,
  hasLibrary = false,
  domain,
  section = null,
  highlightId,
  onOpenDomain,
  onOpenHighlight,
  onSelectSection,
  clientKind,
  canExport = false,
  onExport,
  onDeleteDomain,
  onDeletePages,
  onNoteSave,
  onTagsChange,
  onDeleteHighlight,
  onDeleteHighlights,
  relatedPages = [],
  relatedLabel = 'Related pages',
  onOpenRelatedPage,
  tagSuggestions,
}: PhoneLibraryProps): React.ReactElement {
  const [deleteDomainOpen, setDeleteDomainOpen] = useState(false);
  const [deletingDomain, setDeletingDomain] = useState(false);
  const [selectingPages, setSelectingPages] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [deletePagesOpen, setDeletePagesOpen] = useState(false);
  const [deletingPages, setDeletingPages] = useState(false);
  const [selectingHighlights, setSelectingHighlights] = useState(false);
  const [selectedHighlightIds, setSelectedHighlightIds] = useState<string[]>([]);
  const [deleteHighlightsOpen, setDeleteHighlightsOpen] = useState(false);
  const [deletingHighlights, setDeletingHighlights] = useState(false);
  const [quotePage, setQuotePage] = useState(1);
  const [pageListPage, setPageListPage] = useState(1);

  useEffect(() => {
    setSelectingPages(false);
    setSelectedPaths([]);
    setDeletePagesOpen(false);
    setSelectingHighlights(false);
    setSelectedHighlightIds([]);
    setDeleteHighlightsOpen(false);
    setQuotePage(1);
    setPageListPage(1);
  }, [domain, section, sort]);
  const domainGroups = useMemo(
    () => groupByDomain(highlights, Boolean(sort)),
    [highlights, sort]
  );
  const filtering =
    query.trim().length > 0 ||
    (filters?.refine.length ?? 0) > 0 ||
    (filters?.tagFilters.length ?? 0) > 0 ||
    (filters?.groupFilters?.length ?? 0) > 0;
  const searchControl = filters ? (
    <HighlightSearchBar
      query={query}
      onQueryChange={onQueryChange}
      fields={filters.fields}
      onFieldsChange={filters.onFieldsChange}
      refine={filters.refine}
      onRefineChange={filters.onRefineChange}
      tagFilters={filters.tagFilters}
      onTagFiltersChange={filters.onTagFiltersChange}
      availableTags={filters.availableTags}
      availableGroups={filters.availableGroups}
      groupFilters={filters.groupFilters}
      onGroupFiltersChange={filters.onGroupFiltersChange}
      resultCount={filtering ? highlights.length : undefined}
      placeholder="Search highlights…"
    />
  ) : null;
  const sortControl =
    onSortChange && sort ? (
      <LibrarySortControl
        value={sort}
        onChange={onSortChange}
        variant="text"
        align="right"
      />
    ) : null;

  // Quote screen mode
  if (domain && highlightId) {
    const highlight = highlights.find((h) => h.id === highlightId);
    if (highlight) {
      return (
        <PhoneQuoteScreen
          highlight={highlight}
          clientKind={clientKind}
          relatedPages={relatedPages}
          relatedLabel={relatedLabel}
          onOpenRelatedPage={onOpenRelatedPage}
        />
      );
    }
  }

  // Domain → pages, then a page → its highlights.
  if (domain) {
    const matched = highlights.filter((h) => h.domain === domain);
    const domainHighlights = sort
      ? matched
      : [...matched].sort((a, b) => b.savedAt - a.savedAt);
    const pages = pagesInDomain(domainHighlights, Boolean(sort));
    const domainCopy = deleteDomainCopy(domain, domainHighlights.length);
    const exportRow =
      canExport && onExport ? (
        <>
          <button
            type="button"
            className="phone-export-btn"
            aria-label="Export Markdown"
            onClick={() => onExport('md')}
          >
            <span>MD</span>
          </button>
          <button
            type="button"
            className="phone-export-btn"
            aria-label="Export spreadsheet"
            onClick={() => onExport('xlsx')}
          >
            <span>XLSX</span>
          </button>
        </>
      ) : null;

    if (!section) {
      const totalPageListPages = Math.max(1, Math.ceil(pages.length / PHONE_PAGE_SIZE));
      const safePageListPage = clampPage(pageListPage, totalPageListPages);
      const pageListStart = (safePageListPage - 1) * PHONE_PAGE_SIZE;
      const pagedPages = pages.slice(pageListStart, pageListStart + PHONE_PAGE_SIZE);

      return (
        <section className="phone-library" data-od-id="phone-library-pages">
          {searchControl}
          <div className="phone-domain-head">
            <div className="phone-domain-titles">
              <h2 className="phone-library-title">{domain}</h2>
            </div>
            {onDeletePages || onDeleteDomain ? (
              <button
                type="button"
                className="phone-export-btn is-danger"
                aria-pressed={onDeletePages ? selectingPages : undefined}
                aria-label={
                  !onDeletePages
                    ? `Delete domain ${domain}`
                    : selectingPages && selectedPaths.length > 0
                      ? `Delete ${selectedPaths.length} pages`
                      : selectingPages
                        ? 'Cancel delete'
                        : 'Delete pages'
                }
                disabled={deletingPages}
                onClick={() => {
                  if (!onDeletePages) {
                    setDeleteDomainOpen(true);
                    return;
                  }
                  if (!selectingPages) {
                    setSelectingPages(true);
                    return;
                  }
                  if (selectedPaths.length === 0) {
                    setSelectingPages(false);
                    return;
                  }
                  setDeletePagesOpen(true);
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 7h16" />
                  <path d="M9 7V5h6v2" />
                  <path d="M7 7l1 12h8l1-12" />
                </svg>
              </button>
            ) : null}
          </div>
          <div className="phone-sort-line">
            <div className="phone-toolbar-meta">
              <p className="phone-quote-meta">
                {selectingPages
                  ? `${selectedPaths.length} selected`
                  : `${pages.length} page${pages.length === 1 ? '' : 's'} · ${domainHighlights.length} highlight${domainHighlights.length === 1 ? '' : 's'}`}
              </p>
            </div>
            <div className="phone-toolbar-actions" data-od-id="phone-domain-export">
              {exportRow}
              {sortControl}
            </div>
          </div>
          {pages.length === 0 ? (
            <p className="phone-empty">No highlights for this domain.</p>
          ) : (
            <>
              <div className="phone-page-list" data-od-id="phone-domain-pages">
                {pagedPages.map((page) => {
                  const label = displaySectionPath(page.path);
                  const when = formatHighlightWhen(page.lastActive);
                  const countLabel =
                    page.count === 1 ? '1 highlight' : `${page.count} highlights`;
                  const picked = selectedPaths.includes(page.path);
                  return (
                    <button
                      key={page.path}
                      type="button"
                      className={picked ? 'page-row is-selected' : 'page-row'}
                      data-od-id={`phone-page-${page.path.replace(/[^a-z0-9]+/gi, '-')}`}
                      aria-pressed={selectingPages ? picked : undefined}
                      onClick={() => {
                        if (!selectingPages) {
                          onSelectSection?.(page.path);
                          return;
                        }
                        setSelectedPaths((prev) =>
                          prev.includes(page.path)
                            ? prev.filter((path) => path !== page.path)
                            : [...prev, page.path]
                        );
                      }}
                    >
                      {selectingPages ? (
                        <span className="phone-page-check" aria-hidden="true">
                          {picked ? '✓' : ''}
                        </span>
                      ) : (
                        <DomainFavicon
                          domain={domain}
                          className="page-row-ico"
                          size={16}
                        />
                      )}
                      <div className="page-row-body">
                        <div className="page-row-title">{label}</div>
                        <div className="page-row-meta">
                          {countLabel}
                          {when ? ` · ${when}` : ''}
                        </div>
                      </div>
                      <span className="page-row-count">{page.count}</span>
                      {selectingPages ? null : (
                        <span className="page-row-trail" aria-hidden="true">
                          →
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {totalPageListPages > 1 ? (
                <LibraryPager
                  page={safePageListPage}
                  totalPages={totalPageListPages}
                  onPageChange={setPageListPage}
                />
              ) : null}
            </>
          )}
          {onDeletePages ? (
            <DeleteConfirmDialog
              open={deletePagesOpen}
              onClose={() => {
                if (!deletingPages) setDeletePagesOpen(false);
              }}
              severity="danger"
              title={
                selectedPaths.length === 1
                  ? deleteSectionCopy(
                      domain,
                      selectedPaths[0] ?? '/',
                      pages.find((page) => page.path === selectedPaths[0])?.count ?? 0
                    ).title
                  : `Delete ${selectedPaths.length} pages?`
              }
              message={
                selectedPaths.length === 1
                  ? deleteSectionCopy(
                      domain,
                      selectedPaths[0] ?? '/',
                      pages.find((page) => page.path === selectedPaths[0])?.count ?? 0
                    ).message
                  : `This permanently removes ${pages
                      .filter((page) => selectedPaths.includes(page.path))
                      .reduce(
                        (sum, page) => sum + page.count,
                        0
                      )} highlights from ${selectedPaths.length} pages on ${domain}.`
              }
              note="This action cannot be undone."
              strongNames={
                selectedPaths.length === 1
                  ? [selectedPaths[0] ?? domain, domain]
                  : [domain]
              }
              confirmLabel="Delete permanently"
              cancelLabel="Cancel"
              isConfirming={deletingPages}
              onConfirm={() => {
                const paths = selectedPaths;
                setDeletingPages(true);
                void onDeletePages(paths).then((ok) => {
                  setDeletingPages(false);
                  setDeletePagesOpen(false);
                  if (!ok) return;
                  setSelectingPages(false);
                  setSelectedPaths([]);
                });
              }}
            />
          ) : null}
          {onDeleteDomain ? (
            <DeleteConfirmDialog
              open={deleteDomainOpen}
              onClose={() => {
                if (!deletingDomain) setDeleteDomainOpen(false);
              }}
              severity={domainCopy.severity}
              title={domainCopy.title}
              message={domainCopy.message}
              note={domainCopy.note}
              strongNames={domainCopy.strongNames}
              confirmLabel={domainCopy.confirmLabel}
              cancelLabel={domainCopy.cancelLabel}
              isConfirming={deletingDomain}
              onConfirm={() => {
                setDeletingDomain(true);
                void onDeleteDomain().finally(() => {
                  setDeletingDomain(false);
                  setDeleteDomainOpen(false);
                });
              }}
            />
          ) : null}
        </section>
      );
    }

    const visibleHighlights = domainHighlights.filter((h) => (h.path || '/') === section);
    const totalQuotePages = Math.max(
      1,
      Math.ceil(visibleHighlights.length / PHONE_PAGE_SIZE)
    );
    const safeQuotePage = clampPage(quotePage, totalQuotePages);
    const quoteStart = (safeQuotePage - 1) * PHONE_PAGE_SIZE;
    const pagedHighlights = visibleHighlights.slice(
      quoteStart,
      quoteStart + PHONE_PAGE_SIZE
    );

    return (
      <section className="phone-library" data-od-id="phone-library-quotes">
        {searchControl}
        <div className="phone-domain-head">
          <div className="phone-domain-titles">
            <p className="phone-kicker">{domain}</p>
            <h2 className="phone-library-title">{displaySectionPath(section)}</h2>
          </div>
          {onDeleteHighlights ? (
            <button
              type="button"
              className="phone-export-btn is-danger"
              aria-pressed={selectingHighlights}
              aria-label={
                selectingHighlights && selectedHighlightIds.length > 0
                  ? selectedHighlightIds.length === 1
                    ? 'Delete 1 highlight'
                    : `Delete ${selectedHighlightIds.length} highlights`
                  : selectingHighlights
                    ? 'Cancel delete'
                    : 'Delete highlights'
              }
              disabled={deletingHighlights}
              onClick={() => {
                if (!selectingHighlights) {
                  setSelectingHighlights(true);
                  return;
                }
                if (selectedHighlightIds.length === 0) {
                  setSelectingHighlights(false);
                  return;
                }
                setDeleteHighlightsOpen(true);
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 7h16" />
                <path d="M9 7V5h6v2" />
                <path d="M7 7l1 12h8l1-12" />
              </svg>
            </button>
          ) : null}
        </div>
        {onOpenRelatedPage ? (
          <PhoneRelatedPages
            label={relatedLabel}
            pages={relatedPages}
            onOpen={onOpenRelatedPage}
          />
        ) : null}
        <div className="phone-sort-line">
          <div className="phone-toolbar-meta">
            {selectingHighlights ? (
              <p className="phone-quote-meta">{selectedHighlightIds.length} selected</p>
            ) : null}
          </div>
          <div className="phone-toolbar-actions" data-od-id="phone-page-export">
            {exportRow}
            {sortControl}
          </div>
        </div>
        {visibleHighlights.length === 0 ? (
          <p className="phone-empty">No highlights for this page.</p>
        ) : (
          <>
            <div className="phone-quote-list">
              {pagedHighlights.map((h) => {
                const picked = selectedHighlightIds.includes(h.id);
                return (
                  <PhoneHighlightCard
                    key={h.id}
                    highlight={h}
                    meta={h.path && h.path !== '/' ? h.path : domain}
                    selecting={selectingHighlights}
                    selected={picked}
                    onOpen={() => {
                      if (!selectingHighlights) {
                        onOpenHighlight(h.id);
                        return;
                      }
                      setSelectedHighlightIds((prev) =>
                        prev.includes(h.id)
                          ? prev.filter((id) => id !== h.id)
                          : [...prev, h.id]
                      );
                    }}
                    clientKind={clientKind}
                    onNoteSave={onNoteSave}
                    onTagsChange={onTagsChange}
                    onDelete={onDeleteHighlight}
                    tagSuggestions={tagSuggestions}
                  />
                );
              })}
            </div>
            {totalQuotePages > 1 ? (
              <LibraryPager
                page={safeQuotePage}
                totalPages={totalQuotePages}
                onPageChange={setQuotePage}
              />
            ) : null}
          </>
        )}
        {onDeleteHighlights ? (
          <DeleteConfirmDialog
            open={deleteHighlightsOpen}
            onClose={() => {
              if (!deletingHighlights) setDeleteHighlightsOpen(false);
            }}
            severity="danger"
            title={
              selectedHighlightIds.length === 1
                ? 'Delete this highlight?'
                : `Delete ${selectedHighlightIds.length} highlights?`
            }
            message={
              selectedHighlightIds.length === 1
                ? 'The quote, note, and tags will be removed. Nothing else on this page is affected.'
                : `This permanently removes ${selectedHighlightIds.length} highlights from this page.`
            }
            note="This action cannot be undone."
            confirmLabel="Delete permanently"
            cancelLabel="Cancel"
            isConfirming={deletingHighlights}
            onConfirm={() => {
              const ids = selectedHighlightIds;
              setDeletingHighlights(true);
              void onDeleteHighlights(ids).then((ok) => {
                setDeletingHighlights(false);
                setDeleteHighlightsOpen(false);
                if (!ok) return;
                setSelectingHighlights(false);
                setSelectedHighlightIds([]);
              });
            }}
          />
        ) : null}
      </section>
    );
  }

  // Domain list mode. With the filter bar, the parent already applied query and filters.
  const filtered = filters ? domainGroups : filterByQuery(domainGroups, query);

  const visibleHighlights = filtered.reduce((sum, g) => sum + g.count, 0);

  return (
    <section className="phone-library" data-od-id="phone-library-domains">
      {searchControl ?? (
        <div className="phone-search">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            type="search"
            placeholder="Search domains or quotes…"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            aria-label="Search library"
            data-od-id="phone-library-search"
          />
        </div>
      )}
      {highlights.length > 0 ? (
        <div className="phone-sort-line">
          <div className="phone-toolbar-meta">
            <span className="phone-search-count">
              {filtered.length} domain{filtered.length === 1 ? '' : 's'} ·{' '}
              {visibleHighlights} highlight{visibleHighlights === 1 ? '' : 's'}
            </span>
          </div>
          <div className="phone-toolbar-actions">{sortControl}</div>
        </div>
      ) : null}
      {highlights.length === 0 && !hasLibrary ? (
        <p className="phone-empty">
          No highlights yet. Highlight on desktop with the extension.
        </p>
      ) : filtered.length === 0 ? (
        <p className="phone-empty">No matches.</p>
      ) : (
        <div className="phone-domain-list">
          {filtered.map((g) => (
            <PhoneDomainRow
              key={g.domain}
              domain={g.domain}
              count={g.count}
              onClick={() => onOpenDomain(g.domain)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
