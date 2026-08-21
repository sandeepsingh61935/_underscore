# Documentation — Single Source of Truth

This index is the entry point for all project documentation. If a document
is not reachable from here, it does not exist. Historical planning and
phase docs were purged on 2026-08-17 — they are recoverable via git
history only (`git log --all -- docs/`).

## Where Things Live (Routing)

| You want... | Location |
|---|---|
| Project policies (commits, emoji ban) | `00-policies/` |
| Development setup & workflows (auth, git, billing, AMO) | `01-development/` |
| Architectural decisions (ADRs) | `04-adrs/` |
| Coding/testing/design standards | `05-quality-framework/` |
| Security (threat model, RLS, schema) | `06-security/` |
| Feature PRDs & design specs (dated) | `superpowers/specs/` |
| Implementation plans (dated) | `superpowers/plans/` |
| Design mockups & wireframes | `mockups/` |

## Where New Documents Go

- **A decision was made** → new ADR in `04-adrs/` using `adr-template.md`,
  next sequential number. Never edit a superseded ADR — write a new one
  that references it.
- **A feature is being designed** → dated PRD/design in
  `superpowers/specs/YYYY-MM-DD-<name>.md`.
- **Work is being planned** → dated plan in
  `superpowers/plans/YYYY-MM-DD-<name>.md`.
- **A standard or rule changes** → edit the relevant file in
  `00-policies/`, `01-development/`, `05-quality-framework/`, or
  `06-security/` in place. These folders are always current.

## Architecture

There is intentionally **no monolithic architecture document** — previous
ones drifted out of sync with the code and were removed. Architecture
truth is, in order of authority:

1. The codebase itself (`src/`, see `CLAUDE.md` for the file-structure map)
2. `04-adrs/` — the decisions that shaped it
3. `superpowers/specs/` — feature-level designs

## Rules

- No documents at the `docs/` root except this README.
- No duplicate homes: a doc lives in exactly one folder per the routing
  table above.
- No version-suffixed files (`_v2`, `_v3`, `.resolved`) — git tracks
  history; superseded docs are deleted or replaced by ADRs.
- ADRs are numbered sequentially and never renumbered, even across gaps
  (004–017 predate ADR record-keeping and do not exist).
