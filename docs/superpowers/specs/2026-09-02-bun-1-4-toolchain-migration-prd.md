# PRD: Bun 1.4 Toolchain Migration

## Problem Statement

As a developer working on the `_underscore` project, maintaining and building the monorepo using `npm` is excessively slow. Installing dependencies (`npm install` or `npm ci`) routinely consumes 45 to 90 seconds locally and in continuous integration pipelines. Chained build and quality verification workflows (such as running type checking, linting, formatting checks, legacy design system checks, and unit tests sequentially) incur noticeable process startup latency for every nested sub-command.

Furthermore, the repository suffers from tooling clutter and lockfile drift: both legacy `pnpm` configuration files and a bloated 560 KB `package-lock.json` are present, running TypeScript scripts in the Cloudflare MCP worker package requires auxiliary transpiler tooling (`tsx`), and packaging extension binaries for Chrome and Firefox runs sequentially instead of concurrently.

## Solution

Migrate the repository toolchain to **Bun 1.4** using a hybrid architecture:
1. Adopt Bun 1.4 as the primary package manager and script runner across the monorepo, generating a clean text-based lockfile and formally declaring workspace packages.
2. Parallelize extension distribution packaging using Bun's native parallel task execution.
3. Execute MCP worker scripts directly with Bun's native TypeScript engine, dropping redundant dev dependencies.
4. Update GitHub Actions workflows to use Bun for dependency caching and installation while retaining Node.js 22 as a runtime fallback for Playwright browser drivers and Cloudflare Wrangler edge tooling.
5. Retain Vitest and Playwright as test runner engines invoked through Bun to preserve all existing browser extension mocks, JSDOM environments, and IndexedDB harnesses without risk of regression.

## User Stories

1. As a developer, I want to install all workspace dependencies in under 5 seconds, so that I spend less time waiting and more time delivering features.
2. As a developer, I want warm installs to link dependencies almost instantaneously, so that switching git worktrees or branches is frictionless.
3. As a developer, I want chained verification scripts to execute with minimal process spawning overhead, so that running the standard quality checks feels instantaneous.
4. As a developer, I want extension builds for Chrome and Firefox to package in parallel, so that distribution archives are generated in half the time.
5. As a developer, I want TypeScript execution for the MCP server package to run natively without transpilation wrappers, so that developer iteration is immediate and dependency overhead is reduced.
6. As a developer, I want automatic environment variable loading for local and deployment configurations, so that custom Node environment flags are no longer required in script definitions.
7. As a developer, I want a single, human-readable text lockfile, so that git diffs during dependency updates are clean, easy to review, and less prone to merge conflicts.
8. As a developer, I want stale and duplicate package manager configuration files removed, so that there is zero confusion about the canonical package management tool.
9. As a developer, I want postinstall hooks for the browser extension framework to run reliably upon dependency installation, so that generated extension types are immediately available without manual intervention.
10. As a CI engineer, I want continuous integration workflows to install dependencies via frozen lockfiles in under 3 seconds, so that overall pipeline durations are shortened and runner costs are reduced.
11. As a CI engineer, I want dependency security audits to execute natively and quickly within the pipeline, so that vulnerability scanning does not introduce pipeline delays.
12. As a test engineer, I want existing Vitest unit and component tests to run cleanly through Bun, so that established DOM and storage mocks remain completely intact.
13. As a test engineer, I want Playwright end-to-end and visual regression suites to run reliably alongside Bun, so that browser driver communication and screenshot verifications are unaffected.
14. As a contributor, I want the project documentation and onboarding guides to reflect Bun commands consistently, so that new contributors can set up their environments quickly and without errors.
15. As a release engineer, I want Cloudflare Pages and Vercel web deployment commands to integrate smoothly with the Bun toolchain, so that production web deployments remain fully automated and stable.

## Implementation Decisions

- **Hybrid Toolchain Architecture**: Bun 1.4 is adopted for package management, script orchestration, and server-side script execution. Vitest (with its JSDOM and Fake-IndexedDB mocks) and Playwright (with its browser binaries) remain the test runner engines.
- **Clean Lockfile and Workspace Declaration**: The root package definition formally registers workspace packages and specifies the canonical package manager version. The legacy npm lockfile and stale pnpm configuration files are completely removed in favor of the modern text lockfile format.
- **Trusted Lifecycle Hooks**: The browser extension build framework is explicitly designated as a trusted dependency so that its initialization and type generation hooks execute safely and automatically upon install.
- **Script Modernization**: Monorepo scripts replace explicit npm runner invocations with Bun runner equivalents. Packaging commands leverage native parallel execution flags to build dual browser targets concurrently.
- **MCP Worker Simplification**: The TypeScript development entry point in the MCP worker package is pointed directly to native Bun execution, removing the requirement for intermediate runner dependencies.
- **Dual-Runtime Continuous Integration**: GitHub Actions workflows configure Bun as the primary toolchain for dependency resolution, caching, and script dispatch, while retaining Node.js 22 to guarantee stability for Playwright native browser processes and Wrangler deployments.
- **Security Auditing Integration**: Continuous integration security stages utilize Bun's native vulnerability audit commands in place of npm audit.
- **Documentation Standardization**: Developer setup guidelines, contributing documents, and project operational rules are updated to document Bun installation prerequisites and command conventions.

## Testing Decisions

A good test validates external behavior and output invariants rather than internal package manager mechanics:

- **Build Output Invariance**: The compiled artifacts for the extension (`dist/`), web application (`dist-web/`), and MCP server must produce identical runtime behaviors, asset structures, and extension manifest compliance compared to npm builds.
- **Test Harness Execution**: The entire existing unit test suite (comprising domain logic, state machines, repositories, and UI primitives) must pass with zero mock failures when executed through Bun.
- **Browser Automation Verification**: Playwright end-to-end and visual regression test suites must execute with zero connection timeouts or driver regressions.
- **Clean Freeze Resolution**: Continuous integration must enforce that installation using the frozen lockfile flag succeeds without modifications to the lockfile on fresh virtual machines.

**Prior Art in the Codebase**:
- Existing test suites in `tests/unit/` (Vitest unit tests), `tests/e2e/` (Playwright tests), and `tests/visual/` (Playwright visual regression tests).
- Legacy design system verification script in `scripts/check-legacy-ds.sh`.
- Continuous integration definitions in `.github/workflows/quality.yml`.

## Out of Scope

- Rewriting Vitest test suites or test harnesses to Bun's native test module (`bun:test`).
- Replacing Playwright browser automation with experimental headless browser alternatives.
- Refactoring application source code, React components, or business logic.
- Altering the browser extension MV3 architecture or background service worker lifecycle.
- Migrating the production web hosting platforms away from Cloudflare Pages and Vercel.

## Further Notes

- Execution will follow a staged verification checklist: resolving the dependency tree locally, validating all quality checks (`type-check`, `lint`, `format:check`, `test`), verifying the dual browser zip packaging, updating workflow definitions, and aligning developer documentation.
