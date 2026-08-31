/**
 * @file HighlightSearchBar.tsx
 * @description Presentational Library search bar matching v3 mock SearchBar:
 * query + clear, Filters control with active count, expandable panel
 * (fields / refine / optional tags), active chips, result count + reset.
 * Purely controlled by props — no data fetching. Scope is implicit from parent.
 *
 * Visual: V2 Editorial tokens; styles live in global.css (.search-bar …).
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';

import {
  countActiveFilters,
  DEFAULT_SEARCH_FIELDS,
  REFINE_OPTIONS,
  toggleRefine,
  toggleSearchField,
  toggleTagFilter,
  type RefineFilter,
} from '@/shared/utils/highlight-filter';
import type { SearchField } from '@/shared/utils/highlight-search';
import { USER_SEARCH_FIELDS } from '@/shared/utils/highlight-search';

export interface AvailableTag {
  label: string;
  /** Optional frequency for popular / browse lists. */
  n?: number;
}

export interface HighlightSearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  fields: SearchField[];
  onFieldsChange: (fields: SearchField[]) => void;
  refine?: RefineFilter[];
  onRefineChange?: (refine: RefineFilter[]) => void;
  tagFilters?: string[];
  onTagFiltersChange?: (tags: string[]) => void;
  /** Tags available for the picker; omit or empty hides the Tags section. */
  availableTags?: AvailableTag[];
  resultCount?: number;
  placeholder?: string;
  disabled?: boolean;
  /** Optional controlled open state for the filter panel. */
  filterOpen?: boolean;
  onFilterOpenChange?: (open: boolean) => void;
}

const DEBOUNCE_MS = 150;

const FIELD_CHIP_LABELS: Record<SearchField, string> = {
  text: 'Text',
  notes: 'Notes',
  tags: 'Tags',
  url: 'URL',
  domain: 'Domain',
};

function resultCountLabel(count: number): string {
  if (count === 0) return '0';
  return String(count);
}

function fieldsCoverAll(fields: SearchField[]): boolean {
  if (fields.length === 0) return true;
  return USER_SEARCH_FIELDS.every((f) => fields.includes(f));
}

export function HighlightSearchBar(props: HighlightSearchBarProps): React.ReactElement {
  const {
    query,
    onQueryChange,
    fields,
    onFieldsChange,
    refine = [],
    onRefineChange,
    tagFilters = [],
    onTagFiltersChange,
    availableTags,
    resultCount,
    placeholder = 'Search…',
    disabled = false,
    filterOpen: filterOpenProp,
    onFilterOpenChange,
  } = props;

  const [inputValue, setInputValue] = useState(query);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [internalOpen, setInternalOpen] = useState(false);
  const [tagFind, setTagFind] = useState('');
  const [tagBrowse, setTagBrowse] = useState(false);
  const [tagSort, setTagSort] = useState<'popular' | 'az'>('popular');

  const filterOpen = filterOpenProp ?? internalOpen;
  const setFilterOpen = (open: boolean): void => {
    if (onFilterOpenChange) onFilterOpenChange(open);
    else setInternalOpen(open);
  };

  useEffect(() => {
    setInputValue(query);
  }, [query]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const activeN = countActiveFilters({ fields, refine, tagFilters });
  const hasFilters = activeN > 0;
  const showTagPicker = Boolean(
    availableTags && availableTags.length > 0 && onTagFiltersChange
  );
  const showRefine = Boolean(onRefineChange);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const next = event.target.value;
    setInputValue(next);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      debounceTimer.current = null;
      onQueryChange(next);
    }, DEBOUNCE_MS);
  };

  const handleClearQuery = (): void => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    setInputValue('');
    onQueryChange('');
  };

  const handleResetFilters = (): void => {
    onFieldsChange([...DEFAULT_SEARCH_FIELDS]);
    onRefineChange?.([]);
    onTagFiltersChange?.([]);
    setTagFind('');
  };

  const handleFieldToggle = (field: SearchField): void => {
    onFieldsChange(toggleSearchField(fields, field));
  };

  const handleRefineToggle = (id: RefineFilter): void => {
    onRefineChange?.(toggleRefine(refine, id));
  };

  const handleTagToggle = (tag: string): void => {
    onTagFiltersChange?.(toggleTagFilter(tagFilters, tag));
  };

  const trimmedQuery = query.trim();
  // Show count for text search and for refine/tag-only filtering (parents pass resultCount).
  const showResultCount =
    resultCount !== undefined && (trimmedQuery.length > 0 || hasFilters);

  const popularTags = useMemo(() => {
    if (!availableTags) return [];
    return [...availableTags]
      .sort((a, b) => (b.n ?? 0) - (a.n ?? 0) || a.label.localeCompare(b.label))
      .slice(0, 5);
  }, [availableTags]);

  const browseTags = useMemo(() => {
    if (!availableTags) return [];
    const q = tagFind.trim().toLowerCase();
    let list = availableTags;
    if (q) {
      list = list.filter((t) => t.label.toLowerCase().includes(q));
    }
    if (tagSort === 'az') {
      return [...list].sort((a, b) => a.label.localeCompare(b.label));
    }
    return [...list].sort(
      (a, b) => (b.n ?? 0) - (a.n ?? 0) || a.label.localeCompare(b.label)
    );
  }, [availableTags, tagFind, tagSort]);

  const fieldActiveSet =
    fields.length === 0 ? new Set(USER_SEARCH_FIELDS) : new Set(fields);

  return (
    <div className="search-bar" style={{ opacity: disabled ? 0.5 : 1 }}>
      <div className="search-input-row">
        <span className="glyph" aria-hidden="true">
          ⌕
        </span>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          aria-label="Search"
          disabled={disabled}
        />
        {inputValue.length > 0 && (
          <button
            type="button"
            className="clear"
            aria-label="Clear"
            onClick={handleClearQuery}
            disabled={disabled}
          >
            ×
          </button>
        )}
        <button
          type="button"
          className={`search-filter-btn${filterOpen ? ' open' : ''}${hasFilters ? ' has-filters' : ''}`}
          aria-label="Filters"
          aria-expanded={filterOpen}
          disabled={disabled}
          onClick={() => setFilterOpen(!filterOpen)}
        >
          Filters
          {activeN > 0 ? <span className="fcount">{activeN}</span> : null}
        </button>
      </div>

      {activeN > 0 && (
        <div className="filter-active" role="list" aria-label="Active filters">
          {!fieldsCoverAll(fields) && fields.length > 0 && (
            <span className="filter-active-chip" role="listitem">
              <span>
                {fields
                  .filter((f) => f !== 'url')
                  .map((f) => FIELD_CHIP_LABELS[f])
                  .join(' · ')}
              </span>
              <button
                type="button"
                className="x"
                aria-label="Reset fields"
                disabled={disabled}
                onClick={() => onFieldsChange([...DEFAULT_SEARCH_FIELDS])}
              >
                ×
              </button>
            </span>
          )}
          {refine.map((id) => {
            const opt = REFINE_OPTIONS.find((o) => o.id === id);
            return (
              <span key={id} className="filter-active-chip" role="listitem">
                <span>{opt ? opt.label : id}</span>
                <button
                  type="button"
                  className="x"
                  aria-label={`Remove ${opt?.label ?? id}`}
                  disabled={disabled}
                  onClick={() => onRefineChange?.(refine.filter((r) => r !== id))}
                >
                  ×
                </button>
              </span>
            );
          })}
          {tagFilters.slice(0, 3).map((t) => (
            <span key={t} className="filter-active-chip" role="listitem">
              <span>#{t}</span>
              <button
                type="button"
                className="x"
                aria-label={`Remove ${t}`}
                disabled={disabled}
                onClick={() => handleTagToggle(t)}
              >
                ×
              </button>
            </span>
          ))}
          {tagFilters.length > 3 && (
            <span className="filter-active-chip" role="listitem">
              <span>+{tagFilters.length - 3}</span>
            </span>
          )}
        </div>
      )}

      {showResultCount && (
        <div className="search-meta-row">
          <span className="search-count">{resultCountLabel(resultCount as number)}</span>
          {activeN > 0 && (
            <button
              type="button"
              className="search-clear-filters"
              disabled={disabled}
              onClick={handleResetFilters}
            >
              Clear
            </button>
          )}
        </div>
      )}

      {filterOpen && (
        <div className="filter-panel">
          <div className="filter-sec">
            <div className="filter-sec-label">Fields</div>
            <div className="filter-chip-row" role="group" aria-label="Fields">
              {USER_SEARCH_FIELDS.map((id) => {
                const on = fieldActiveSet.has(id);
                return (
                  <button
                    key={id}
                    type="button"
                    className={`field-chip${on ? ' active' : ''}`}
                    aria-pressed={on}
                    disabled={disabled}
                    onClick={() => handleFieldToggle(id)}
                  >
                    {on ? (
                      <span className="check" aria-hidden="true">
                        ✓
                      </span>
                    ) : null}
                    {FIELD_CHIP_LABELS[id]}
                  </button>
                );
              })}
            </div>
          </div>

          {showRefine && (
            <div className="filter-sec">
              <div className="filter-sec-label">Status</div>
              <div className="filter-chip-row" role="group" aria-label="Status">
                {REFINE_OPTIONS.map((o) => {
                  const on = refine.includes(o.id);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      className={`refine-chip${on ? ' active' : ''}`}
                      aria-pressed={on}
                      disabled={disabled}
                      onClick={() => handleRefineToggle(o.id)}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {showTagPicker && availableTags && (
            <div className="tag-picker">
              <div className="tag-picker-head">
                <div className="filter-sec-label">Tags</div>
                <span className="tag-picker-count">{availableTags.length}</span>
              </div>
              {tagFilters.length > 0 ? (
                <div className="tag-selected-row" role="list" aria-label="Selected tags">
                  {tagFilters.map((t) => (
                    <span key={t} className="tag-sel-chip" role="listitem">
                      <span>#{t}</span>
                      <button
                        type="button"
                        className="x"
                        aria-label={`Remove ${t}`}
                        disabled={disabled}
                        onClick={() => handleTagToggle(t)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="tag-find-row">
                <span className="glyph" aria-hidden="true">
                  ⌕
                </span>
                <input
                  type="text"
                  className="tag-find-input"
                  placeholder="Tags…"
                  aria-label="Filter tags"
                  value={tagFind}
                  disabled={disabled}
                  onChange={(e) => setTagFind(e.target.value)}
                />
              </div>
              {tagBrowse || tagFind.trim() ? (
                <>
                  <div className="tag-browse-toolbar">
                    <span className="tag-sublabel">{browseTags.length}</span>
                    <div className="tag-sort-seg" role="group" aria-label="Sort">
                      <button
                        type="button"
                        className={tagSort === 'popular' ? 'active' : undefined}
                        disabled={disabled}
                        onClick={() => setTagSort('popular')}
                      >
                        Top
                      </button>
                      <button
                        type="button"
                        className={tagSort === 'az' ? 'active' : undefined}
                        disabled={disabled}
                        onClick={() => setTagSort('az')}
                      >
                        A–Z
                      </button>
                    </div>
                  </div>
                  <div className="tag-list" role="listbox" aria-label="Tags">
                    {browseTags.length === 0 ? (
                      <div className="tag-empty">None</div>
                    ) : (
                      browseTags.map((t) => {
                        const on = tagFilters.some(
                          (x) => x.toLowerCase() === t.label.toLowerCase()
                        );
                        return (
                          <button
                            key={t.label}
                            type="button"
                            className={`tag-list-row${on ? ' selected' : ''}`}
                            role="option"
                            aria-selected={on}
                            disabled={disabled}
                            onClick={() => handleTagToggle(t.label)}
                          >
                            <span className="tag-list-label">#{t.label}</span>
                            {t.n !== undefined && (
                              <span className="tag-list-n">{t.n}</span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                  {tagBrowse && (
                    <button
                      type="button"
                      className="tag-browse-toggle"
                      disabled={disabled}
                      onClick={() => setTagBrowse(false)}
                    >
                      Less
                    </button>
                  )}
                </>
              ) : (
                <>
                  {popularTags.length > 0 ? (
                    <div className="tag-popular-row">
                      {popularTags.map((t) => {
                        const on = tagFilters.some(
                          (x) => x.toLowerCase() === t.label.toLowerCase()
                        );
                        return (
                          <button
                            key={t.label}
                            type="button"
                            className={`tag-filter-chip${on ? ' active' : ''}`}
                            aria-pressed={on}
                            disabled={disabled}
                            onClick={() => handleTagToggle(t.label)}
                          >
                            #{t.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                  {availableTags.length > 5 && (
                    <button
                      type="button"
                      className="tag-browse-toggle"
                      disabled={disabled}
                      onClick={() => setTagBrowse(true)}
                    >
                      All
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          <div className="filter-foot">
            <button
              type="button"
              className="filter-reset"
              disabled={disabled || !activeN}
              onClick={handleResetFilters}
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
