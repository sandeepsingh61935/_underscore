# Git Commit Strategy - Granular Atomic Commits

**Status**: ✅ Adopted  
**Last Updated**: 2025-12-30  
**Applies To**: All development work

---

## Core Principle

**One Logical Change = One Commit**

Every commit should represent a **single, self-contained, reversible change** that can be understood in isolation.

---

## Commit Granularity Guidelines

### ✅ Good Granularity (Separate Commits)

1. **Interface Definition** - Add new interface
2. **Implementation** - Implement interface in class
3. **Refactoring** - Remove old code/methods
4. **Testing** - Add tests for new functionality
5. **Documentation** - Update docs for change
6. **Configuration** - Update config files

### ❌ Bad Granularity (Too Large)

- ❌ "Refactor entire mode system" (combine 10+ changes)
- ❌ "Add feature X with tests and docs" (bundle too much)
- ❌ "Fix bugs" (combine multiple unrelated fixes)

### ❌ Bad Granularity (Too Small)

- ❌ "Add blank line" (unless formatting-only commit)
- ❌ "Fix typo in comment" (combine with related change)
- ❌ "Update import" (include with the change that needs it)

---

## Commit Message Format

### Convention: Conventional Commits + Detailed Body

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

| Type | Purpose | Example |
|------|---------|---------|
| `feat` | New feature | `feat(modes): add IBasicMode interface` |
| `refactor` | Code restructuring | `refactor(walk-mode): implement IBasicMode` |
| `fix` | Bug fix | `fix(content): prevent null pointer in restore` |
| `docs` | Documentation only | `docs(architecture): add ISP pattern guide` |
| `test` | Add/update tests | `test(modes): add capability discovery tests` |
| `chore` | Build/tooling | `chore(deps): update TypeScript to 5.3` |
| `perf` | Performance improvement | `perf(renderer): use requestIdleCallback` |
| `style` | Formatting only | `style(content): fix ESLint warnings` |

### Scopes

- `modes`: Mode system (walk/sprint/vault/gen)
- `content`: Content script orchestrator
- `ui`: Extension UI (popup/options)
- `storage`: Storage/persistence layer
- `events`: Event system
- `architecture`: Architectural changes
- `quality`: Quality framework compliance

---

## Commit Guidelines

### 1. Subject Line (First Line)

**Rules**:
- Max 72 characters
- Imperative mood ("add", not "added" or "adds")
- No period at end
- Lowercase after type prefix

**Good**:
- ✅ `feat(modes): add segregated mode interfaces`
- ✅ `refactor(content): delegate events to mode handlers`
- ✅ `docs(adr): create ADR-003 for interface segregation`

**Bad**:
- ❌ `Added new interfaces for modes.` (past tense, period)
- ❌ `refactor: lots of changes` (vague)
- ❌ `Update files` (no type, no scope, uninformative)

### 2. Body (Optional but Recommended)

**Include**:
- **What**: What changed?
- **Why**: Why was this change needed?
- **How**: How does it work (if non-obvious)?
- **Impact**: What does this affect?

**Example**:
```
refactor(sprint-mode): implement IBasicMode interface

Sprint Mode now implements only IBasicMode instead of the fat
IHighlightMode interface, following Interface Segregation Principle.

Changes:
- Removed unused restore() method (NO-OP)
- Added capabilities property
- Added onHighlightCreated() event handler
- Added onHighlightRemoved() event handler

This reduces SprintMode from 13 methods to 10 (removed 3 NO-OPs).

Related: #ADR-003, Phase 0 Refactoring
```

### 3. Footer (Optional)

**Use For**:
- Breaking changes: `BREAKING CHANGE: IHighlightMode.restore() now optional`
- Issue references: `Closes #123`
- Related work: `Related: ADR-003, Phase 0 Refactoring`

---

## Granular Commit Examples (Phase 0 Refactoring)

### Example: Breaking Down a Large Change

**❌ Bad (One Large Commit)**:
```bash
git commit -m "refactor: update mode system for ISP compliance"
# Changes: 6 files, 300 lines
```

**✅ Good (11 Granular Commits)**:

```bash
# 1. Foundation - Interface definition
git add src/content/modes/mode-interfaces.ts
git commit -m "feat(modes): add IBasicMode interface for all modes

Defines core operations that ALL modes must implement:
- Lifecycle (onActivate, onDeactivate)
- CRUD (create, remove, get, clear)
- Event handlers (onHighlightCreated, onHighlightRemoved)
- Control (shouldRestore)

Part of Interface Segregation Principle (ISP) implementation.
Related: ADR-003"

# 2. Add persistent mode interface
git add src/content/modes/mode-interfaces.ts
git commit -m "feat(modes): add IPersistentMode interface

Defines persistence operations for Vault/Gen modes only:
- restore(), saveToStorage(), loadFromStorage()
- updateHighlight() for tags/colors

Walk/Sprint modes don't implement this (no cross-session persistence).
Related: ADR-003"

# 3. Add collaborative mode interface
git add src/content/modes/mode-interfaces.ts
git commit -m "feat(modes): add ICollaborativeMode interface

Defines sync operations for Vault/Gen modes only:
- syncToCloud(), resolveConflicts(), getSyncStatus()

Walk/Sprint modes don't sync (local-only).
Related: ADR-003"

# 4. Add AI mode interface
git add src/content/modes/mode-interfaces.ts
git commit -m "feat(modes): add IAIMode interface

Defines AI operations for Gen mode only:
- generateMindmap(), generateSummary(), generateQuestions()

Only Gen Mode implements this (AI features).
Related: ADR-003"

# 5. Add capability discovery
git add src/content/modes/mode-interfaces.ts
git commit -m "feat(modes): add ModeCapabilities for feature discovery

Enables runtime feature detection:
- UI can query mode.capabilities.export
- Backend can enforce quotas
- Self-documenting (modes declare features)

Supports 9 capability flags: persistence, undo, sync, collections,
tags, export, ai, search, multiSelector.
Related: Mode Capability Discovery Pattern"

# 6. Update Walk Mode to implement IBasicMode
git add src/content/modes/walk-mode.ts
git commit -m "refactor(walk-mode): implement IBasicMode interface

Walk Mode now implements only IBasicMode (10 methods) instead of
IHighlightMode (13 methods with NO-OPs).

Changes:
- Implement IBasicMode explicitly
- Add capabilities (all false except basic operations)
- Add onHighlightCreated() - NO-OP (ephemeral)
- Add onHighlightRemoved() - NO-OP (ephemeral)
- Add shouldRestore() - returns false

Removed: abstract restore() requirement (not needed for Walk Mode)
Related: ADR-003, ISP compliance"

# 7. Update Sprint Mode to implement IBasicMode
git add src/content/modes/sprint-mode.ts
git commit -m "refactor(sprint-mode): implement IBasicMode interface

Sprint Mode now implements only IBasicMode (10 methods).

Changes:
- Implement IBasicMode explicitly
- Add capabilities (undo=true, others=false)
- Add onHighlightCreated() - persists to event sourcing
- Add onHighlightRemoved() - persists removal event
- Add shouldRestore() - returns true

Encapsulates persistence logic (was in content.ts).
Related: ADR-003, ISP + SRP compliance"

# 8. Remove abstract restore() from base class
git add src/content/modes/base-highlight-mode.ts
git commit -m "refactor(base-mode): remove abstract restore() method

BaseHighlightMode no longer requires restore() method, as only
IPersistentMode modes (Vault/Gen) need it.

This allows Walk/Sprint to avoid NO-OP implementations.
Related: ADR-003, ISP compliance"

# 9. Update IHighlightMode for backward compatibility
git add src/content/modes/highlight-mode.interface.ts
git commit -m "refactor(modes): make IHighlightMode extend IBasicMode

IHighlightMode now extends IBasicMode for backward compatibility
during Phase 0 transition.

Changes:
- IHighlightMode extends IBasicMode
- restore() made optional (restore?:)
- Added deprecation notice

Will be removed in v2.0.
Related: ADR-003"

# 10. Update ModeManager to handle optional restore
git add src/content/modes/mode-manager.ts
git commit -m "refactor(mode-manager): handle optional restore() method

ModeManager.restore() now checks if mode.restore exists before calling,
since IBasicMode modes don't have this method.

Prevents 'Cannot invoke undefined' TypeScript error.
Related: ISP compliance"

# 11. Remove mode conditionals from content.ts (SRP)
git add src/entrypoints/content.ts
git commit -m "refactor(content): delegate events to mode handlers

Removed all mode-specific conditionals from orchestrator (SRP compliance).

Before: 4 instances of 'if (mode === walk)' scattered in content.ts
After: Clean delegation to mode.onHighlightCreated(event)

Changes:
- Delegate HIGHLIGHT_CREATED to mode.onHighlightCreated()
- Delegate HIGHLIGHT_REMOVED to mode.onHighlightRemoved()
- Use mode.shouldRestore() for restoration logic

Orchestrator now has ZERO knowledge of mode-specific behavior.
Related: ADR-003, SRP compliance"

# 12. Add Phase 0 documentation
git add docs/04-adrs/003-interface-segregation-multi-mode.md
git commit -m "docs(adr): create ADR-003 for interface segregation

Documents the decision to segregate IHighlightMode into focused
interfaces (IBasicMode, IPersistentMode, ICollaborativeMode, IAIMode).

Includes:
- Context and problem statement
- Decision rationale
- Consequences analysis
- Alternatives considered
- Implementation verification

Related: Phase 0 Refactoring"

# 13. Add architecture pattern documentation
git add docs/02-architecture/mode_interface_segregation_pattern.md
git commit -m "docs(architecture): add ISP pattern reference

Comprehensive guide on interface segregation pattern:
- Interface definitions
- Mode capability matrix
- Implementation examples (Walk/Sprint/Vault/Gen)
- Design patterns used
- Benefits and migration guide

Related: ADR-003, Phase 0 Refactoring"

# 14. Add capability discovery pattern
git add docs/05-quality-framework/04-mode-capability-discovery-pattern.md
git commit -m "docs(patterns): add mode capability discovery pattern

Documents the feature detection pattern using ModeCapabilities
interface.

Covers:
- Intent and problem statement
- Solution and structure
- UI adaptation examples
- Backend quota enforcement
- Testing strategies

Related: Phase 0 Refactoring"

# 15. Add documentation index
git add docs/02-architecture/phase0_refactoring_index.md
git commit -m "docs(architecture): add Phase 0 refactoring index

Central index for all Phase 0 documentation with quick links,
file changes summary, and reading paths.

Related: Phase 0 Refactoring"

# 16. Update quality framework README
git add docs/05-quality-framework/README.md
git commit -m "docs(quality): reference Phase 0 refactoring

Updated quality framework README to include:
- New Mode Capability Discovery Pattern
- Reference to ISP implementation
- Links to Phase 0 documentation

Related: Phase 0 Refactoring"
```

**Total**: 16 granular commits tracking the complete development history

---

## Benefits of Granular Commits

### 1. **Easy Code Review**
- Reviewers see one logical change at a time
- Easier to spot issues
- Can approve incrementally

### 2. **Better Git History**
```bash
git log --oneline
```
Shows clear progression:
```
abc1234 docs(quality): reference Phase 0 refactoring
def5678 docs(architecture): add Phase 0 refactoring index
ghi9012 docs(patterns): add mode capability discovery pattern
...
```

### 3. **Surgical Reverts**
```bash
# Revert just the capability discovery, keep everything else
git revert def5678
```

### 4. **Bisect Debugging**
```bash
# Find which specific commit introduced a bug
git bisect start
git bisect bad HEAD
git bisect good v1.0
# Git will check each granular commit
```

### 5. **Cherry-Pick Features**
```bash
# Port just the capability discovery to another branch
git cherry-pick ghi9012
```

---

## Commit Checklist

Before committing, verify:

- [ ] **Single logical change**: Does this commit do ONE thing?
- [ ] **Builds successfully**: `npm run type-check` passes
- [ ] **Self-contained**: Can this commit be understood without context?
- [ ] **Reversible**: Can this be cleanly reverted?
- [ ] **Descriptive**: Does the message explain WHAT and WHY?
- [ ] **Follows convention**: `type(scope): subject` format?
- [ ] **Subject < 72 chars**: Fits in one line?
- [ ] **Body if needed**: Complex change explained?

---

## Anti-Patterns to Avoid

### ❌ "WIP" Commits
```bash
git commit -m "WIP"
git commit -m "still working"
git commit -m "almost done"
```
**Instead**: Work in a branch, squash before merging, OR make proper commits

### ❌ "Fix Previous Commit" Commits
```bash
git commit -m "feat: add feature X"
git commit -m "fix: actually add feature X"
git commit -m "fix: linting errors from feature X"
```
**Instead**: Use `git commit --amend` or `git rebase -i` to fix the original commit

### ❌ Large Batch Commits
```bash
git add .
git commit -m "refactor: lots of stuff"
```
**Instead**: Stage files individually, commit incrementally

---

## Tools and Workflow

### Interactive Staging
```bash
# Stage parts of a file
git add -p src/content/modes/walk-mode.ts

# Review what's staged
git diff --staged

# Commit just what's staged
git commit
```

### Amending Last Commit
```bash
# Fix typo in last commit (not pushed yet)
git commit --amend

# Add forgotten file to last commit
git add forgotten-file.ts
git commit --amend --no-edit
```

### Interactive Rebase (Clean Up Before Push)
```bash
# Clean up last 5 commits before pushing
git rebase -i HEAD~5

# Options:
# pick = keep commit
# reword = change message
# squash = merge with previous
# fixup = merge, discard message
# drop = remove commit
```

---

## Example Workflow

```bash
# 1. Start work
git checkout -b feature/phase0-refactoring

# 2. Create interface
# ... edit mode-interfaces.ts ...
git add src/content/modes/mode-interfaces.ts
git commit -m "feat(modes): add IBasicMode interface"

# 3. Implement in WalkMode
# ... edit walk-mode.ts ...
git add src/content/modes/walk-mode.ts
git commit -m "refactor(walk-mode): implement IBasicMode"

# 4. Implement in SprintMode
# ... edit sprint-mode.ts ...
git add src/content/modes/sprint-mode.ts
git commit -m "refactor(sprint-mode): implement IBasicMode"

# 5. Refactor orchestrator
# ... edit content.ts ...
git add src/entrypoints/content.ts
git commit -m "refactor(content): delegate to mode handlers"

# 6. Add documentation
git add docs/04-adrs/003-*.md
git commit -m "docs(adr): create ADR-003"

# 7. Verify
npm run type-check
npm run build

# 8. Review history
git log --oneline

# 9. Push
git push origin feature/phase0-refactoring
```

---

## References

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Best Practices](https://git-scm.com/book/en/v2/Distributed-Git-Contributing-to-a-Project)
- [Atomic Commits](https://www.freshconsulting.com/insights/blog/atomic-commits/)

---

**Adopted**: 2025-12-30  
**Applies To**: All development work  
**Review**: Every 6 months
