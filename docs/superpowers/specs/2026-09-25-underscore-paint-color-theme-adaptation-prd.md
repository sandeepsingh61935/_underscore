# Underscore Paint Color — Theme Adaptation Fix

**Status:** `ready-for-agent`
**Date:** 2026-09-25
**Author:** Sandy (via grill-me → to-prd)

---

## Problem Statement

The underscore paint stroke (the 2px line rendered beneath highlighted text) does not reliably adapt its color to the page background. Users experience three specific failures:

1. **Zoom in/out turns underscore white on dark pages.** The browser repaint caused by zoom triggers a DOM update. The shadow-host's `color: inherit` picks up a stale or incorrect inherited color, flipping the stroke from black to white even though the page background is still dark.

2. **Disabling Dark Reader leaves white underscores on white pages.** When Dark Reader is toggled off, its `data-darkreader-scheme="dark"` attribute is removed. The CSS `:host-context` rules that matched that attribute stop applying, but the inherited `color` from the parent element still resolves to white (leftover from Dark Reader's inverted text), making the underscore invisible on the now-white background.

3. **Plain pages with no theme attributes get wrong color.** Pages like gutenberg.org don't use `data-theme`, `.dark`, or any convention the CSS heuristics check. The underscore relies entirely on `color: inherit`, which may or may not match the visual background, especially after any page repaint.

All three failures stem from the same root cause: the underscore color is determined exclusively by CSS heuristics (`:host-context` selectors + `color: inherit`) that cannot reliably detect the actual computed background color of the page.

## Solution

Replace the pure-CSS color detection with a **JS-driven background luminance probe** that runs on every relayout cycle. The probe reads the actual `getComputedStyle(...).backgroundColor` from the page, computes luminance, and sets a `--underscore-color` CSS custom property on the shadow host. Paint rects consume this property via `background-color: var(--underscore-color, currentColor)`, keeping the existing CSS heuristics as a defense-in-depth fallback for the initial paint before JS runs.

Additionally, close a gap in the `MutationObserver` configuration: add Dark Reader attributes (`data-darkreader-scheme`, `data-darkreader-mode`) to the `document.body` observer (currently only on `document.documentElement`) and watch `document.body` for `<style>`/`<link>` child additions/removals (currently only on `document.head`), since Dark Reader injects styles on body too.

## User Stories

1. As a user with Dark Reader enabled, I want the underscore to appear as a light-colored line on the dark background, so that I can see my highlights clearly.
2. As a user who toggles Dark Reader off mid-session, I want the underscore to immediately switch to a dark-colored line on the now-white background, so that my highlights remain visible.
3. As a user who zooms in or out on a page, I want the underscore color to remain correct after the browser repaints the page, so that highlights don't become invisible.
4. As a user on a plain HTML page with no theme attributes (e.g., Project Gutenberg), I want the underscore to detect the actual page background and pick a contrasting color, so that highlights are always visible regardless of the page's CSS conventions.
5. As a user on a page with a dark native background (no Dark Reader), I want the underscore to appear light, so that highlights are visible without requiring any browser extension.
6. As a user on a page with a background set on `<html>` rather than `<body>`, I want the luminance detection to still work correctly, so that edge-case page layouts don't break highlight visibility.
7. As a user switching system-level dark/light mode (macOS/Windows/Linux), I want the underscore to re-evaluate and adapt its color immediately, so that my highlights stay visible after the OS theme change.
8. As a user on a page where the background is fully transparent (renders as white by browser default), I want the underscore to default to a dark color, so that it's visible on the effectively-white background.
9. As a user scrolling a long page, I want the relayout-triggered color detection to not cause jank or flicker, so that performance remains smooth.
10. As a user on a page with Dark Reader in "Filter" mode (which may not set `data-darkreader-scheme`), I want the JS-driven detection to still pick up the actual computed background, so that highlights are visible regardless of which Dark Reader mode is used.

## Implementation Decisions

### 1. Detection Method: JS Background Luminance Probe

A new private method `detectAndApplyUnderscoreColor()` is added to `RangeOverlayPainter`. It:
- Walks from `document.body` up to `document.documentElement`, reading `getComputedStyle(...).backgroundColor`.
- Uses the first non-transparent value found.
- Falls back to `#FFFFFF` if all backgrounds are transparent (browser default).
- Computes luminance using the standard formula: `L = 0.2126*R + 0.7152*G + 0.0722*B` (values normalized to 0–1).
- If `luminance < 0.5` (dark background) → sets `--underscore-color: #f5f5f5` (light stroke).
- Otherwise → sets `--underscore-color: #111111` (dark stroke).

The luminance threshold of `0.5` is consistent with the existing `isDarkColor()` utility in the codebase.

A pure helper function `detectPageLuminance()` is extracted and exported for isolated unit testing. It returns `{ hex: string, luminance: number, isDark: boolean }`.

### 2. Application: CSS Custom Property on Shadow Host

The `PAINT_SHADOW_CSS` constant is updated:
- `.underscore-paint-rect` changes from `background-color: currentColor` to `background-color: var(--underscore-color, currentColor)`.
- All existing `:host-context` rules and `color: inherit` remain as fallback for `currentColor` (defense-in-depth — if JS hasn't run yet, CSS heuristics still provide a reasonable default).

The custom property is set on `this.root` (the `#underscore-paint-root` element) via `this.root.style.setProperty('--underscore-color', color)`.

### 3. Timing: Piggyback on `relayoutAll()`

`detectAndApplyUnderscoreColor()` is called at the top of `relayoutAll()`. Since `relayoutAll()` already runs inside `requestAnimationFrame` on scroll, resize, and MutationObserver callbacks, this adds zero new scheduling overhead. The `getComputedStyle` call is a single read from `document.body` — negligible cost per relayout.

It is also called once in `ensureRoot()` to set the correct color on initial paint.

### 4. MutationObserver Gap Fix

The `ensureListeners()` method is updated:
- `document.body` observer's `attributeFilter` gains `'data-darkreader-scheme'` and `'data-darkreader-mode'`.
- `document.body` is also observed with `childList: true` to detect `<style>`/`<link>` injections by Dark Reader (mirroring the existing `document.head` observation).

### 5. No Changes to `HighlightRenderer` (Legacy Shadow DOM Path)

The `HighlightRenderer` class (which uses `surroundContents` + closed Shadow DOM) has its own `handleThemeChange` logic with a separate `MutationObserver`. This PRD does NOT modify that path — it is the legacy renderer. The `RangeOverlayPainter` is the sole active painter in Pro Mode (the primary mode).

## Testing Decisions

### What Makes a Good Test Here

Tests should verify **externally observable behavior** — the CSS custom property value on the shadow host and the presence/absence of paint rects — not internal method calls or implementation details. Tests should simulate realistic conditions (actual DOM backgrounds, attribute mutations, resize events) rather than mocking `getComputedStyle` wherever possible.

### Seam 1: `RangeOverlayPainter` Unit Tests

File: `tests/unit/content/paint/range-overlay-painter.test.ts` (existing)

New test scenarios added to the existing describe block:

| # | Scenario | Setup | Assertion |
|---|----------|-------|-----------|
| 1 | Dark bg → light underscore | `body.style.backgroundColor = 'rgb(30,30,30)'`; paint | `--underscore-color` on shadow host is `#f5f5f5` |
| 2 | Light bg → dark underscore | `body.style.backgroundColor = 'rgb(255,255,255)'`; paint | `--underscore-color` on shadow host is `#111111` |
| 3 | Transparent bg defaults to dark underscore | Leave bg transparent; paint | `--underscore-color` is `#111111` |
| 4 | Dark Reader toggle off recomputes color | Paint on dark bg with `data-darkreader-scheme="dark"` → remove attribute + set bg to white → wait rAF | `--underscore-color` flips to `#111111` |
| 5 | Resize recomputes color | Paint on dark bg → change bg to light → dispatch `resize` → wait rAF | `--underscore-color` updates to `#111111` |
| 6 | Background on `<html>` not `<body>` | Body transparent, `documentElement.style.backgroundColor = 'rgb(30,30,30)'` → paint | `--underscore-color` is `#f5f5f5` |

### Seam 2: Extracted `detectPageLuminance()` Pure Helper

Tested in isolation within the same test file or a dedicated helper test:

| # | Input | Expected |
|---|-------|----------|
| 7 | `rgb(0, 0, 0)` on body | `{ luminance: ~0, isDark: true }` |
| 8 | `rgb(255, 255, 255)` on body | `{ luminance: ~1, isDark: false }` |
| 9 | `rgb(128, 128, 128)` on body | `luminance ≈ 0.22`, `isDark: true` (sRGB linearization makes mid-gray darker than 0.5) |
| 10 | `rgba(0, 0, 0, 0)` transparent on body | Falls back to `#FFFFFF` → `isDark: false` |

### Prior Art

- Existing `range-overlay-painter.test.ts` — uses `stubRect`, `stubClientRects`, `paintScope()` helpers, and `requestAnimationFrame` waits for relayout assertions.
- Existing `theme-detector.test.ts` — mocks `getComputedStyle` and `matchMedia` for theme detection.
- Existing `highlight-renderer.test.ts` — tests Shadow DOM creation and event emission.

## Out of Scope

- **Per-highlight color detection** — Detecting background color at each individual highlight's position (for pages with mixed light/dark regions). This is a valid enhancement but adds significant complexity. The current fix targets the global page-level background, which covers 95%+ of real-world cases.
- **`HighlightRenderer` (legacy path)** — The legacy `surroundContents`-based renderer has its own theme observer. It is not the active painter and is not modified.
- **Color role tinting** — The underscore paint is intentionally single-tone (matches text color for readability). The `colorRole` parameter is preserved for API stability but does not affect on-page stroke color.
- **Animated color transitions** — Smooth CSS transitions when the underscore color changes. The 2px line is thin enough that instant color change is not jarring.
- **Mixed-background pages** — Pages where different sections have different backgrounds (e.g., dark header, white content). Would require per-range ancestor detection.

## Further Notes

- The `:host-context()` CSS pseudo-class is a Chromium-only feature (no Firefox/Safari support). Since _underscore is a Chrome extension, this is fine for now, but if cross-browser support is ever needed, the JS-driven approach becomes the sole detection method.
- Dark Reader uses multiple modes (Dynamic, Filter, Static). The `data-darkreader-scheme` attribute is set by Dynamic mode. Filter mode may not set it. The JS probe naturally handles all modes because it reads the actual computed background regardless of how Dark Reader achieves the inversion.
- The luminance formula uses the simplified version (`(0.2126*R + 0.7152*G + 0.0722*B) / 255`) rather than full sRGB linearization, which is consistent with how `isDarkColor()` in `color-utils.ts` works. For a 2px stroke, the precision difference is negligible.
