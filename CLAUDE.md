# _underscore Project Rules

## UI Development Rules

When working on ANY UI code (components, views, styles), you MUST:

1. **Read the pre-flight checklist first**: `.agent/workflows/ui-preflight.md`
2. **Follow MD3 workflow**: `.agent/workflows/md3-ui.md`
3. **Reference design tokens**: `.agent/workflows/md3-tokens-reference.md`

### Automatic Triggers

| If working on... | Then follow... |
|------------------|----------------|
| New component | `/md3-ui` workflow |
| Fixing UI | `/design-audit` workflow |
| Any UI changes | `/ui-preflight` checklist |

### Non-Negotiables

- ❌ **Never** use hardcoded colors (no `#3B82F6`, no `bg-blue-500`)
- ❌ **Never** skip hover/focus/active states
- ❌ **Never** use Tailwind default shadows (no `shadow-md`) — use `shadow-elevation-*`
- ❌ **Never** omit MD3 motion — always specify `ease-standard duration-short`
- ❌ **Never** complete UI work without Storybook verification
- ✅ **Always** use MD3 semantic tokens (`bg-primary`, NOT `bg-[#4a6fa2]`)
- ✅ **Always** use `color-mix()` state layers for hover (8%) and press (12%)
- ✅ **Always** test in both light and dark mode
- ✅ **Always** ensure keyboard accessibility
- ✅ **Always** use ≥ 48px touch targets

### Design System: Material Design 3

This project uses **Material Design 3** as the single design system.
- Colors: MD3 semantic roles (`--md-sys-color-primary`, `--md-sys-color-surface`, etc.)
- Typography: MD3 type scale (display, headline, title, body, label)
- Motion: MD3 easings (standard, emphasized, decelerate, accelerate)
- Shapes: MD3 corner tokens (4px → 28px → 9999px)
- Elevation: MD3 5-level shadow system
- State layers: 8% hover, 12% focus/press, 38% disabled

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

- `/md3-ui` - Full MD3 component creation workflow
- `/ui-preflight` - Pre-flight checklist (auto-triggered for any UI work)
- `/md3-tokens-reference` - Token reference (single source of truth)
- `/design-audit` - Audit existing components for issues
- `/ui-prompting-guide` - Reference for writing good prompts
