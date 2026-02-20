# _underscore V2 Design Handoff

> **Purpose**: Complete record of this conversation's work so a new chat session can continue without losing context.

---

## 1. What We Built

### Style Exploration
Created 3 interactive HTML prototypes in `docs/07-design/v2/style-options/`:

| File | Style | Status |
|------|-------|--------|
| `style-a-minimal.html` | Ultra-minimal (Vercel/Linear) | ❌ Rejected — too bare |
| `style-b-glass.html` | Dark glassmorphism (Arc/Raycast) | ❌ Rejected — too heavy |
| `style-c-hybrid.html` | **A's canvas + B's interaction** | ✅ **Chosen & iterated** |

### Style C: Final State (after ~10 iterations)
The prototype at `style-c-hybrid.html` represents the **approved visual direction**. Here is the exact token set:

#### Light Mode (`:root`)
```css
--bg: #fafbfc;
--bg-card: #ffffff;
--bg-card-hover: #ffffff;
--text-primary: #0f1419;
--text-secondary: #536471;
--text-tertiary: #8b98a5;
--accent: #5b8db9;
--accent-soft: rgba(91, 141, 185, 0.08);
--accent-text: #4a7da8;
--border: #eef1f3;
--border-hover: #dfe3e8;
--shadow-rest: 0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.02);
--shadow-hover: 0 8px 24px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04);
--shadow-active: 0 2px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04);
--radius: 12px;
--radius-full: 9999px;
/* Logo: Dark charcoal circle, white underscore */
--logo-bg: #1a1d23;
--logo-text: #ffffff;
--logo-reflection: linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.05) 100%);
/* Mode cards */
--card-reflection: linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.0) 100%);
```

#### Dark Mode (`.dark`)
```css
--bg: #0e1015;
--bg-card: rgba(255, 255, 255, 0.04);
--bg-card-hover: rgba(255, 255, 255, 0.07);
--text-primary: #e4e7ec;
--text-secondary: #8b95a5;
--text-tertiary: #4b5563;
--accent: #6da3cc;
--accent-text: #93bbda;
--border: rgba(255, 255, 255, 0.06);
/* Logo: Pearl white circle, black underscore (inverted from light) */
--logo-bg: #f8f9fa;
--logo-text: #111827;
--logo-inner-shadow: inset 0 2px 4px rgba(255,255,255,1), inset 0 -2px 6px rgba(0,0,0,0.15);
--logo-reflection: linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.0) 100%);
/* Mode cards */
--card-reflection: linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.0) 100%);
```

#### Interaction Patterns
- **Mode cards at rest**: Subtle border, near-zero shadow
- **Mode cards on hover**: `translateY(-2px)`, shadow bloom, accent-color arrow `→` slides in
- **Mode cards on press**: `translateY(0) scale(0.98)`, shadow compresses
- **Locked modes**: `opacity: 0.6`, 🔒 icon, `pointer-events: none`
- **Glass reflections**: `::before` pseudo-element with top linear-gradient on both logo and cards
- **Logo in dark mode**: Gets `::after` ambient bottom reflection for 3D pearl effect

---

## 2. Critical Issues Found During Revalidation

> [!CAUTION]  
> The current codebase has **conflicting design systems** that must be resolved before implementing Style C.

### Issue 1: MD3 vs Style C Token Conflict
| What | Where | Problem |
|------|-------|---------|
| `CLAUDE.md` | Project root | Enforces MD3-only (`bg-primary`, `shadow-elevation-*`) |
| `tailwind.config.ts` | Project root | Maps only `--md-sys-color-*` tokens to Tailwind utilities |
| `global.css` | `src/ui-system/theme/` | Defines MD3 tokens (`--md-sys-color-primary: #4a6fa2`) |
| Style C prototype | `docs/07-design/v2/` | Uses completely different custom vars (`--bg`, `--accent`, `--text-primary`) |

**Style C's accent `#5b8db9` ≠ MD3 primary `#4a6fa2`**. They're close but not identical. Decision needed: adopt Style C values as the new source of truth, or adjust Style C to match MD3.

### Issue 2: Legacy Spark Realm Remnants in `global.css`
The CSS still contains:
- `hsl(var(--background))` / `hsl(var(--foreground))` on `body` (lines 306-307)
- `border-color: hsl(var(--border))` on `*` (line 295)  
- Full `.sepia` theme block with HSL variables (lines 218-251)
- `.extension-context` typography vars referencing undefined `--typography-*` tokens (lines 254-283)
- Typography utility classes (`.typography-heading-1` etc.) referencing undefined vars (lines 354-416)

These are **dead code** — the vars they reference (`--background`, `--foreground`, `--typography-heading-1`) are never defined in the current CSS.

### Issue 3: Stale Workflow Files
- `design-system.md` has `_To be defined after visual direction approval._` for colors — **now approved, needs updating**
- `design-system.md` says "No heavy MD3-style shadows" (line 71) which aligns with Style C
- Old `implementation_plan.md` in the brain dir references a previous MD3 consolidation task, not the V2 design work

---

## 3. Updated Implementation Plan

### Phase 0: Clean Slate (Do This First)
1. **Update `design-system.md`** — Fill in the color palette, shadow, and radius sections with the exact Style C values
2. **Decide token strategy**: Either:
   - **Option A**: Replace MD3 tokens with Style C tokens (simpler, matches prototypes exactly)
   - **Option B**: Re-seed MD3 from Style C's accent `#5b8db9` and map MD3 roles to Style C semantics (more systematic but more work)
3. **Clean `global.css`** — Remove all Spark Realm HSL vars, dead `.sepia` block, undefined `--typography-*` vars
4. **Update `CLAUDE.md`** — Align rules with whatever token strategy is chosen
5. **Update `tailwind.config.ts`** — Map the chosen tokens to Tailwind utilities

### Phase 3: Page Mockups (8 HTML Prototypes)
Using the Style C CSS variables, build one HTML file per page:
- [ ] Welcome (unauthenticated landing)
- [ ] Sign In (Google OAuth)
- [ ] Mode Selection (refine current `style-c-hybrid.html`)
- [ ] Collections List
- [ ] Domain Details Dashboard
- [ ] Settings
- [ ] Privacy
- [ ] 404

### Phase 4: Overlays & Components
- [ ] Account Menu dropdown (glassmorphic floating panel)
- [ ] Sign Out confirmation modal
- [ ] Dark mode variants for all pages

### Phase 5: React Implementation
1. Extract finalized tokens into `global.css` + `tailwind.config.ts`
2. Rebuild primitive components (`Logo`, `Card`, `Button`, etc.) with new tokens
3. Build composed components (`ModeCard`, `Header`, `AccountMenu`)
4. Wire up views (`ModeSelectionView`, `CollectionsView`, etc.)

---

## 4. File Reference

| File | Purpose | Status |
|------|---------|--------|
| `docs/07-design/v2/style-options/style-c-hybrid.html` | **Source of truth** for visual direction | ✅ Finalized |
| `docs/07-design/v2/style-options/style-a-minimal.html` | Style A reference | Archived |
| `docs/07-design/v2/style-options/style-b-glass.html` | Style B reference | Archived |
| `.agent/workflows/design-system.md` | Visual DNA workflow | ⚠️ Needs color palette update |
| `src/ui-system/theme/global.css` | Token definitions | ⚠️ Has legacy dead code |
| `tailwind.config.ts` | Tailwind token mappings | ⚠️ Only maps MD3, not Style C |
| `CLAUDE.md` | Agent rules | ⚠️ Enforces MD3-only, conflicts with Style C |
