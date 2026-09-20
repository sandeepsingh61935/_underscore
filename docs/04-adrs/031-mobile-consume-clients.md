# ADR-031: Phone and Tablet Consume Clients

**Status**: Accepted  
**Date**: 2026-09-20  
**Decision-makers**: Product + Engineering (grilled session)  
**Related**: [ADR-027](./027-platform-independent-llm-runtime.md), [ADR-029](./029-cloud-first-library-and-integrations.md), [ADR-030](./030-live-mode-and-capability-matrix.md)

---

## Context

Underscore capture is a Chrome MV3 content script. That surface does not exist on
iOS or Android browsers. The web app already has a Pro/cloud library, a mobile
tabbar, and W3C text-fragment links that work without the extension.

Recent feature PRDs listed native apps as out of scope. ADR-027 reserved
"future Android/Apple" only as LLM runtime adapters. Those adapters are still
not this work.

Product intent (locked in grill): let **Account** users **review** highlights on
a phone or tablet. Do not build mobile capture. Do not start a store binary
before anyone uses the web library on a handheld device.

---

## Decision

### 1. Job

Phone and tablet are **consume** clients: browse, search, copy, open the source
page. Capture stays the desktop extension. Share-sheet, push, widgets, in-app
browser, and in-page highlighting are out.

Audience: signed-in Account (`pro` / `pro_xai`) only. Guests (`basic`) are
device-local; a phone or tablet browser is a different device.

### 2. v0 is the existing web app

No PWA, no Capacitor, no Flutter repo, no Play/App Store listing in v0.

| Concern | Contract |
| --- | --- |
| IA cliff | Phone chrome at `max-width: 767px` (tabbar, single column). `min-width: 768px` uses sidebar + two-pane library. Typical iPad portrait is tablet/desktop chrome, not a giant phone. |
| Client kind | Classify `phone` / `tablet` / `desktop` from UA + coarse pointer (iPad as Macintosh + `maxTouchPoints > 1` counts as tablet). Viewport does **not** drive auth/mutation gates (landscape iPad must not become a guest vault). |
| Auth | Phone and tablet unsigned sessions hit a **sign-in wall**. Desktop guest is unchanged. Auth remains Google PKCE + durable session. |
| Mutations | Phone and tablet are **read-only**. Notes/tags/delete/export/vault stay desktop. |
| Settings | Handheld: Account, Plan, Appearance (and Keyboard if present). Integrations (MCP) and Data/vault: hidden or "desktop only". |
| Open source | Text-fragment URL (`#:~:text=`), **new tab**, `rel="noopener noreferrer"`. |
| Offline | Online-only. Do not add a second event-sourced sync client. |
| Visual | V2 Editorial. Not a new language. Not the 400x600 popup. |
| Ask/Chat | Still retired (ADR-030). No Ask tab. |

**Inspiration (not product truth):** local Open Design Flutter mock
`underscore-flutter-app-prototype.html`. Steal Editorial density, Library
search/filter, Home recent, Copy/Open, Android-first device chrome. Do **not**
steal Flutter-as-v0, Ask tab, guest, current-page capture, or Edit/Delete.

### 3. Kill test and native freeze

`trackEvent` today emits on the in-process event bus and goes nowhere.

v0 must ship a privacy-safe sink and these events (no quote text, no search
string): `library_open`, `highlight_open_source`, `library_search`, each with
`client: phone|tablet|desktop`.

**Freeze:** do not create `apps/mobile/`, Capacitor, React Native, or store
listings until product has reviewed at least one week of authenticated
`library_open` events from `phone` or `tablet`. Anecdotes do not lift the freeze.

### 4. Later store client (after the freeze)

- **Flutter**, one codebase for Android and iOS.
- Ship **Play first**. iOS must compile in CI; do not submit to App Store until
  product asks.
- Same consume-only subset as v0. Not the OD Flutter mock's Ask/guest/edit set.
- Capacitor / WebView shell: rejected.
- React Native: rejected.
- Cost accepted: Library/Home/Settings will exist in **React web and Dart**
  after the freeze lifts. Web remains the browser product and the kill-test
  surface.

ADR-027 native LLM adapters stay out of scope until a separate ADR.

---

## Consequences

### Positive

- Handheld review can ship as CSS, gates, and analytics on the web app already
  in production.
- Store tax and a second UI wait for evidence.
- Flutter-when-ready is a single mobile codebase (Android first) without
  pretending a WebView is a "native strategy."

### Negative

- After the freeze, every consume UI change is paid twice (web + Flutter).
- iPad Safari detection is heuristic (Macintosh + touches).
- Read-only handheld will surprise users who edit on desktop.

### Neutral

- Desktop guest, extension capture, MCP, and vault folder mirror are unchanged.
- Popup chrome contract is unchanged.

---

## Alternatives Considered

### Option 1: Capacitor / WebView shell of the web app

**Description**: One UI (React). Android/iOS are wrappers.

**Pros**: No double UI. Fastest store binary after the metric.

**Cons**: Still a store binary; no native capture later without a rewrite.

**Why not chosen**: Product chose Flutter for the later Android-first binary.

### Option 2: Flutter as v0

**Description**: Build `apps/mobile` now; skip web harden.

**Pros**: Feels like "we have an app."

**Cons**: Kill test cannot run. Rewrites a library nobody has used on a phone.
Reopens Ask/guest from the OD mock.

**Why not chosen**: Freeze is explicit.

### Option 3: React Native / two native UIs

**Description**: RN or KMP + platform UI.

**Pros**: Native widgets.

**Cons**: Second (or third) UI without capture. Rejected in grill.

**Why not chosen**: Flutter is the one mobile codebase.

### Option 4: Mobile capture (custom browser or Safari Web Extension)

**Description**: Highlight in an in-app browser or OS extension.

**Pros**: Real mobile product-market fit for a highlighter.

**Cons**: Different company; multi-year. Explicitly out.

**Why not chosen**: Consume-only.

---

## Implementation Notes

- v0 plan: `docs/superpowers/plans/2026-09-20-web-phone-tablet-consume.md`
- Flutter plan (gated): `docs/superpowers/plans/2026-09-20-flutter-android-consume-client.md`
- Spec: `docs/superpowers/specs/2026-09-20-phone-tablet-consume-prd.md`
- Do not add Dart under `apps/mobile/` in the v0 PR.
- Analytics: allowlist in shared code; Pages Function POST `/api/analytics`;
  client `sendBeacon`. No PII.

---

## References

- Grill session 2026-09-20 (this ADR is the decision record)
- `src/web/layout/WebAppShell.tsx` (Home / Library / Settings tabbar)
- `src/shared/utils/text-fragment.ts`
- `src/web/lib/analytics.ts`
- Open Design: `underscore-flutter-app-prototype.html`

---

## Revision History

| Date | Author | Changes |
| ---- | ------ | ------- |
| 2026-09-20 | Engineering | Accepted after grill |
