# PRD: Phone and Tablet Consume (Web v0, Flutter later)

**Date**: 2026-09-20  
**Status**: Accepted  
**ADR**: [ADR-031](../../04-adrs/031-mobile-consume-clients.md)

---

## Problem

Account users cannot honestly review their cloud library on a phone or tablet.
The web shell cliffs at 820px (iPad lottery), unsigned handhelds can see an
empty guest vault, `trackEvent` has no sink, and there is no store client.

Capture on mobile is **not** the problem this PRD solves.

## Goals

1. Make the **existing web app** a usable consume surface on phone and tablet.
2. Measure authenticated handheld library use.
3. After that evidence, ship a **Flutter** Play-first client with the same job.

## Non-goals

- In-page highlight, in-app browser, Safari/Android extensions
- Guest/`basic` library on phone or tablet
- PWA, Capacitor, React Native
- MCP / Integrations setup on handheld
- Vault folder mirror on handheld
- Push, widgets, Watch, Share extension
- Ask/Chat (retired, ADR-030)
- Flutter repo before the kill test
- Pixel-port of the 400x600 popup
- New visual language

## Users

Signed-in Account (`pro` / `pro_xai`). Desktop guest unchanged.

## v0 requirements (web)

1. Phone IA: `max-width: 767px` tabbar Home / Library / Settings.
2. Tablet/desktop IA: `min-width: 768px` sidebar + two-pane library.
3. `phone` and `tablet` unsigned: sign-in wall (not an empty guest library).
4. `phone` and `tablet` signed-in: read-only cards (no note/tag/delete/export).
5. Settings on handheld: hide Integrations and Data/vault.
6. Open highlight source: text-fragment URL, new tab.
7. Analytics sink with `library_open`, `highlight_open_source`, `library_search`
   and `client`. No quote text, no raw query string.
8. Auth: existing Google PKCE. No Sign in with Apple until a store binary.

## Kill test

At least one week of authenticated `library_open` from `client=phone` or
`client=tablet`, reviewed by product. Until then: no `apps/mobile/`.

## Later Flutter (gated)

One Dart codebase. Play first; iOS compiles, not submitted. Consume-only
subset. OD Flutter HTML is visual/IA inspiration only.

## Success

v0: handheld sign-in works; library is readable; source opens with a fragment;
events arrive at `/api/analytics`; desktop guest and capture unchanged.

Flutter: same job in a Play build after the freeze lifts.

## Out of scope for both phases

Mobile capture, guest sync, MCP, vault, Ask, push/share.
