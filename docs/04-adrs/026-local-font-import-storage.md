# ADR-026: Local Font Import Storage

## Status

Accepted

## Context

Typography settings allow users to upload `.woff2` and `.ttf` files for serif, sans, or mono roles. Binary font data must not be stored in `chrome.storage.local` (10 MB quota, JSON serialization overhead).

## Decision

- Store uploaded font bytes in IndexedDB (`underscore-font-imports` database, `fonts` object store).
- Persist only font file IDs in the typography selection (`importedFonts` refs on custom presets).
- Apply fonts at runtime via `@font-face` rules injected into `#type-preset-faces` using blob URLs.
- Cap uploads at 2 MB per file; validate extension and magic bytes before storage.
- Revoke blob URLs when presets change to avoid memory leaks.

## Consequences

- Popup and web SPA surfaces receive custom fonts immediately after apply.
- Content scripts do not load imported fonts in v1 (deferred).
- Google Fonts stylesheet still loads for non-imported roles in a mixed preset.
