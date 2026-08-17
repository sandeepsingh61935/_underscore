# V2 Popup Redesign: Phase 0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the V2 design foundation by completely removing Tailwind CSS, applying the new V2 token system, and renaming all internal modes to the new `ephemeral`, `local`, `cloud`, and `ai` semantic identifiers.

**Architecture:** This is a zero-dependency CSS custom properties approach combined with a structural refactoring of the mode state machines. The work is split into Token/CSS Foundation (P0-A) and Mode Rename (P0-B).

**Tech Stack:** React, TypeScript, pure CSS variables, Zod schemas

---

## Phase 0-A: Token & CSS Foundation

### Task 1: Clean NPM Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Remove Tailwind packages**

Run this command to uninstall Tailwind and its plugins:
```bash
npm uninstall tailwindcss @tailwindcss/forms autoprefixer postcss
```

- [ ] **Step 2: Commit dependency removal**

```bash
git commit -am "chore: remove tailwindcss and related postcss dependencies"
```

### Task 2: Remove PostCSS & Tailwind Configs

**Files:**
- Delete: `tailwind.config.ts`
- Delete: `postcss.config.js`

- [ ] **Step 1: Delete configuration files**

```bash
rm tailwind.config.ts postcss.config.js
```

- [ ] **Step 2: Commit deletion**

```bash
git add -A
git commit -m "chore: delete tailwind and postcss configuration files"
```

### Task 3: Setup Google Fonts

**Files:**
- Modify: `src/entrypoints/popup/index.html`

- [ ] **Step 1: Add Google Fonts preconnect and links**

Insert these lines into the `<head>` of `index.html` before the body:
```html
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;0,8..60,600;1,8..60,400;1,8..60,500&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Commit HTML update**

```bash
git commit -am "chore: add v2 typography google fonts to popup index"
```

### Task 4: Replace Global Tokens

**Files:**
- Modify: `src/ui-system/theme/global.css`
- Reference: `ui_kits/extension/v2/tokens.css`

- [ ] **Step 1: Purge MD3 and inject V2 tokens**

Completely replace the contents of `src/ui-system/theme/global.css` with the exact contents of `ui_kits/extension/v2/tokens.css`. This deletes all `@tailwind` directives and MD3 color mappings.

```bash
cat ui_kits/extension/v2/tokens.css > src/ui-system/theme/global.css
```

- [ ] **Step 2: Commit global CSS update**

```bash
git commit -am "style: replace MD3 token system with v2 semantic css variables"
```

---

## Phase 0-B: Mode Rename

### Task 5: Update Mode Schemas

**Files:**
- Modify: `src/background/schemas/mode-state-schemas.ts`
- Modify: `src/shared/schemas/mode-state-schemas.ts` (if different or duplicate)

- [ ] **Step 1: Rename ModeTypeSchema enum**

In `mode-state-schemas.ts`, update `ModeTypeSchema`:
```typescript
export const ModeTypeSchema = z.enum(['ephemeral', 'local', 'cloud', 'ai']);
```

- [ ] **Step 2: Commit schema updates**

```bash
git commit -am "refactor(schemas): rename mode IDs to ephemeral/local/cloud/ai"
```

### Task 6: Update Mode Constants

**Files:**
- Modify: `src/content/modes/mode-constants.ts`

- [ ] **Step 1: Update MODE_NAMES and MODE_DISPLAY_NAMES**

Update `src/content/modes/mode-constants.ts` to map the new names exactly as specified in the V2 redesign:
```typescript
export const MODE_NAMES = {
    EPHEMERAL: 'ephemeral',
    LOCAL: 'local',
    CLOUD: 'cloud',
    AI: 'ai',
} as const;

export const MODE_DISPLAY_NAMES = {
    [MODE_NAMES.EPHEMERAL]: 'Ephemeral',
    [MODE_NAMES.LOCAL]: 'Local',
    [MODE_NAMES.CLOUD]: 'Cloud',
    [MODE_NAMES.AI]: 'AI',
} as const;
```

- [ ] **Step 2: Commit constants update**

```bash
git commit -am "refactor: update mode constants to match v2 architecture"
```

### Task 7: Update Mode Registry Data

**Files:**
- Modify: `src/features/modes/registry.ts`

- [ ] **Step 1: Update registerDefaults() implementation**

Update `ModeRegistry.registerDefaults()` to use the new V2 mode configuration:
```typescript
    this.register({
      id: MODE_NAMES.EPHEMERAL,
      name: 'Ephemeral',
      altName: 'Non-persistent',
      family: 'local',
      tag: '24-hour memory',
      blurb: 'Highlights live on this device and fade after 24 hours.',
      motif: '◷',
      accent: 'var(--mode-ephemeral)',
      persistence: 'auto-expires · 24h',
      signin: false,
      ttl: true,
    });
    
    this.register({
      id: MODE_NAMES.LOCAL,
      name: 'Local',
      altName: 'Persistent local',
      family: 'local',
      tag: 'This device',
      blurb: 'Saved to this browser indefinitely. You delete them.',
      motif: '▣',
      accent: 'var(--mode-local)',
      persistence: 'kept until deleted',
      signin: false,
      ttl: false,
    });
    
    this.register({
      id: MODE_NAMES.CLOUD,
      name: 'Cloud',
      altName: 'Persistent cloud',
      family: 'cloud',
      tag: 'Synced',
      blurb: 'Signed in. Synced across every device you use.',
      motif: '◇',
      accent: 'var(--mode-cloud)',
      persistence: 'synced · always',
      signin: true,
      ttl: false,
    });
    
    this.register({
      id: MODE_NAMES.AI,
      name: 'AI',
      altName: 'AI-enabled',
      family: 'cloud',
      tag: 'Readable by models',
      blurb: 'Cloud-synced and readable by LLMs you connect via MCP.',
      motif: '✦',
      accent: 'var(--mode-ai)',
      persistence: 'synced · readable by AI',
      signin: true,
      ttl: false,
    });
```
*(Ensure you update the `ModeDefinition` interface in this file to include `family`, `altName`, `tag`, `blurb`, `motif`, `accent`, `persistence`, `signin` and `ttl` properties if they do not exist, and replace `requiresAuth` with `signin` everywhere.)*

- [ ] **Step 2: Commit registry update**

```bash
git commit -am "refactor: update mode registry definitions to v2 spec"
```

### Task 8: Update Mode Transition Rules

**Files:**
- Modify: `src/content/modes/mode-transition-rules.ts`

- [ ] **Step 1: Rename keys in transitions matrix**

Update `MODE_TRANSITIONS` mapping. Replace:
- `walk` -> `ephemeral`
- `sprint` -> `local`
- `vault` -> `cloud`
- `neural` -> `ai`

Example row change:
```typescript
  [MODE_NAMES.EPHEMERAL]: {
    [MODE_NAMES.LOCAL]: { allowed: true },
    [MODE_NAMES.CLOUD]: { allowed: true, requiresConfirmation: true, reason: 'Requires authentication' },
    [MODE_NAMES.AI]: { allowed: true, requiresConfirmation: true, reason: 'Requires authentication' },
  },
```

- [ ] **Step 2: Commit transitions update**

```bash
git commit -am "refactor: update transition rules for renamed modes"
```

### Task 9: Update usePersistedMode Hook

**Files:**
- Modify: `src/ui-system/hooks/usePersistedMode.ts`

- [ ] **Step 1: Update VALID_MODES and DEFAULT_MODE**

```typescript
const VALID_MODES: ModeType[] = ['ephemeral', 'local', 'cloud', 'ai'];
const DEFAULT_MODE: ModeType = 'ephemeral';
```
Update `AUTH_REQUIRED_MODES` to include `cloud` and `ai`.

- [ ] **Step 2: Commit hook update**

```bash
git commit -am "refactor: update usePersistedMode defaults to ephemeral"
```

### Task 10: Update Content Script

**Files:**
- Modify: `src/entrypoints/content.ts`

- [ ] **Step 1: Replace hardcoded mode checks**

Search `src/entrypoints/content.ts` for `MODE_NAMES.WALK`, `MODE_NAMES.SPRINT`, `MODE_NAMES.VAULT`, and `MODE_NAMES.GEN` and replace them with their respective new constants: `MODE_NAMES.EPHEMERAL`, `MODE_NAMES.LOCAL`, `MODE_NAMES.CLOUD`, `MODE_NAMES.AI`.

- [ ] **Step 2: Commit content script update**

```bash
git commit -am "refactor(content): map legacy mode names to v2 semantic names"
```

### Task 11: Update Mode State Manager

**Files:**
- Modify: `src/content/modes/mode-state-manager.ts`

- [ ] **Step 1: Update default mode references**

If `mode-state-manager.ts` initializes state with `'walk'`, update it to `'ephemeral'`. Update any other mode string literal references.

- [ ] **Step 2: Commit state manager update**

```bash
git commit -am "refactor: update default state in mode manager to ephemeral"
```

### Task 12: Update UI Views Mode References

**Files:**
- Modify: `src/entrypoints/popup/index.tsx`
- Modify: `src/pages/SettingsPage.tsx`
- Modify: `src/features/collections/views/CollectionsView.tsx`
- Modify: `src/features/collections/views/DomainDetailsView.tsx`

- [ ] **Step 1: Replace mode strings and MODE_DISPLAY records**

In all view files above:
- Find any usage of `AUTH_REQUIRED_MODES` or `MODE_DISPLAY` objects mapping legacy names and rename keys to `ephemeral`, `local`, `cloud`, `ai`.
- In Settings, ensure `MODE_DISPLAY` maps `ephemeral: 'Ephemeral'`, `local: 'Local'`, `cloud: 'Cloud'`, `ai: 'AI'`.

- [ ] **Step 2: Commit UI mode references**

```bash
git commit -am "refactor(ui): update view components to use v2 mode keys"
```

---

## Phase 0-C: Agent Rules

### Task 13: Rewrite AI Assistant Guardrails

**Files:**
- Modify: `GEMINI.md` (file subsequently removed)
- Modify: `CLAUDE.md`

- [ ] **Step 1: Replace MD3 rules with V2 rules**

In both files, delete all rules referencing MD3, tailwind colors (`bg-blue-500`), and `shadow-elevation-*`. 
Insert the new Hard Rules from the spec:
```markdown
- **Never** use hardcoded hex colors in `.tsx` files — use `var(--paper)`, `var(--ink)`, `var(--accent)`.
- **Never** use Tailwind utility classes — Tailwind is removed.
- **Never** use MD3 tokens (`--md-sys-color-*`, `bg-primary`).
- **Never** use Inter/Roboto for display fonts — use `var(--serif)`.
- **Always** use semantic typography classes: `.u-serif`, `.u-mono`, `.u-kicker`, `.u-caps`.
- **Always** use `var(--rule)` or `var(--rule-soft)` for borders.
- **Always** reference wireframe JSX in `ui_kits/extension/v2/` as the implementation spec.
```

- [ ] **Step 2: Commit guardrails update**

```bash
git commit -am "docs: update AI guardrails to enforce pure v2 CSS rules"
```

---

## Phase 0-D: Verification

### Task 14: Archive Legacy Design Files

**Files:**
- Move: `docs/redesign/` -> `docs/archive/redesign-ink-and-glass/`
- Move: `docs/07-design/v2/style-options/` -> `docs/archive/v2-style-options/`
- Move: `docs/07-design/v2/STYLE_C_HANDOFF.md` -> `docs/archive/STYLE_C_HANDOFF.md`

- [ ] **Step 1: Move files to archive**

```bash
mkdir -p docs/archive
mv docs/redesign docs/archive/redesign-ink-and-glass
mv docs/07-design/v2/style-options docs/archive/v2-style-options
mv docs/07-design/v2/STYLE_C_HANDOFF.md docs/archive/STYLE_C_HANDOFF.md
```

- [ ] **Step 2: Commit archival**

```bash
git add -A
git commit -m "chore: archive obsolete design system documents"
```

### Task 15: Fix TypeScript Errors

- [ ] **Step 1: Run TypeScript validation**

```bash
npx tsc --noEmit
```

- [ ] **Step 2: Fix any remaining type or string literal errors related to mode names**

Look specifically for `test/` files that might still be using `'walk'` or `'sprint'`. Update them.
(Do not try to fix TS errors stemming from missing CSS class typings yet, focus solely on mode name enums.)

- [ ] **Step 3: Commit TS fixes**

```bash
git commit -am "fix: resolve remaining typescript errors for mode renaming"
```

### Task 16: Build Verification

- [ ] **Step 1: Run production build**

```bash
npm run build
```

The build must complete successfully. Tailwind removal should not break the WXT vite build process. If it does, ensure `wxt.config.ts` has no tailwind plugins configured.

- [ ] **Step 2: Final Verification Commit**

```bash
git commit --allow-empty -m "chore: phase 0 foundation verified and complete"
```
