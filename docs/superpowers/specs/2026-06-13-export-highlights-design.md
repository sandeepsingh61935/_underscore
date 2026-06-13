# Export Highlights Feature Design Specification

## 1. Overview
The Export Highlights feature allows users to download their highlights directly from the _underscore extension popup. This enables users to easily move their data into personal knowledge management tools (like Obsidian, Notion, or Logseq), spreadsheets, or plain text files.

## 2. Scope & Entry Points
The export functionality is confined to the **Extension Popup**. It is triggered from two specific contexts:
1.  **Section View Export:** An export button on a specific section's view (e.g., viewing all highlights under `/wiki/Antigravity`). This exports only the highlights belonging to that specific domain and section.
2.  **Global Export:** An "Export All" button located in the main Library tab, which exports the entire user's highlight library.

## 3. Supported Formats
The system supports three export formats:
*   **Markdown (`.md`):** Ideal for networked thought tools. Uses structural headings for hierarchy and blockquotes for highlights.
*   **Plain Text (`.txt`):** A universally readable format using ASCII formatting for structural separation.
*   **Spreadsheet / CSV (`.csv`):** A flat, tabular format ideal for filtering, sorting, and pivoting. 

## 4. Content Structure & Metadata
Regardless of the format chosen, the data is organized using a nested hierarchy (except CSV, which flattens it into rows):
`Domain (eTLD+1)  →  Section (URL path)  →  Highlight`

**Included Metadata per Highlight:**
*   `text` (The exact highlighted content)
*   `url` (The full source URL)
*   `colorRole` (Semantic color, e.g., yellow, blue, green)
*   `tags` (Any associated tags from metadata)
*   `createdAt` (Timestamp of creation)
*   `notes` (User-authored notes attached to the highlight)

## 5. User Experience (UX)
*   **Interaction Model:** A **One-tap + Split Button** approach. The primary button executes an immediate export using the user's default format (e.g., `[↑ .md]`). A secondary dropdown arrow (`[▾]`) next to it opens an inline menu to override the format for that specific export.
*   **Settings Integration:** The default export format is a configurable option within the extension's Settings page, stored persistently in `chrome.storage.local`.

## 6. Technical Architecture (Approach A)
The feature uses a client-side generation strategy (`ExportService`), avoiding the need for new background script permissions like `downloads`.

*   **Module Location:** `src/services/export/`
*   **Generators:** Pure functions that take an array of `HighlightDataV2` objects and return a formatted string.
    *   `format-markdown.ts`
    *   `format-txt.ts`
    *   `format-csv.ts`
*   **Execution (`download.ts`):** Takes the generated string, creates a `Blob` URL, and triggers the download by injecting and clicking a hidden `<a download>` tag in the popup's DOM.
*   **Orchestration (`index.ts`):** Coordinates fetching the correct highlight subset, selecting the appropriate generator based on user preference, and initiating the download.

## 7. Filename Convention
Exported files will follow this naming pattern to ensure easy identification:
*   Global Export: `underscore-all-YYYY-MM-DD.<ext>` (e.g., `underscore-all-2026-06-13.md`)
*   Context Export: `underscore-<domain>-YYYY-MM-DD.<ext>` (e.g., `underscore-wikipedia.org-2026-06-13.csv`)
