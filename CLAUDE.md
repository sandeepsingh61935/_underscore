# _underscore — Project Rules

## Project Overview

- **What**: Chrome Extension + Web App for intelligent web highlighting
- **Modes**: Walk (ephemeral) → Sprint (4hr TTL) → Vault (permanent) → Gen (AI, future)
- **Stack**: React 19, TypeScript, Tailwind v4, Supabase, Cloudflare Workers, WXT

## Architecture Quick Reference

- **Extension**: MV3 (content scripts + background service worker + popup)
- **Web App**: SPA on Cloudflare Pages + Workers API
- **Shared**: Supabase backend, event sourcing sync, common types/utils/interfaces
- **Patterns**: ISP interfaces, DI container, event bus, command pattern, repository pattern

---

## Universal Rules (All Roles)

- TypeScript strict mode; no `any` except documented escape hatches
- No hardcoded secrets — use env vars / `chrome.storage`
- Conventional commits: `type(scope): subject`
- One logical change per commit
- No emoji in code or commits (see `docs/00-policies/NO-EMOJI-POLICY.md`)
- Test before marking work complete

---

## File Structure Conventions

| What | Where |
|------|--------|
| Extension popup views (nav-coupled) | `src/entrypoints/popup/views/` |
| Feature views (vault, collections) | `src/features/<feature>/views/` |
| Page-level views (settings, welcome) | `src/pages/` |
| UI primitive atoms | `src/ui-system/components/primitives/` |
| Composed feature components | `src/features/<feature>/components/` |
| Layout wrappers | `src/ui-system/layout/` |
| App-wide shared hooks | `src/ui-system/hooks/` |
| Feature-specific hooks | `src/features/<feature>/hooks/` |
| Zustand stores | `src/features/<feature>/stores/<feature>.store.ts` |
| Global UI store | `src/core/stores/ui.store.ts` |
| Shared types/interfaces | `src/shared/types/`, `src/shared/interfaces/` |
| Shared schemas (Zod) | `src/shared/schemas/` |
| Shared utilities (pure) | `src/shared/utils/` |
| Shared services (platform-agnostic) | `src/shared/services/` |
| Background services | `src/background/services/` |
| Extension content scripts | `src/content/` |
| Web app pages (NEW) | `src/web/pages/` |
| Web app app shell (NEW) | `src/web/app/` |
| Web app components (NEW) | `src/web/components/` |
| Web app hooks (NEW) | `src/web/hooks/` |
| Cloudflare Workers API (NEW) | `src/web/api/` |
| Global CSS + design tokens | `src/ui-system/theme/global.css` |
| UI styling helpers | `src/ui-system/utils/` |

---

## UI Development Rules

When working on ANY UI code (components, views, styles), you MUST:

1. Announce: "Starting UI work on [component]. Following `/ui-preflight` checklist."
2. Read `.agent/workflows/ui-preflight.md` before coding
3. Reference wireframe JSX in `ui_kits/extension/v2/`

### Non-Negotiables

- **Never** use hardcoded hex colors in `.tsx` files — use `var(--paper)`, `var(--ink)`, `var(--accent)`.
- **Never** use Tailwind utility classes — Tailwind is removed.
- **Never** use MD3 tokens (`--md-sys-color-*`, `bg-primary`).
- **Never** use Inter/Roboto for display fonts — use `var(--serif)`.
- **Always** use semantic typography classes: `.u-serif`, `.u-mono`, `.u-kicker`, `.u-caps`.
- **Always** use `var(--rule)` or `var(--rule-soft)` for borders.
- **Always** reference wireframe JSX in `ui_kits/extension/v2/` as the implementation spec.

### Design System: V2 "Editorial"

- It is a pure CSS custom properties approach with zero Tailwind dependencies.
- You must exactly match the wireframes in `ui_kits/extension/v2/`.

**Reference**: `.agent/skills/full-stack-developer/SKILL.md` (Frontend section)
**Workflows**: `ui-preflight.md`

---

## Backend Development Rules

- All Supabase queries go through the repository pattern — never raw client in components
- Event sourcing: append-only, never mutate events
- API responses: consistent envelope `{ data, error, meta }`
- Auth: always validate JWT in Workers, never trust client
- Encryption: AES-256-GCM for sensitive local data
- Never call `chrome.runtime.sendMessage` directly in views — use hooks
- Message format: `{ type: 'MESSAGE_TYPE', payload: {}, timestamp: Date.now() }`
- Hooks shared between extension and web contexts must guard `chrome.runtime` availability before IPC; unguarded access can blank SPA pages.

**Reference**: `.agent/skills/full-stack-developer/sub-skills/backend-patterns.md`

---

## Architecture Rules

- New patterns require an ADR in `docs/04-adrs/`
- Interface segregation: modes implement only needed interfaces (ISP)
- DI container for all service instantiation (see `src/shared/di/`)
- Event bus for cross-layer communication (see `src/shared/utils/event-bus.ts`)
- No direct layer-skipping (UI must not call repository; background must not call DOM)

**Reference**: `.agent/skills/system-architect/SKILL.md`

---

## Testing Rules

- Unit tests: Vitest, 80%+ coverage target for services/repositories
- E2E: Playwright for critical user flows
- Every new primitive component: `.stories.tsx` file alongside it
- Every new service: unit test file
- Run tests before marking any task complete

**Reference**: `docs/05-quality-framework/05-testing-framework.md`

---

## Security Rules

- DOMPurify for all HTML content rendered from user/external data
- HTTPS validation on all external requests (see `src/background/api/https-validator.ts`)
- CSP enforcement: no inline scripts, no eval
- Rate limiting: auth (5 attempts/15 min), API (100 req/min)
- No secrets in source — use `chrome.storage.local` for runtime secrets

**Reference**: `docs/06-security/security-architecture.md`

---

## Git Commit Rules

Follow `docs/01-development/git-commit-strategy.md`:
- Atomic, granular commits
- One logical change per commit
- Conventional commit format: `type(scope): subject`

---

## Workflow Commands

- `/ui-preflight` — Pre-flight checklist (auto-triggered for any UI work)
- `/ui-prompting-guide` — Reference for writing good prompts

---

## Skill Triggers

| Working on... | Skill to load |
|---------------|---------------|
| UI components, views, styles | `.agent/skills/full-stack-developer/SKILL.md` (Frontend section) |
| API, services, data layer, IPC | `.agent/skills/full-stack-developer/SKILL.md` (Backend section) |
| Architecture decisions, patterns, ADRs | `.agent/skills/system-architect/SKILL.md` |
| New component | Use wireframe JSX spec |
| Web app pages, routing | `.agent/skills/full-stack-developer/sub-skills/web-app-patterns.md` |
