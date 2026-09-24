# Web Phone Flutter-IA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stacked desktop phone layout with the stripped Flutter mock IA: greeting + count + recent, domain list then quotes, full-screen quote with Open and Copy, stripped Settings.

**Architecture:** Phone layout keys off viewport `< 768px` (`useMobileWebViewport`), not UA. Tablet and desktop (`>= 768`) keep the current sidebar and two-pane library. Drill-in uses existing library URL params (`domain`, `highlight`). No new Open Design file. No Flutter/Dart.

**Tech Stack:** React 19, React Router, TypeScript strict, Vitest, V2 CSS custom properties.

**Spec lock (grill 2026-09-22):**

- Visual/structure reference: `/home/sandy/projects/open-design/.od/projects/77039981-726c-431d-8a7a-ae9f169bba0c/underscore-flutter-app-prototype.html`
- Skip: Ask, current-page, stats grid, shortcuts, Models, Connect, guest empty-as-product, Edit/Delete/notes/tags, vault, Integrations, domain rename, export
- Keep: sign-in wall (UA handheld), read-only on handheld, analytics, tablet sidebar

**Worktree:** `/home/sandy/projects/_underscore/.worktrees/web-phone-tablet-consume`  
**Branch:** `feature/web-phone-tablet-consume`

## Global Constraints

- Editorial tokens only. No Tailwind, no hardcoded hex in TSX, no MD3, no `--ink-1..4` in new CSS, no Style C aliases.
- Phone IA only when `useMobileWebViewport()` is true (`max-width: 767px`).
- `>= 768px` must not change Library master-detail or Home two-column layout.
- Do not add Ask, MCP, vault, or capture UI on the phone branch.
- Open source: `buildTextFragmentUrl` + `target="_blank"` + `rel="noopener noreferrer"`.
- Conventional commits. No emoji.
- `bun run type-check` before a task is done.

## File map

| Path | Responsibility |
|------|----------------|
| `src/web/components/PhoneHome.tsx` | Greeting, count, recent list |
| `src/web/components/PhoneDomainRow.tsx` | One domain row |
| `src/web/components/PhoneLibrary.tsx` | Search + domain list, or domain quotes, or quote screen |
| `src/web/components/PhoneQuoteScreen.tsx` | Full quote, Open, Copy, back |
| `src/web/pages/HomePage.tsx` | **Modify** — render `PhoneHome` when phone viewport |
| `src/web/pages/LibraryPage.tsx` | **Modify** — render `PhoneLibrary` when phone viewport |
| `src/web/layout/WebAppShell.tsx` | **Modify** — hide extension strip on phone viewport |
| `src/web/theme/web-app.css` | **Modify** — phone stack scroll + list styles |
| Tests next to each new component | |

---

### Task 1: Phone quote screen

**Files:**
- Create: `src/web/components/PhoneQuoteScreen.tsx`
- Create: `src/web/components/PhoneQuoteScreen.test.tsx`

**Interfaces:**
- Consumes: `WebHighlight`, `buildTextFragmentUrl`, `pageHrefForLibrary`
- Produces: `PhoneQuoteScreen({ highlight, onBack, clientKind })`

- [ ] **Step 1: Failing test**

```tsx
// src/web/components/PhoneQuoteScreen.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PhoneQuoteScreen } from './PhoneQuoteScreen';

const highlight = {
  id: 'h1',
  domain: 'example.com',
  path: '/article',
  quote: 'remarkable insight',
  note: 'secret note',
  tags: ['x'],
  savedAt: 1,
};

describe('PhoneQuoteScreen', () => {
  it('shows quote and source, not editors', () => {
    render(<PhoneQuoteScreen highlight={highlight} onBack={() => undefined} />);
    expect(screen.getByText('remarkable insight')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open' })).toHaveAttribute(
      'href',
      'https://example.com/article#:~:text=remarkable%20insight'
    );
    expect(screen.queryByText('secret note')).toBeNull();
    expect(screen.queryByRole('button', { name: /delete/i })).toBeNull();
  });

  it('calls onBack', () => {
    const onBack = vi.fn();
    render(<PhoneQuoteScreen highlight={highlight} onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `bunx vitest run src/web/components/PhoneQuoteScreen.test.tsx`

- [ ] **Step 3: Implement**

```tsx
// src/web/components/PhoneQuoteScreen.tsx
import React, { useState } from 'react';

import { pageHrefForLibrary } from '@/shared/utils/page-href';
import { buildTextFragmentUrl } from '@/shared/utils/text-fragment';
import type { WebHighlight } from '@/web/hooks/useWebLibrary';
import { trackEvent } from '@/web/lib/analytics';
import type { WebClientKind } from '@/web/lib/classify-web-client';

export function PhoneQuoteScreen({
  highlight,
  onBack,
  clientKind = 'phone',
}: {
  highlight: WebHighlight;
  onBack: () => void;
  clientKind?: WebClientKind;
}): React.ReactElement {
  const [copied, setCopied] = useState(false);
  const pageUrl = pageHrefForLibrary(highlight.domain, highlight.path);
  const href = pageUrl
    ? buildTextFragmentUrl(pageUrl, { exact: highlight.quote })
    : null;

  return (
    <section className="phone-quote" data-od-id="phone-quote">
      <button type="button" className="phone-back" onClick={onBack}>
        Back
      </button>
      <p className="phone-quote-text">{highlight.quote}</p>
      <p className="phone-quote-meta">
        {highlight.domain}
        {highlight.path ? ` ${highlight.path}` : ''}
      </p>
      <div className="phone-quote-actions">
        {href ? (
          <a
            className="btn sm"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent('highlight_open_source', { client: clientKind })}
          >
            Open
          </a>
        ) : null}
        <button
          type="button"
          className="btn sm ghost"
          onClick={() => {
            if (!href || !navigator.clipboard?.writeText) return;
            void navigator.clipboard.writeText(href).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: PASS, then commit**

```bash
git add src/web/components/PhoneQuoteScreen.tsx src/web/components/PhoneQuoteScreen.test.tsx
git commit -m "feat(web): phone quote screen with open and copy"
```

---

### Task 2: Phone domain list + library stack

**Files:**
- Create: `src/web/components/PhoneDomainRow.tsx`
- Create: `src/web/components/PhoneLibrary.tsx`
- Create: `src/web/components/PhoneLibrary.test.tsx`
- Modify: `src/web/pages/LibraryPage.tsx` — early return when `useMobileWebViewport()`

**Interfaces:**
- Consumes: `WebHighlight`, `parseLibrarySelection` / `buildLibrarySearch` via parent callbacks
- Produces: `PhoneLibrary` with modes: domains | quotes | quote screen

`PhoneLibrary` props:

```ts
export type PhoneLibraryProps = {
  highlights: WebHighlight[];
  query: string;
  onQueryChange: (q: string) => void;
  domain: string | null;
  highlightId: string | null;
  onOpenDomain: (domain: string) => void;
  onOpenHighlight: (id: string) => void;
  onBack: () => void;
  clientKind: WebClientKind;
};
```

Behavior:

- No `domain`: search filters domain host strings and quote text. Render one row per domain (`domain`, count). Row click `onOpenDomain`.
- `domain` set, no `highlightId`: back clears domain. List quotes for that domain (clamped). Tap `onOpenHighlight`.
- `highlightId` set: `PhoneQuoteScreen`. Back clears highlight only.
- Empty highlights: “No highlights yet. Highlight on desktop with the extension.”
- Do not render tree delete, export, vault, filters drawer, or install CTA.

- [ ] **Step 1: Test the three modes with fixture highlights (two domains).**
- [ ] **Step 2: Implement components until `bunx vitest run src/web/components/PhoneLibrary.test.tsx` passes.**
- [ ] **Step 3: In `LibraryPage`, after hooks (do not early-return before hooks):**

```tsx
const phoneLayout = useMobileWebViewport();
```

When `phoneLayout`, render `<PhoneLibrary ... />` instead of `lib-shell`. Wire:

- `onOpenDomain` → `navigate({ pathname: '/library', search: buildLibrarySearch({ domain }) })`
- `onOpenHighlight` → include `highlight` in search, keep `domain`
- `onBack` from quotes → drop `domain` and `highlight`; from quote screen → drop `highlight` only

Desktop/tablet branch stays the existing `lib-shell` JSX.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(web): phone library is domain list then quotes"
```

---

### Task 3: Phone Home

**Files:**
- Create: `src/web/components/PhoneHome.tsx`
- Create: `src/web/components/PhoneHome.test.tsx`
- Modify: `src/web/pages/HomePage.tsx`

**Interfaces:**
- Produces: `PhoneHome({ greeting, count, recent, onOpenHighlight })`

Render when `useMobileWebViewport()`:

- `h1` greeting (existing `greetingFor`)
- one line: `{count} highlights` (mono). No stats grid.
- Recent list, max 12, same order as current recent. Tap navigates to `/library?domain=&highlight=`
- No Pages column, no current-page band, no install banner, no Ask
- Empty: “No highlights yet. Highlight on desktop with the extension.”

Desktop Home JSX unchanged when viewport is not phone.

- [ ] **Step 1: Test greeting, count, recent row, no “Current page”, no “Pages”.**
- [ ] **Step 2: Implement and branch `HomePage`.**
- [ ] **Step 3: Commit `feat(web): phone home is greeting count and recent`**

---

### Task 4: Hide desktop chrome that breaks the phone frame

**Files:**
- Modify: `src/web/layout/WebAppShell.tsx`
- Modify: `src/web/theme/web-app.css` inside `@media (max-width: 767px)`

- [ ] **Step 1: Shell**

```tsx
const phoneLayout = useMobileWebViewport();
```

Do not render `extNoticeStrip` when `phoneLayout`. Keep it at `>= 768`.

- [ ] **Step 2: CSS**

Inside the existing `max-width: 767px` block, add:

```css
.phone-home,
.phone-library,
.phone-quote {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  overflow: auto;
  padding: 16px 16px 24px;
  box-sizing: border-box;
}

.phone-domain-row,
.phone-quote-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  width: 100%;
  text-align: left;
  padding: 12px 0;
  border: 0;
  border-bottom: 1px solid var(--rule-soft);
  background: transparent;
  color: var(--ink);
  font-family: var(--sans);
}

.phone-quote-text {
  font-family: var(--serif);
  font-size: var(--step-2);
  line-height: 1.35;
  margin: 12px 0;
}

.phone-quote-meta,
.phone-count {
  font-family: var(--mono);
  font-size: var(--type-label);
  letter-spacing: 0.06em;
  color: var(--ink-3);
}
```

If `--ink-3` is forbidden in new CSS, use `color: color-mix(in srgb, var(--ink) 55%, transparent)` instead.

- [ ] **Step 3: Commit `fix(web): phone stack scroll and hide extension strip`**

---

### Task 5: Verify breakpoints

- [ ] **Step 1: Unit tests**

```bash
bunx vitest run src/web/components/PhoneQuoteScreen.test.tsx src/web/components/PhoneLibrary.test.tsx src/web/components/PhoneHome.test.tsx src/web/pages/LibraryPage.test.tsx src/web/pages/HomePage.test.tsx
bun run type-check
```

Expected: PASS. Existing desktop Library tests must still pass (they use a wide jsdom viewport; if they start rendering `PhoneLibrary`, set `window.matchMedia` in those tests to `matches: false` for `(max-width: 767px)`).

- [ ] **Step 2: Screenshot check (Playwright, headless)**

Widths: 390, 768, 1280. Routes: `/home`, `/library` (guest is fine).

- 390: no sidebar, no “Current page”, no domain tree beside the list, tab bar visible.
- 768 and 1280: sidebar still present, library still two columns.

- [ ] **Step 3: Do not add `apps/mobile`.**

---

## Self-review

| Lock | Task |
|------|------|
| Phone only `< 768` | Tasks 2–4 via `useMobileWebViewport` |
| Tablet/desktop unchanged | Task 2 early branch; Task 5 screenshots |
| Domain then quotes | Task 2 |
| Quote Open/Copy, no edit | Task 1 |
| Home greeting + count + recent | Task 3 |
| Settings already stripped on handheld | no new settings IA; do not re-add tabs |
| No Ask / Flutter | Global constraints |
