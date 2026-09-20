# PRD: Web app without extension (soft notice)

**Status:** Implemented (TDD slices 1–6)  
**Date:** 2026-09-19  
**Triage:** in progress  
**Source of truth:** Grilling 2026-09-19 (Q1–Q14 locked).  
**Supersedes:** `2026-08-23-install-hard-gate-single-browser-prd.md` on the **guest route hard gate** and “no Continue without installing.” Single-browser download UI on Welcome is unchanged.

---

## Problem

The web app hard-gated guests on an extension ping, so a viewer (especially signed-in on a large screen) could not open the library without installing. Capture still requires the extension; that fact must stay unmissable without blocking the library.

## Contract

- Web = library (view, organise, settings).
- Extension = capture on other pages.
- Product routes (`/home`, `/library`, `/settings`) open with or without the extension.
- Guest web library remains empty until sign-in (guest captures stay in extension storage).

## Behaviour

1. **Welcome** Get started still opens why + install. **Continue without installing** → `/home` (or safe `from`). **Already set up** → `/home` with no ping lock. **I’ve installed it — check** is verify after sideload, not a lock.
2. **`/install`** stays the canonical hub (Welcome-gate alias). Strip, remnant, and empty-state Install go here. Continue returns to `from` or `/home`.
3. **Desktop, extension missing:** shell strip above the workspace on every product route. Hide collapses to a sidebar-foot remnant (`Install extension` → `/install`) until ping = installed. Collapse persists in this browser.
4. **Guest + installed:** one sign-in line in the shell (no stacked `GuestBanner`). Dismissible with no remnant.
5. **Unknown presence:** fail open; no install chrome until `missing` or `installed`. Re-ping on `visibilitychange`.
6. **Mobile (max-width 820px):** signed-in — no install nag. Guest + missing — honest desktop-capture + sign-in line.

## Copy (locked)

See `src/shared/copy/product-surface-copy.ts` (`extensionMissingStripCopy`, `extensionRemnantCopy`, `guestInstalledShellCopy`, `mobileGuestCaptureCopy`, `welcomeContinueWithoutCopy`).
