# _underscore Project Rules

## UI Development Rules

When working on ANY UI code (components, views, styles), you MUST:

1. **Read the pre-flight checklist first**: `.agent/workflows/ui-preflight.md`
2. **Follow V2 workflow**: reference wireframe JSX in `ui_kits/extension/v2/`

### Automatic Triggers

| If working on... | Then follow... |
|------------------|----------------|
| New component | wireframe JSX as implementation spec |
| Any UI changes | `/ui-preflight` checklist |

### Non-Negotiables

- ❌ **Never** use hardcoded hex colors in `.tsx` files — use `var(--paper)`, `var(--ink)`, `var(--accent)`.
- ❌ **Never** use Tailwind utility classes — Tailwind is removed.
- ❌ **Never** use MD3 tokens (`--md-sys-color-*`, `bg-primary`).
- ❌ **Never** use Inter/Roboto for display fonts — use `var(--serif)`.
- ✅ **Always** use semantic typography classes: `.u-serif`, `.u-mono`, `.u-kicker`, `.u-caps`.
- ✅ **Always** use `var(--rule)` or `var(--rule-soft)` for borders.
- ✅ **Always** reference wireframe JSX in `ui_kits/extension/v2/` as the implementation spec.

### Design System: V2 "Editorial"

This project uses **V2 Editorial** as the single design system.
- It is a pure CSS custom properties approach with zero Tailwind dependencies.
- You must exactly match the wireframes in `ui_kits/extension/v2/`.

### When Starting UI Work

Announce: "Starting UI work on [component]. Following `/ui-preflight` checklist."

Then complete all phases of the pre-flight before coding.

---

## Git Commit Rules

Follow the strategy in `docs/01-development/git-commit-strategy.md`:
- Atomic, granular commits
- One logical change per commit
- Clear commit messages

---

## Workflow Commands

Use these slash commands to trigger workflows:

- `/ui-preflight` - Pre-flight checklist (auto-triggered for any UI work)
- `/ui-prompting-guide` - Reference for writing good prompts
