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

- ❌ **Never** use hardcoded colors (no `#3B82F6`)
- ❌ **Never** skip hover/focus states
- ❌ **Never** complete UI work without Storybook verification
- ✅ **Always** document token mapping before coding
- ✅ **Always** test in both light and dark mode
- ✅ **Always** ensure keyboard accessibility

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
- `/design-audit` - Audit existing components for issues
- `/ui-preflight` - Pre-flight checklist (auto-triggered)
- `/ui-prompting-guide` - Reference for writing good prompts
