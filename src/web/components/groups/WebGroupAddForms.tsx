/**
 * @file WebGroupAddForms.tsx
 * @description Add-page (URL, http/https only) and add-domain (hostname +
 * include-subdomains toggle) forms for the web group pane.
 * Includes library auto-suggest and standard design-system button styling.
 */

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';

import { Button } from '@/ui-system/components/primitives/Button';
import { Input } from '@/ui-system/components/primitives/Input';
import { DomainFavicon } from '@/web/components/DomainFavicon';
import type { WebGroupMutationResult } from '@/web/hooks/useWebGroups';

function FormError({ message, testId }: { message: string | null; testId: string }) {
  if (!message) return null;
  return (
    <p
      data-testid={testId}
      role="alert"
      style={{ margin: '8px 0 0', fontSize: 'var(--step--1)', color: 'var(--ttl-expired)' }}
    >
      {message}
    </p>
  );
}

export interface AvailablePageSuggestion {
  url: string;
  title: string | null;
  domain: string;
}

export interface WebGroupAddPageFormProps {
  onAdd: (rawUrl: string) => Promise<WebGroupMutationResult>;
  availablePages?: AvailablePageSuggestion[];
  existingUrls?: string[];
}

export function WebGroupAddPageForm({
  onAdd,
  availablePages = [],
  existingUrls = [],
}: WebGroupAddPageFormProps): React.ReactElement {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const existingSet = useMemo(() => new Set(existingUrls.map((u) => u.toLowerCase())), [existingUrls]);

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q || !isFocused) return [];
    return availablePages
      .filter((p) => {
        if (existingSet.has(p.url.toLowerCase())) return false;
        return (
          p.url.toLowerCase().includes(q) ||
          (p.title && p.title.toLowerCase().includes(q)) ||
          p.domain.toLowerCase().includes(q)
        );
      })
      .slice(0, 6);
  }, [value, isFocused, availablePages, existingSet]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [suggestions]);

  const selectSuggestion = async (url: string): Promise<void> => {
    setValue('');
    setIsFocused(false);
    setBusy(true);
    setError(null);
    try {
      const result = await onAdd(url);
      if (!result.success) {
        setError(result.error);
        setValue(url);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
      e.preventDefault();
      void selectSuggestion(suggestions[highlightedIndex]!.url);
    } else if (e.key === 'Escape') {
      setIsFocused(false);
    }
  };

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await onAdd(value);
      if (result.success) {
        setValue('');
        setIsFocused(false);
      } else {
        setError(result.error);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        void submit(e);
      }}
      data-testid="web-group-add-page-form"
      style={{ marginBottom: 16 }}
    >
      <p className="u-kicker" style={{ margin: '0 0 8px', color: 'var(--ink-3)' }}>
        Add page
      </p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <div ref={containerRef} style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          <Input
            label="Page URL"
            placeholder="https://example.com/article"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setIsFocused(true);
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              // Delay closing to allow clicking suggestions
              setTimeout(() => setIsFocused(false), 200);
            }}
            onKeyDown={handleKeyDown}
            aria-label="Page URL"
            data-testid="web-group-add-page-input"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-expanded={suggestions.length > 0}
            aria-controls={listboxId}
          />

          {suggestions.length > 0 ? (
            <ul
              id={listboxId}
              role="listbox"
              data-testid="web-group-page-suggestions"
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 50,
                margin: '4px 0 0',
                padding: '4px 0',
                listStyle: 'none',
                background: 'var(--paper)',
                border: '1px solid var(--rule-soft)',
                borderRadius: 'var(--radius)',
                boxShadow: 'var(--shadow-1, 0 4px 12px rgba(0,0,0,0.08))',
                maxHeight: 240,
                overflowY: 'auto',
              }}
            >
              {suggestions.map((p, idx) => {
                const isHighlighted = idx === highlightedIndex;
                return (
                  <li
                    key={p.url}
                    role="option"
                    aria-selected={isHighlighted}
                    data-testid={`page-suggestion-${idx}`}
                    className="group-suggestion-item"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectSuggestion(p.url);
                    }}
                  >
                    <DomainFavicon domain={p.domain} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      {p.title ? (
                        <p
                          className="u-serif"
                          style={{
                            margin: 0,
                            fontSize: 'var(--step-0)',
                            color: 'var(--ink)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {p.title}
                        </p>
                      ) : null}
                      <p
                        className="u-mono"
                        style={{
                          margin: 0,
                          fontSize: 'var(--step--2)',
                          color: 'var(--ink-3)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {p.url}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
        <Button
          type="submit"
          variant="primary"
          disabled={busy}
          data-testid="web-group-add-page-submit"
          style={{ height: 44, minHeight: 44, padding: '0 16px', flexShrink: 0 }}
        >
          {busy ? 'Adding…' : 'Add'}
        </Button>
      </div>
      <FormError message={error} testId="web-group-add-page-error" />
    </form>
  );
}

export interface WebGroupAddDomainFormProps {
  onAdd: (rawHostname: string, includeSubdomains: boolean) => Promise<WebGroupMutationResult>;
  availableDomains?: string[];
  existingHostnames?: string[];
}

export function WebGroupAddDomainForm({
  onAdd,
  availableDomains = [],
  existingHostnames = [],
}: WebGroupAddDomainFormProps): React.ReactElement {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const existingSet = useMemo(
    () => new Set(existingHostnames.map((h) => h.toLowerCase())),
    [existingHostnames]
  );

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q || !isFocused) return [];
    return availableDomains
      .filter((d) => {
        if (existingSet.has(d.toLowerCase())) return false;
        return d.toLowerCase().includes(q);
      })
      .slice(0, 6);
  }, [value, isFocused, availableDomains, existingSet]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [suggestions]);

  const selectSuggestion = async (domain: string): Promise<void> => {
    setValue('');
    setIsFocused(false);
    setBusy(true);
    setError(null);
    try {
      const result = await onAdd(domain, true);
      if (!result.success) {
        setError(result.error);
        setValue(domain);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
      e.preventDefault();
      void selectSuggestion(suggestions[highlightedIndex]!);
    } else if (e.key === 'Escape') {
      setIsFocused(false);
    }
  };

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await onAdd(value, true);
      if (result.success) {
        setValue('');
        setIsFocused(false);
      } else {
        setError(result.error);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        void submit(e);
      }}
      data-testid="web-group-add-domain-form"
      style={{ marginBottom: 4 }}
    >
      <p className="u-kicker" style={{ margin: '0 0 8px', color: 'var(--ink-3)' }}>
        Add domain
      </p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <div ref={containerRef} style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          <Input
            label="Domain"
            placeholder="example.com"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setIsFocused(true);
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setTimeout(() => setIsFocused(false), 200);
            }}
            onKeyDown={handleKeyDown}
            aria-label="Domain"
            data-testid="web-group-add-domain-input"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-expanded={suggestions.length > 0}
            aria-controls={listboxId}
          />

          {suggestions.length > 0 ? (
            <ul
              id={listboxId}
              role="listbox"
              data-testid="web-group-domain-suggestions"
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 50,
                margin: '4px 0 0',
                padding: '4px 0',
                listStyle: 'none',
                background: 'var(--paper)',
                border: '1px solid var(--rule-soft)',
                borderRadius: 'var(--radius)',
                boxShadow: 'var(--shadow-1, 0 4px 12px rgba(0,0,0,0.08))',
                maxHeight: 240,
                overflowY: 'auto',
              }}
            >
              {suggestions.map((d, idx) => {
                const isHighlighted = idx === highlightedIndex;
                return (
                  <li
                    key={d}
                    role="option"
                    aria-selected={isHighlighted}
                    data-testid={`domain-suggestion-${idx}`}
                    className="group-suggestion-item"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectSuggestion(d);
                    }}
                  >
                    <DomainFavicon domain={d} />
                    <span
                      className="u-sans"
                      style={{
                        fontSize: 'var(--step-0)',
                        color: 'var(--ink)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {d}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
        <Button
          type="submit"
          variant="primary"
          disabled={busy}
          data-testid="web-group-add-domain-submit"
          style={{ height: 44, minHeight: 44, padding: '0 16px', flexShrink: 0 }}
        >
          {busy ? 'Adding…' : 'Add'}
        </Button>
      </div>
      <FormError message={error} testId="web-group-add-domain-error" />
    </form>
  );
}
