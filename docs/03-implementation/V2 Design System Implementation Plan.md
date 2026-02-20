# V2 Design System Implementation Plan

## Goal
Apply the finalized Style C Hybrid visual direction across all 8 pages and implement in React, using MD3 tokens re-seeded from Style C's accent `#5b8db9`.

## Completed
- **Phase 0**: Cleaned [global.css](file:///home/sandy/projects/_underscore/src/ui-system/theme/global.css) (~131 lines removed), updated [design-system.md](file:///home/sandy/projects/_underscore/.agent/workflows/design-system.md) with Style C palette
- **Phase 1-2**: Created workflows, explored 3 styles, user approved Style C Hybrid

## Next: Phase 3 — Page Mockups

Build one HTML file per page in `docs/07-design/v2/pages/`, copying the CSS variable block from [style-c-hybrid.html](file:///home/sandy/projects/_underscore/docs/07-design/v2/style-options/style-c-hybrid.html):

1. `welcome.html` — Full-screen centered logo + "Get Started" CTA
2. `sign-in.html` — Centered card with Google OAuth button
3. `mode-selection.html` — Refined version of current prototype
4. `collections.html` — Domain-grouped list with favicons
5. `domain-details.html` — Chronological item list with stats header
6. `settings.html` — Grouped toggle sections
7. `privacy.html` — Clean typography static page
8. `404.html` — Minimal centered message

## Phase 4 — Overlays
- Account Menu dropdown (glassmorphic floating panel)
- Sign Out confirmation modal

## Phase 5 — React Implementation
1. Map Style C semantic vars to MD3 roles in [tailwind.config.ts](file:///home/sandy/projects/_underscore/tailwind.config.ts)
2. Rebuild primitives ([Logo](file:///home/sandy/projects/_underscore/src/ui-system/components/primitives/Logo.tsx#9-27), [Card](file:///home/sandy/projects/_underscore/src/ui-system/components/primitives/Card.tsx#10-14), [Button](file:///home/sandy/projects/_underscore/src/ui-system/components/primitives/Button.tsx#15-20)) with new tokens
3. Build composed components (`ModeCard`, `Header`)
4. Wire up views

## Verification
- `npx tsc --noEmit` after each phase
- Visual comparison: browser screenshot vs HTML prototype
- Light + dark mode toggle check on every page
