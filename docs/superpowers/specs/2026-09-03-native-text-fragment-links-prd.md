# PRD: Native Web Text Fragment Links and Quote Sharing

**Status:** `ready-for-agent`  
**Date:** 2026-09-03  
**Triage:** `ready-for-agent`  
**Source:** Product prioritization and technical review (Feature 2 of 3)  
**Surfaces:** Extension Popup (`HighlightCard`), Web Library (`LibraryHighlightTile`, `HighlightCard`), Markdown Export Formatter, Clipboard API  
**Does not reopen:** `TextQuoteSelector` schema definition (already present in `SerializedRange`); Event sourcing append-only store; V2 Editorial design tokens; Popup chrome ownership; Mode storage boundaries  
**Related:** Highlight tile editor UX PRD (2026-07-14); Markdown export formatter (`src/shared/highlight-export/format-markdown.ts`); Anchor drift PRD (2026-09-03)  
**Test seams:** Pure `buildTextFragmentUrl` generator; `HighlightCard` / `LibraryHighlightTile` action row copy handlers; Markdown export `[source]` line generator (see Testing Decisions)

---

## Problem Statement

When I save an insightful highlight on the web, I frequently want to share that exact passage with a colleague or reference it in an external document. Today, sharing a quote creates friction:

1. **Vague Source Links:** Copying or exporting a highlight gives me a raw page URL (e.g., `https://example.com/long-article`). When the recipient opens the link, they are dropped at the top of a 5,000-word article and forced to manually `Ctrl+F` scan for the quote.
2. **Recipient Barrier:** Many web highlighters require the recipient to also have an extension installed or an account created to see shared marks. This creates a wall that makes sharing highlights outside the tool impractical.
3. **Loss of Location Fidelity in Exports:** In the Markdown and XLSX exports, highlights provide `[source] <url>` as the citation. Navigating to the source requires reading through the whole document to locate the original context.

The W3C Scroll-to-Text Fragment standard (`#:~:text=`) natively solves this across Chromium and WebKit browsers without requiring any third-party software on the recipient's machine. `_underscore` already captures `exact`, `prefix`, and `suffix` in its `TextQuoteSelector`, but currently does not expose standard text fragment links to the user.

---

## Solution

1. **Pure W3C Text Fragment Generator:**  
   Implement a lightweight, standalone utility function that takes a base URL and a `TextQuoteSelector` (or raw text quote) and formats a standard Scroll-to-Text Fragment URL:  
   `https://example.com/article#:~:text=prefix-,exact,-suffix`  
   Properly handling character escaping for commas, hyphens, and ampersands per the W3C specification.

2. **1-Click "Copy Quote Link" Action:**  
   - Add a discreet **Copy Quote Link** action button to the action row in both `HighlightCard` (popup and web) and `LibraryHighlightTile`.
   - Clicking copies the direct fragment URL to the system clipboard and displays a brief confirmation feedback (`Copied link`).
   - Anyone opening the link in Chrome, Edge, Brave, or Safari is scrolled automatically to the exact passage with native browser highlighting, even if they do not have `_underscore` installed.

3. **Enriched Markdown Export Citations:**  
   - Update `format-markdown.ts` so that `[source] <url>` uses the text fragment URL whenever a valid selector or quote text is available.
   - When notes are exported to Obsidian, Logseq, or markdown files, clicking the source citation jumps directly to the quote in the browser.

4. **Lean Implementation Constraint:**  
   - No backend shorteners or redirection services.
   - No database schema migrations (reuses existing `range.selector` or `text`).
   - Less than 60 lines of pure tested code plus UI button wiring.

---

## User Stories

### URL Generation & Standards Compliance
1. As a user, I want generated quote links to adhere to the W3C Scroll-to-Text Fragment standard, so that links work natively across standard web browsers without any extension required.
2. As a user, I want the generator to include `prefix` and `suffix` when available, so that the browser can uniquely locate the quote on pages with repeated phrases.
3. As a user, I want special syntax characters like `-`, `,`, and `&` inside the quote text to be safely percent-encoded, so that the fragment parser in the browser does not break.
4. As a user with a long highlight (e.g. >200 characters), I want the generator to use `textStart,textEnd` range notation, so that the generated URL remains concise and below maximum URL length thresholds.
5. As a user on a URL that already contains an anchor hash (e.g. `https://example.com/post#section`), I want the text fragment directive to append with `#:~:text=` preserving the existing anchor, so that existing page anchors are not corrupted.
6. As a user whose highlight only has raw `text` without `prefix` or `suffix`, I want the generator to fall back to encoding the raw text, so that older highlights still generate valid links.

### Extension Popup & Web Library UI
7. As an extension user viewing a highlight card in the popup, I want a `Copy quote link` button in the action row, so that I can copy the direct URL in one click.
8. As a web library user viewing a highlight tile or card, I want a `Copy quote link` button in the action row, so that I can copy direct links from the web app.
9. As a user clicking `Copy quote link`, I want clear visual confirmation (e.g. `Copied link` label or checkmark for 2 seconds), so that I know the clipboard operation succeeded.
10. As a user clicking `Copy quote link`, if clipboard permissions fail, I want a graceful non-blocking fallback or error message, so that the app does not crash.
11. As a user, I want the button styled with standard design tokens (`var(--rule)`, `var(--ink-muted)`), so that it matches the V2 Editorial design aesthetic.
12. As a keyboard user, I want the `Copy quote link` action to be focusable and activatable via `Enter` or `Space`, so that the feature is fully accessible.
13. As a screen-reader user, I want the button to have an explicit `aria-label="Copy direct link to highlighted quote"`, so that the action is understandable without visual context.

### Markdown & External Exports
14. As a user exporting highlights to Markdown, I want the `[source]` annotation to contain the direct text fragment link, so that following citations from my notes lands directly on the quote.
15. As an Obsidian/Logseq user reading exported notes, I want clicking the source link to open the browser and immediately highlight the text, so that I don't have to search within the page.
16. As a user copying an individual highlight as markdown, I want the copied text citation to also use the text fragment link, so that ad-hoc sharing carries deep-linking.

### Recipient Experience (Zero-Friction)
17. As a recipient who does not have `_underscore` installed, I want opening a shared link to take me directly to the cited text, so that I don't have to install any software or register.
18. As a recipient on a browser that does not support text fragments (e.g. legacy browsers), I want the page to load normally at the base URL, so that the link is never broken.

---

## Implementation Decisions

1. **Pure Formatter Location & Signature:**  
   Create a dedicated, zero-dependency pure utility:
   ```typescript
   export interface TextFragmentOptions {
     prefix?: string;
     suffix?: string;
     exact: string;
     maxExactLength?: number; // default: 150 chars before switching to textStart,textEnd
   }

   export function buildTextFragmentDirective(options: TextFragmentOptions): string;
   export function buildTextFragmentUrl(baseUrl: string, options: TextFragmentOptions): string;
   ```

2. **Escaping & Truncation Rules:**  
   - W3C requires escaping: `-` -> `%2D`, `,` -> `%2C`, `&` -> `%26`.
   - Standard `encodeURIComponent` handles spaces (`%20`), quotes, and non-ASCII Unicode characters.
   - For long quotes (>150 chars), extract `textStart` (first ~60 chars, trimmed to word boundary) and `textEnd` (last ~60 chars, trimmed to word boundary) to construct `textStart,textEnd`.

3. **UI Integration Contract:**  
   - In `src/ui-system/components/primitives/HighlightCard.tsx` and `src/features/collections/components/LibraryHighlightTile.tsx`:
     - Extract `selector` from `highlight.range?.selector`.
     - Compute URL via `buildTextFragmentUrl(highlight.url, { exact: highlight.text, prefix: selector?.prefix, suffix: selector?.suffix })`.
     - Wire to clipboard write (`navigator.clipboard.writeText(url)`).
     - Maintain existing transient "Copied" toast / state pattern.

4. **Export Formatter Contract:**  
   - In `src/shared/highlight-export/format-markdown.ts`:
     - Update `formatSourceAnnotation(url: string, highlight?: ExportableHighlight): string`.
     - When `highlight` text or selector is available, append the fragment directive to `url`.
     - Fall back to clean `url` if text is empty or invalid.

5. **No Schema or Database Changes:**  
   - No modifications to database tables, IndexedDB stores, or sync events.
   - Operates purely as a presentation and serialization transformation.

---

## Testing Decisions

- **Focus on External Behavior:**  
  Verify standard-compliant URL outputs across varied text inputs (punctuation, long quotes, foreign languages, existing hash fragments).
- **Unit Tests:**  
  - Standard quote with prefix and suffix: verifies `#:~:text=prefix-,exact,-suffix` syntax.
  - Special character escaping: verifies `-`, `,`, and `&` are properly converted to `%2D`, `%2C`, and `%26`.
  - Long quote truncation: verifies quotes exceeding length threshold produce `textStart,textEnd` format.
  - Base URL with existing `#anchor`: verifies result preserves anchor and appends `#:~:text=`.
  - Unicode text: verifies international character sets (e.g. CJK, accented letters) are encoded correctly.
  - Markdown export output: verifies `[source] ...` line contains the generated text fragment URL.
- **Component Tests:**  
  - `HighlightCard` copy action: verifies clicking invokes clipboard write with expected URL and shows confirmation state.
- **Prior Art:**  
  - `tests/unit/shared/highlight-export/format-markdown.test.ts`
  - `tests/unit/shared/utils/normalize-page-url.test.ts`

---

## Out of Scope

- Custom URL shortener or redirect proxy servers.
- Automatic link unfurling or rich OpenGraph image generation for links.
- Mutating DOM or listening for text fragment navigation inside `_underscore` content scripts (the browser handles this natively).

---

## Further Notes

- This is the highest ROI, lowest risk feature possible for `_underscore`: it turns every highlight into an immediately shareable, deeply linked citation across the open web with ~50 lines of pure code.
