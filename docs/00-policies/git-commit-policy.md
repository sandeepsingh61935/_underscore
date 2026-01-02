# Git Commit Policy: Ultra-Granular Strategy

**Status:** 🛡️ Mandatory  
**Domain:** Development Workflow / Version Control  
**Version:** 1.0.0  
**Effective Date:** January 2, 2026

---

## 1. Core Principle: "One Logic = One Commit"

The project follows an **Ultra-Granular Commit Strategy**. This approach prioritizes maximum traceability, ease of debugging, and surgical revert capabilities over a compact commit history.

### 1.1 Key Commandments

1.  **Atomic Logic**: Every commit MUST represent exactly one logical change.
2.  **File Separation**: If a logical change spans multiple files, consider if it can be split further. Prefer one commit per file unless the changes are physically and logically inseparable.
3.  **No Mixed Concerns**: Never mix refactors with feature work, or bug fixes with documentation, in a single commit.
4.  **No "Megacommit"**: Even small sub-tasks must be committed individually. 

---

## 2. Rationale

### why Ultra-Granular?
- **Traceability**: `git blame` should point to a specific, minimal change that explains *why* a line exists.
- **Experimental Safety**: Features can be "unpicked" commit-by-commit without affecting sibling logic.
- **Review Speed**: Smaller diffs are reviewed significantly faster and with higher accuracy.
- **Bug Isolation**: `git bisect` becomes exponentially more powerful when each commit is small.

---

## 3. Implementation Workflow

### 3.1 The Commit Pipeline
1.  **Stage Surgically**: Use `git add -p` or stage specific files to ensure only the target logic is captured.
2.  **Validate**: Ensure the code builds and passes relevant tests at *each* commit (where feasible).
3.  **Describe**: Use concise but descriptive commit messages that specify the scope.

### 3.2 Granularity Spectrum
| Area | Strategy | Example Message |
| :--- | :--- | :--- |
| **Interfaces** | Separate commit for the definition. | `feat(modes): add DeletionConfig to highlight mode interface` |
| **Implementation** | One commit per class/module. | `fix(sprint-mode): implement TTL enforcement` |
| **Styles** | Separate commit for CSS/Style tokens. | `feat(ui): add Material Design 3 styles for overlay` |
| **Infra/DI** | Separate commit for wiring/registrations. | `fix(di): migrate modes to RepositoryFacade` |
| **Documentation** | Separate commit for each doc file or update. | `docs(arch): document delete icon architecture` |

---

## 4. Anti-Patterns (Forbidden)

- ❌ **The "Batch" Commit**: `git add . && git commit -m "updated phase 4"`
- ❌ **The "Mixed Bag"**: Fixes a bug AND updates a README in one commit.
- ❌ **The "Shadow Fix"**: Including a small bug fix inside a larger refactor commit.
- ❌ **The "Code Dump"**: Committing multiple new files together because they "belong to the same feature".

---

## 5. Enforcement

AI Agents and human contributors MUST adhere to this strategy for all Phase-level reconciliations. If a contributor realizes they have a large uncommitted work tree, they are expected to use `git reset` (soft) and re-commit granularly rather than pushing a large batch.

---
**Finnish Design Philsophy Applied**: *Simplicity, functionality, and everything in its right place.*
