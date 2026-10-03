/**
 * @file WebGroupAddCard.tsx
 * @description Collapsible unified add card with smart auto-suggest combobox
 * for the Page Groups web pane (PRD 2026-09-29 §3).
 *
 * Features:
 * - Single collapsible card (+ Add page or domain)
 * - Unified type-ahead auto-suggest matching Library domains and pages
 * - Graceful fallback: Add URL "..." or Add domain "..."
 * - Eliminates redundant subdomain checkboxes and redundant item listings
 */

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';

import { DomainFavicon } from '@/web/components/DomainFavicon';
import type { WebGroupMutationResult } from '@/web/hooks/useWebGroups';

export interface LibraryDomainSuggestion {
  hostname: string;
  itemCount: number;
}

export interface LibraryPageSuggestion {
  url: string;
  title: string | null;
  domain: string;
  highlightCount?: number;
}

export interface WebGroupAddCardProps {
  onAddPage: (rawUrl: string) => Promise<WebGroupMutationResult>;
  onAddDomain: (rawHostname: string) => Promise<WebGroupMutationResult>;
  availablePages?: LibraryPageSuggestion[];
  availableDomains?: LibraryDomainSuggestion[];
  defaultOpen?: boolean;
}

type ComboboxOption =
  | { kind: 'domain'; hostname: string; count: number }
  | { kind: 'page'; url: string; title: string | null; domain: string; count?: number }
  | { kind: 'custom-url'; url: string }
  | { kind: 'custom-domain'; hostname: string };

function PageDocIco(): React.ReactElement {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 2h5.5L13 5.5V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
      <path d="M9 2v4h4" />
    </svg>
  );
}

function isValidHostname(val: string): boolean {
  const clean = val.trim().toLowerCase();
  if (!clean || clean.includes('/') || clean.includes(' ') || clean.includes(':')) {
    return false;
  }
  return clean.includes('.') || clean === 'localhost';
}

function normalizeCustomUrl(val: string): string {
  const clean = val.trim();
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }
  return `https://${clean}`;
}

export function WebGroupAddCard({
  onAddPage,
  onAddDomain,
  availablePages = [],
  availableDomains = [],
  defaultOpen = false,
}: WebGroupAddCardProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const options = useMemo<ComboboxOption[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const matchedDomains: ComboboxOption[] = availableDomains
      .filter((d) => d.hostname.toLowerCase().includes(q))
      .slice(0, 4)
      .map((d) => ({ kind: 'domain', hostname: d.hostname, count: d.itemCount }));

    const matchedPages: ComboboxOption[] = availablePages
      .filter(
        (p) =>
          p.url.toLowerCase().includes(q) ||
          (p.title && p.title.toLowerCase().includes(q)) ||
          p.domain.toLowerCase().includes(q)
      )
      .slice(0, 5)
      .map((p) => ({
        kind: 'page',
        url: p.url,
        title: p.title,
        domain: p.domain,
        count: p.highlightCount,
      }));

    const result: ComboboxOption[] = [...matchedDomains, ...matchedPages];

    const hasExactDomain = availableDomains.some(
      (d) => d.hostname.toLowerCase() === q
    );
    const hasExactPage = availablePages.some(
      (p) => p.url.toLowerCase() === q || normalizeCustomUrl(p.url).toLowerCase() === normalizeCustomUrl(q).toLowerCase()
    );

    // Fallback options
    if (q.startsWith('http://') || q.startsWith('https://') || q.includes('/')) {
      if (!hasExactPage) {
        result.push({ kind: 'custom-url', url: normalizeCustomUrl(q) });
      }
    } else if (isValidHostname(q)) {
      if (!hasExactDomain) {
        result.push({ kind: 'custom-domain', hostname: q });
      }
      if (!hasExactPage) {
        result.push({ kind: 'custom-url', url: normalizeCustomUrl(q) });
      }
    } else if (q.length > 1) {
      result.push({ kind: 'custom-domain', hostname: q });
      result.push({ kind: 'custom-url', url: normalizeCustomUrl(q) });
    }

    return result;
  }, [query, availableDomains, availablePages]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [options]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelectOption = async (opt: ComboboxOption): Promise<void> => {
    setError(null);
    setBusy(true);
    try {
      let res: WebGroupMutationResult;
      if (opt.kind === 'domain') {
        res = await onAddDomain(opt.hostname);
      } else if (opt.kind === 'page') {
        res = await onAddPage(opt.url);
      } else if (opt.kind === 'custom-domain') {
        res = await onAddDomain(opt.hostname);
      } else {
        res = await onAddPage(opt.url);
      }

      if (res.success) {
        setQuery('');
        setIsFocused(false);
      } else {
        setError(res.error);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (!isFocused || options.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (options[selectedIndex]) {
        void handleSelectOption(options[selectedIndex]!);
      }
    } else if (e.key === 'Escape') {
      setIsFocused(false);
    }
  };

  const showDropdown = isFocused && query.trim().length > 0 && options.length > 0;

  return (
    <div
      data-testid="web-group-add-card"
      ref={containerRef}
      style={{
        border: '1px solid var(--rule-soft)',
        borderRadius: 'var(--radius)',
        background: 'var(--paper-2)',
        marginBottom: 16,
        overflow: 'visible',
        position: 'relative',
      }}
    >
      <button
        type="button"
        data-testid="web-group-add-toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        style={{
          all: 'unset',
          boxSizing: 'border-box',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          cursor: 'pointer',
        }}
      >
        <span
          className="u-serif"
          style={{
            fontSize: 'var(--step-0)',
            fontWeight: 500,
            color: 'var(--ink)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 'var(--step-1)', lineHeight: 1, color: 'var(--accent)' }}>
            {isOpen ? '−' : '+'}
          </span>
          Add page or domain
        </span>
        <span
          aria-hidden="true"
          style={{
            fontSize: 'var(--step-0)',
            color: 'var(--ink-3)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s ease',
          }}
        >
          ▾
        </span>
      </button>

      {isOpen ? (
        <div
          data-testid="web-group-add-body"
          style={{
            padding: '4px 14px 14px',
            borderTop: '1px solid var(--rule-soft)',
            position: 'relative',
          }}
        >
          <div style={{ position: 'relative', marginTop: 8 }}>
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={showDropdown}
              aria-controls={listboxId}
              data-testid="web-group-add-input"
              placeholder="Search library pages, domains, or type URL…"
              value={query}
              disabled={busy}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsFocused(true);
              }}
              onFocus={() => setIsFocused(true)}
              onKeyDown={handleKeyDown}
              className="search-input"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '8px 32px 8px 12px',
                fontSize: 'var(--step--1)',
                background: 'var(--paper)',
                border: '1px solid var(--rule)',
                borderRadius: 'var(--radius)',
                color: 'var(--ink)',
              }}
            />
            {query ? (
              <button
                type="button"
                data-testid="web-group-add-clear"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                aria-label="Clear input"
                style={{
                  all: 'unset',
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  cursor: 'pointer',
                  color: 'var(--ink-3)',
                  fontSize: 'var(--step-0)',
                  lineHeight: 1,
                  padding: 4,
                }}
              >
                ✕
              </button>
            ) : null}

            {showDropdown ? (
              <ul
                id={listboxId}
                role="listbox"
                data-testid="web-group-add-dropdown"
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 999,
                  margin: '4px 0 0',
                  padding: '4px 0',
                  listStyle: 'none',
                  background: 'var(--paper-floating, var(--paper))',
                  border: '1px solid var(--rule)',
                  borderRadius: 'var(--radius)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                  maxHeight: 280,
                  overflowY: 'auto',
                }}
              >
                {options.map((opt, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <li
                      key={
                        opt.kind === 'domain'
                          ? `dom-${opt.hostname}`
                          : opt.kind === 'page'
                          ? `page-${opt.url}`
                          : opt.kind === 'custom-domain'
                          ? `custom-dom-${opt.hostname}`
                          : `custom-url-${opt.url}`
                      }
                      role="option"
                      aria-selected={isSelected}
                      data-testid={`web-group-add-option-${idx}`}
                      className="web-group-add-option"
                      onClick={() => void handleSelectOption(opt)}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        background: isSelected ? 'var(--paper-2)' : 'transparent',
                        borderBottom: '1px solid var(--rule-soft)',
                      }}
                    >
                      {opt.kind === 'domain' ? (
                        <>
                          <DomainFavicon domain={opt.hostname} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              className="u-sans"
                              style={{
                                fontSize: 'var(--step--1)',
                                fontWeight: 500,
                                color: 'var(--ink)',
                              }}
                            >
                              {opt.hostname}
                            </div>
                            <div className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)' }}>
                              Domain · {opt.count} {opt.count === 1 ? 'page' : 'pages'} in Library
                            </div>
                          </div>
                        </>
                      ) : opt.kind === 'page' ? (
                        <>
                          <span style={{ color: 'var(--ink-3)', display: 'grid', placeItems: 'center' }}>
                            <PageDocIco />
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              className="u-serif"
                              style={{
                                fontSize: 'var(--step--1)',
                                color: 'var(--ink)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {opt.title || opt.url}
                            </div>
                            <div className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)' }}>
                              Page · {opt.domain}
                            </div>
                          </div>
                        </>
                      ) : opt.kind === 'custom-domain' ? (
                        <>
                          <span
                            aria-hidden="true"
                            style={{
                              width: 16,
                              height: 16,
                              display: 'grid',
                              placeItems: 'center',
                              fontSize: 'var(--step-0)',
                              color: 'var(--accent)',
                            }}
                          >
                            +
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="u-sans" style={{ fontSize: 'var(--step--1)', color: 'var(--ink)' }}>
                              Add domain <strong>{opt.hostname}</strong>
                            </div>
                            <div className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)' }}>
                              Includes all current and future pages
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <span
                            aria-hidden="true"
                            style={{
                              width: 16,
                              height: 16,
                              display: 'grid',
                              placeItems: 'center',
                              fontSize: 'var(--step-0)',
                              color: 'var(--accent)',
                            }}
                          >
                            +
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="u-sans" style={{ fontSize: 'var(--step--1)', color: 'var(--ink)' }}>
                              Add URL <strong>{opt.url}</strong>
                            </div>
                            <div className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)' }}>
                              Web page
                            </div>
                          </div>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>

          {error ? (
            <p
              role="alert"
              data-testid="web-group-add-error"
              style={{
                margin: '8px 0 0',
                fontSize: 'var(--step--1)',
                color: 'var(--ttl-expired, #b00)',
              }}
            >
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
