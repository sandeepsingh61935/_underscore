import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { buildPagerItems, clampPage } from '@/web/lib/buildPagerItems';

export type LibraryPagerProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

/**
 * Numbered pager with prev/next, direct page buttons, and a go-to field.
 * Body-only control for the web Library list.
 */
export function LibraryPager({
  page,
  totalPages,
  onPageChange,
}: LibraryPagerProps): React.ReactElement {
  const items = useMemo(() => buildPagerItems(page, totalPages), [page, totalPages]);
  const [gotoDraft, setGotoDraft] = useState(String(page));

  useEffect(() => {
    setGotoDraft(String(page));
  }, [page]);

  const goTo = useCallback(
    (raw: number | string) => {
      const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw).trim(), 10);
      onPageChange(clampPage(n, totalPages));
    },
    [onPageChange, totalPages]
  );

  const commitGoto = useCallback(() => {
    goTo(gotoDraft);
  }, [goTo, gotoDraft]);

  return (
    <nav className="pager" data-od-id="library-pager" aria-label="Pagination">
      <button
        type="button"
        className="pager-btn"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => goTo(page - 1)}
      >
        ←
      </button>

      <div className="pager-pages" role="list">
        {items.map((item) =>
          item.type === 'ellipsis' ? (
            <span
              key={item.key}
              className="pager-ellipsis"
              role="presentation"
              aria-hidden="true"
            >
              …
            </span>
          ) : (
            <button
              key={item.page}
              type="button"
              role="listitem"
              className={item.page === page ? 'pager-page is-active' : 'pager-page'}
              aria-label={`Page ${item.page}`}
              aria-current={item.page === page ? 'page' : undefined}
              data-od-id={`library-pager-page-${item.page}`}
              onClick={() => goTo(item.page)}
            >
              {item.page}
            </button>
          )
        )}
      </div>

      <label className="pager-goto">
        <span className="pager-goto-label">Go to</span>
        <input
          className="pager-goto-input"
          type="number"
          inputMode="numeric"
          min={1}
          max={totalPages}
          value={gotoDraft}
          aria-label={`Go to page, ${page} of ${totalPages}`}
          data-od-id="library-pager-goto"
          onChange={(e) => setGotoDraft(e.target.value)}
          onBlur={commitGoto}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitGoto();
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
        />
        <span className="pager-label" aria-hidden="true">
          / {totalPages}
        </span>
      </label>

      <button
        type="button"
        className="pager-btn"
        aria-label="Next page"
        disabled={page >= totalPages}
        onClick={() => goTo(page + 1)}
      >
        →
      </button>
    </nav>
  );
}
