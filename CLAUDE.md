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

---

## UI Development Rules

When working on ANY UI code (components, views, styles), you MUST:

1. Announce: "Starting UI work on [component]. Following `/ui-preflight` checklist."
2. Read `.agent/workflows/ui-code-contracts.md` — the authoritative pattern & token contract
3. Read `.agent/workflows/ui-preflight.md` before coding
4. Follow `.agent/workflows/md3-ui.md` for new components
5. Reference `.agent/workflows/md3-tokens-reference.md` for all tokens

### Non-Negotiables

- Never use hardcoded colors (`#3B82F6`, `bg-blue-500`)
- Never skip hover/focus/active states
- Never use Tailwind default shadows — use `shadow-elevation-*`
- Never omit MD3 motion — always `ease-standard duration-short`
- Never complete UI work without Storybook verification
- Always use MD3 semantic tokens (`bg-primary`, not `bg-[#4a6fa2]`)
- Always use `color-mix()` state layers: hover 8%, press 12%
- Always test in both light and dark mode
- Always ensure keyboard accessibility
- Always use >= 48px touch targets

### Design System: Material Design 3

- Colors: MD3 semantic roles (`--md-sys-color-primary`, `--md-sys-color-surface`, etc.)
- Typography: MD3 type scale (display, headline, title, body, label)
- Motion: MD3 easings (standard, emphasized, decelerate, accelerate)
- Shapes: MD3 corner tokens (4px → 28px → 9999px)
- Elevation: MD3 5-level shadow system
- State layers: 8% hover, 12% focus/press, 38% disabled

**Reference**: `.agent/skills/full-stack-developer/SKILL.md` (Frontend section)
**Workflows**: `.agent/workflows/ui-code-contracts.md` (authoritative), `ui-preflight.md`, `md3-ui.md`, `md3-tokens-reference.md`

---

## Backend Development Rules

- All Supabase queries go through the repository pattern — never raw client in components
- Event sourcing: append-only, never mutate events
- API responses: consistent envelope `{ data, error, meta }`
- Auth: always validate JWT in Workers, never trust client
- Encryption: AES-256-GCM for sensitive local data
- Never call `chrome.runtime.sendMessage` directly in views — use hooks
- Message format: `{ type: 'MESSAGE_TYPE', payload: {}, timestamp: Date.now() }`

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

- `/md3-ui` — Full MD3 component creation workflow
- `/ui-preflight` — Pre-flight checklist (auto-triggered for any UI work)
- `/md3-tokens-reference` — Token reference (single source of truth)
- `/design-audit` — Audit existing components for issues
- `/ui-prompting-guide` — Reference for writing good prompts

---

## Skill Triggers

| Working on... | Skill to load |
|---------------|---------------|
| UI components, views, styles | `.agent/skills/full-stack-developer/SKILL.md` (Frontend section) |
| API, services, data layer, IPC | `.agent/skills/full-stack-developer/SKILL.md` (Backend section) |
| Architecture decisions, patterns, ADRs | `.agent/skills/system-architect/SKILL.md` |
| New component | Also trigger `/md3-ui` workflow |
| Fixing UI bugs | Also trigger `/design-audit` workflow |
| Web app pages, routing | `.agent/skills/full-stack-developer/sub-skills/web-app-patterns.md` |
