# PRD: Local Vault Mirror Sync via Browser File System Access API

**Status:** `ready-for-agent`  
**Date:** 2026-09-03  
**Triage:** `ready-for-agent`  
**Source:** Product prioritization and technical review (Feature 3 of 3)  
**Surfaces:** Web App Settings (`WebSettingsPage.tsx`), Web Library Shell, Native Browser File System Access API  
**Does not reopen:** Extension background worker scope (MV3 extension remains lean; zero File System API in extension); Event sourcing append-only store; Cloudflare Workers edge API contracts; ADR-029 (Cloud-first Library SoT); V2 Editorial design tokens  
**Related:** Markdown export formatter (`src/shared/highlight-export/format-markdown.ts`); Web Settings polish PRD (2026-08-07); Native text fragment links PRD (2026-09-03)  
**Test seams:** `VaultSyncService` (pure file writer given a mock `FileSystemDirectoryHandle`); Directory picker persistence hook; File path hierarchy generator (`domain/section.md`); Sync debounce/throttle runner (see Testing Decisions)

---

## Problem Statement

Users who actively highlight articles and books on the web often maintain a personal knowledge management (PKM) vault in tools like **Obsidian**, **Logseq**, or **Foam**. These users want their highlights, notes, and tags automatically available as local Markdown files in their note vaults.

Today, getting highlights into a local vault is a manual, high-friction process:
1. **Manual Export Chore:** Users must open the web library or extension, click "Export Markdown", pick a folder, download a `.zip` or `.md` file, unzip it, and manually move it into their Obsidian folder. As a result, users only export every few months, leaving their knowledge vault stale.
2. **Heavyweight Solutions Avoided:** Typical solutions require building a separate Electron desktop app or running a background local daemon (Node/Python) with native file system permissions. This introduces massive maintenance overhead, security surface, cross-platform installer issues, and code bloat that contradicts `_underscore`'s clean architecture.
3. **Fragile Custom Plugins:** Writing custom community plugins for Obsidian or Logseq requires maintaining plugins across separate plugin ecosystems with divergent APIs.

The HTML5 **File System Access API** (`window.showDirectoryPicker()`) is natively supported by modern Chromium browsers (Chrome, Edge, Brave, Arc, Opera). It allows web applications to request permission to read and write directly to a local directory selected by the user—with zero native companion apps, zero Electron bloat, and zero external servers.

---

## Solution

1. **One-Way Vault Mirror in Web App:**  
   Implement a dedicated, web-only vault sync module (`src/web/services/vault-sync-service.ts`) that mirrors the user's synced cloud highlights into a designated local directory on their machine.

2. **Persistent Directory Picker in Web Settings:**  
   - In `WebSettingsPage.tsx` under a new **Local Vault Mirror (Obsidian / Logseq)** section, provide a **Select Vault Folder** button.
   - The user selects their desired directory (e.g. `~/Documents/ObsidianVault/Underscore/`).
   - The browser returns a `FileSystemDirectoryHandle`, which is stored securely in web client IndexedDB (using `idb-keyval`).
   - On subsequent visits, the web app verifies permission (`queryPermission()` / `requestPermission()`) with a single click if needed.

3. **Structured Markdown with Obsidian Frontmatter:**  
   - Organize notes deterministically: `<Vault>/<domain>/<page-slug>.md`.
   - Each markdown file contains standard YAML frontmatter compatible with Obsidian Dataview, Logseq, and general markdown tools:
     ```markdown
     ---
     title: "Article Title"
     url: "https://example.com/article"
     source: "https://example.com/article#:~:text=..."
     domain: "example.com"
     tags: [economics, technology]
     updated: 2026-09-03
     highlight_count: 4
     ---
     ```
   - Reuses the existing, battle-tested `format-markdown.ts` engine for the highlight blocks, quote formatting, and notes.

4. **Sync Triggering & Non-Destructive Writing:**  
   - **Manual Sync:** A prominent **Sync Now** button in Web Settings and Web Library with clear status (`Last synced: 2 minutes ago · 42 files up to date`).
   - **Debounced Auto-Sync:** When signed in and browsing the Web Library, if highlights are loaded or modified, trigger a debounced background sync to updated files.
   - **File-Level Granularity:** Only rewrite files for pages whose `updated_at` timestamp is newer than the last sync record.

5. **Lean Implementation Constraint:**  
   - Contained entirely within the `src/web/` directory tree.
   - Completely decoupled from the Chrome Extension background worker and content scripts to protect extension bundle size and MV3 limits.
   - One-way export mirror only: does not attempt two-way bidirectional conflict resolution with external markdown edits.

---

## User Stories

### Configuration & Permission
1. As a web app user, I want a "Local Vault Mirror" section in Web Settings, so that I can configure local folder export without installing extra tools.
2. As a user, I want to click "Select Folder" and use my operating system's native folder dialog, so that I can choose any folder in my Obsidian or Logseq vault.
3. As a user, I want my selected folder handle saved across sessions, so that I do not have to re-select the directory every time I open the web app.
4. As a user returning to the web app, if the browser requires re-authorizing file system access, I want a single "Authorize Vault" button, so that re-granting permission is seamless.
5. As a user on an unsupported browser (e.g. Firefox or Safari without FSA API), I want the feature to clearly indicate that local folder sync requires a Chromium browser (Chrome, Edge, Brave), with a fallback "Download Markdown Archive" option, so that I am never left confused.
6. As a user, I want a "Disconnect Folder" button, so that I can stop vault sync or switch to a different directory at any time.

### File Organization & Formatting
7. As an Obsidian user, I want files organized in domain subfolders (e.g. `danluu.com/systems-talk.md`), so that my vault stays structured and tidy.
8. As an Obsidian user, I want invalid file system characters (`:`, `/`, `\`, `?`, `*`) sanitized into safe filename slugs, so that files write cleanly on Windows, macOS, and Linux.
9. As a Dataview user, I want YAML frontmatter at the top of each file with `title`, `url`, `domain`, `tags`, and `updated`, so that my automated queries in Obsidian work out of the box.
10. As a reader, I want each highlight formatted with quote blocks, creation dates, user notes, and deep-link source citations, so that all context is preserved in my notes.
11. As a reader, when I update a note or tag in _underscore_, I want the corresponding markdown file in my vault updated on next sync, so that my local notes match my library.

### Sync Experience & Performance
12. As a user with 500+ highlights, I want sync to only write files for pages that changed, so that sync completes in under 2 seconds without thrashing the file system.
13. As a user, I want a "Sync Now" button with visual progress indicator, so that I can trigger an immediate mirror before going offline.
14. As a user, I want to see the date and time of the last successful sync, so that I know my vault is current.
15. As a user adding highlights in the extension, when I open the web library, I want new highlights to sync to my local folder automatically, so that my notes are always up to date.
16. As a user, if a write operation fails (e.g. file locked by another application), I want a non-blocking notification describing which file failed, so that the rest of the sync completes successfully.

---

## Implementation Decisions

1. **Module Placement (Web Only):**  
   Create the sync service under `src/web/services/vault-sync-service.ts` and UI components under `src/web/components/settings/VaultSyncPanel.tsx`.  
   Strict isolation: zero imports from `src/background/` or `src/content/`.

2. **Persistence Seam:**  
   - Store the `FileSystemDirectoryHandle` in browser IndexedDB using a dedicated key in a light key-value store.
   - Store sync metadata (last sync ISO timestamp, file checksums/hashes) in `localStorage` under `underscore_vault_sync_meta`.

3. **Path Generation & Sanitization:**  
   - Derive folder and file names using the existing `getSectionKey` / `normalizePageUrl` rules:
     ```typescript
     function getVaultFilePath(highlight: HighlightData): { folder: string; filename: string };
     ```
   - Strip OS-restricted characters: `[/\\?%*:|"<>]/g` replaced with `-`.
   - Truncate filenames to a safe 100-character ceiling to prevent OS path limit errors.

4. **Frontmatter & Body Assembly:**  
   - Group highlights by URL / section.
   - Format YAML header:
     ```yaml
     ---
     title: "<Page Title>"
     url: "<Source URL>"
     source: "<Text Fragment URL>"
     domain: "<Domain>"
     tags: [<Comma-separated tags>]
     updated: "<ISO Date>"
     highlight_count: <N>
     ---
     ```
   - Append formatted highlights using `formatHighlightBlock` from `src/shared/highlight-export/format-markdown.ts`.

5. **Permission Lifecycle Handling:**  
   ```typescript
   async function verifyPermission(fileHandle: FileSystemHandle, readWrite: boolean): Promise<boolean> {
     const options: FileSystemHandlePermissionDescriptor = { mode: readWrite ? 'readwrite' : 'read' };
     if ((await fileHandle.queryPermission(options)) === 'granted') return true;
     if ((await fileHandle.requestPermission(options)) === 'granted') return true;
     return false;
   }
   ```

---

## Testing Decisions

- **Focus on External Behavior:**  
  Verify file system operations against standard `FileSystemDirectoryHandle` and `FileSystemFileHandle` mocks.
- **Unit Tests:**  
  - Path and Slug Sanitization: Test dirty URLs with queries, illegal Windows characters (`:`, `?`, `*`), and trailing slashes.
  - Frontmatter Builder: Test generation of valid YAML frontmatter across various tag and title permutations.
  - Granular Delta Detection: Verify that pages with timestamps older than `lastSyncedAt` are skipped during incremental sync.
  - Mock File System Writer: Verify `getFileHandle({ create: true })` and `createWritable()` receive correct markdown string content.
- **Component Tests:**  
  - `VaultSyncPanel`: Test display states:
    - Browser unsupported state (shows friendly warning & fallback).
    - Disconnected state (shows "Select Folder" CTA).
    - Permission required state (shows "Authorize Folder" CTA).
    - Connected & Synced state (shows path name, last sync timestamp, and "Sync Now" button).
- **Prior Art:**  
  - `tests/unit/shared/highlight-export/format-markdown.test.ts`
  - `tests/unit/web/components/settingsPanels.test.tsx`

---

## Out of Scope

- Two-way bidirectional sync (editing markdown files in Obsidian will not overwrite highlights in Supabase/IndexedDB in v1).
- Chrome extension background worker sync (due to MV3 service worker limitations with interactive file picker handles).
- Git repository commit/push automation (users can use standard Obsidian Git or git hooks in their vault).
- Full PDF or binary asset attachment export.

---

## Further Notes

- By leveraging the browser's native File System Access API in the web app, `_underscore` solves the #1 request of PKM power users with zero server infrastructure, zero Electron overhead, and zero third-party plugin maintenance.
