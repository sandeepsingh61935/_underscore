Parse the following input and run the issue kickoff workflow:

ARGUMENTS: $ARGUMENTS

---

## Step 1: Parse Arguments

Extract from ARGUMENTS:
- `issue` — required. Strip leading `#` if present. Can be a GitHub URL (extract number from it).
- `milestone` — required. Format: `m1`, `m2`, etc.
- `track` — required. One of: `backend`, `frontend`, `fullstack`, `uiux`, `provider`, `devops`, `docs`, `qa`, `infra`
- `slug` — optional. Short kebab-case label. If not provided, the script will auto-derive from the issue title.
- `base-ref` — optional. Defaults to `dev/P0.1`.

If any required argument is missing, stop and ask for it before proceeding.

---

## Step 2: Run the Script

Execute:

```bash
bash scripts/issue-start.sh \
  --issue <issue> \
  --milestone <milestone> \
  --track <track> \
  [--slug <slug>] \
  [--base <base-ref>]
```

The script creates the worktree using `git worktree add worktrees/wt-<issue>-<slug> -b <branch> <base-ref>`.
All worktrees are created **inside the repo** at `worktrees/wt-<issue>-<slug>` and are gitignored.

Capture and display the full script output.

If the script exits with an error, report it clearly and stop.

---

## Step 3: Read the Generated Files

After the script succeeds, read all three generated files:
- `docs/implementation-plans/issue-<n>-spec-analysis.md` — in the worktree directory
- `docs/implementation-plans/issue-<n>-analysis.md` — in the worktree directory
- `docs/implementation-plans/issue-<n>-todos.md` — in the worktree directory

The worktree path is printed by the script. Files are inside that path.

---

## Step 4: Fill the Analysis and TODOs

Using the spec-analysis.md as input, complete the two scaffold files:

### analysis.md — fill in:
- **Files to Modify**: list every file that will be touched (from the issue body)
- **Approach**: numbered step-by-step implementation plan
- **Patterns to Follow**: reference specific sections of `.agent/workflows/ui-code-contracts.md`
- **Risks / Edge Cases**: anything that needs care (dark mode, locked state, emoji policy, etc.)
- **Verification Plan**: the exact grep/eslint commands for this specific file

### todos.md — fill in:
- **Implementation Tasks**: granular ordered checklist, one item per logical change (e.g. per CSS var being replaced, per inline style being removed)
- **Commit Message**: filled with correct scope and issue number

Write the completed content back to each file using the Edit tool.

---

## Step 5: Display Summary

Show a concise summary in this format:

```
Issue #<n>: <title>
Branch:     <branch-name>
Worktree:   <path>

Files to change:
  - <file> (<N> violations)

TODOs (<count> tasks):
  1. <todo>
  2. <todo>
  ...

Verification:
  <commands to run after implementation>
```

---

## Step 6: STOP — Wait for Approval

After displaying the summary, output exactly this and do nothing else:

---

**Ready to implement?**
Review the plan files above. Reply `approve` to begin implementation, or give feedback to revise the plan first.

**DO NOT write any source code until the user explicitly replies `approve`.**
