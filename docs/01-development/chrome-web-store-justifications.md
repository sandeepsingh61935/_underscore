# Chrome Web Store Permission Justifications

This document provides the exact justification copy for Google Chrome Web Store review submissions and developer dashboard privacy disclosures.

---

## Extension Overview

- **Name:** Underscore
- **Single Purpose:** Highlighting, organizing, and saving web passages and page groups into a personal knowledge library.

---

## Optional Permissions

The following permissions are declared under `optional_permissions` in `manifest.json`. They are **never requested at install time** and are only prompted at runtime when the user explicitly turns on "Browser tab groups" mirroring in Settings.

### 1. `tabs`

#### CWS Prompt / Field:
> "Explain why your extension needs the 'tabs' permission and how it is used."

#### Justification Text:
```
The 'tabs' permission is optional and requested at runtime only when the user explicitly turns on "Browser tab groups" sync in extension Settings.

How it is used:
1. To read the URL, page title, and favicon URL of tabs that belong to synced browser tab groups, enabling bidirectional mirroring with Underscore page groups.
2. To allow the user to open a saved Underscore group into the browser as an organized tab group via 'tabs.create', 'tabs.group', and 'tabs.ungroup'.
3. To display open, ungrouped tabs in the popup so the user can optionally add individual tabs to a group.

Privacy protection:
- Ungrouped tabs and incognito/private windows are strictly local and are NEVER sent to our servers or stored in the cloud.
- Only tabs in groups explicitly designated for sync are saved to the user's personal account.
- The user can disable sync or revoke this permission at any time in Settings.
```

---

### 2. `tabGroups`

#### CWS Prompt / Field:
> "Explain why your extension needs the 'tabGroups' permission and how it is used."

#### Justification Text:
```
The 'tabGroups' permission is optional and requested at runtime only when the user explicitly enables "Browser tab groups" sync in extension Settings.

How it is used:
1. To query and observe tab groups created in the browser (title, color, and tab membership) to mirror them into Underscore page groups.
2. To create and style new browser tab groups (applying the group name and color swatch) when the user clicks "Open in browser" from the extension popup or companion web app.
3. To update group titles and colors in the browser when edited within Underscore, and vice versa.

Privacy protection:
- The extension never monitors or creates tab groups in incognito/private windows.
- Tab group sync is completely off by default.
- Users can selectively choose which existing tab groups to import via an import picker dialog.
```

---

## Required Permissions (At Install)

### 1. `storage`
Used to store local user preferences, guest highlights in IndexedDB/chrome.storage.local, active mode configurations, and local tab group bindings.

### 2. `unlimitedStorage`
Ensures that extensive user highlighting libraries and annotations saved on-device in IndexedDB are not evicted by browser storage pressure.

### 3. Host Permissions (`<all_urls>`)
Required for content scripts to render SVG text underlines, highlight overlays, and the annotation toolbar on web pages where the user selects text to highlight. No browsing history is collected or transmitted.
