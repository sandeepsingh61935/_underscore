# Highlight Card Note, Tag & Action Bar Parity Plan (Desktop Web & Extension)

> **Goal:** Replicate the Phone-IA highlight card note/tag editing and appearance layout (Images #1, #2, #3) across Web App (Desktop) and Browser Extension Popup.  
> **Rule:** Do NOT implement until user explicitly reviews and approves this plan.

---

## 1. Visual & Interaction Breakdown (Phone-IA Reference)

Based on the 3 user-provided screenshots from the phone simulation (`localhost:3000/library`):

```
┌─────────────────────────────────────────────────────────────┐
│  [Quote Text]                                               │
│  "Don't just learn tools—learn systems"                     │
│  /blog/top-developer-skills-in-2025-momentum-not-mayhem...   │
│                                                             │
│  ┌─ APPEARANCE SECTION ───────────────────────────────────┐  │
│  │                                                        │  │
│  │  [Case A: Note Display (Image #3)]                     │  │
│  │  YOUR NOTE                                             │  │
│  │  skills to learn to get jobs                           │  │
│  │                                                        │  │
│  │  [Case B: Note Editor (Image #1)]                      │  │
│  │  YOUR NOTE                                             │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │                                                  │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  │  [Cancel] [Save]                                       │  │
│  │                                                        │  │
│  │  [Case C: Tags Display (Image #3)]                     │  │
│  │  ( skills-to-learn )                                   │  │
│  │                                                        │  │
│  │  [Case D: Tag Editor (Image #2)]                       │  │
│  │  ┌───────────────────────────────┐ ┌──────────────┐    │  │
│  │  │ Add tag…                      │ │ Add          │    │  │
│  │  └───────────────────────────────┘ └──────────────┘    │  │
│  └────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤ <-- HORIZONTAL BAR
│                                                             │
│  [Actions Row]                                              │
│  [Copy Text]  [Copy Link]  [Note]  [Tag]  [Open]  [Delete]  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Reference Analysis:
1. **Image #1 — Note Icon Clicked (Editor Open)**:
   - The **Note** icon in the bottom action bar has an active background tint (`var(--accent-soft)` peach, `color: var(--accent)`).
   - In the card body, above the horizontal bar, the Note editor is displayed:
     - Header / Kicker: `YOUR NOTE` (uppercase, letter-spaced, `--mono`, `color: var(--accent)`).
     - Textarea:
       - `min-height: 72px`, rounded corners (`var(--r-md)` ~8px).
       - Background: `var(--paper-2)`.
       - Border: `1px solid var(--border)` with `border-left: 3px solid var(--accent)`.
       - Text font: `var(--sans)` or `var(--type-body)`, color `var(--ink)`.
     - Action buttons below textarea (aligned left):
       - `Cancel`: ghost style (`btn sm ghost`).
       - `Save`: default button style (`btn sm`), disabled while saving ("Saving…").
2. **Image #2 — Tag Icon Clicked (Editor Open)**:
   - The **Tag** icon in the bottom action bar has an active background tint (`var(--accent-soft)` peach, `color: var(--accent)`).
   - In the card body, above the horizontal bar, the Tag input row is displayed:
     - Horizontal flex container (`tag-edit`):
       - Input: `placeholder="Add tag…"`, rounded corners (`var(--r-md)`), background `var(--paper-2)`, border `1px solid var(--border)`, flex: 1.
       - Button: `Add` button (`btn sm`), disabled while saving ("Saving…").
       - Pressing `Enter` in the input submits `addTag()`.
     - Error message (if tag invalid or duplicate) appears directly below input in `var(--danger)`.
3. **Image #3 — Note & Tag Saved (Appearance Mode)**:
   - **Note Display Box**:
     - Background: `var(--paper-2)`, rounded corners (`var(--r-md)`), padding `8px 10px` or `12px`.
     - Left accent bar: `border-left: 3px solid var(--accent)`.
     - Kicker: `YOUR NOTE` (uppercase, letter-spaced, `--mono`, `color: var(--accent)`).
     - Note text: clean readable typography (`var(--ink-2)`).
     - Interactive: clicking the note box re-opens the note editor for immediate editing.
   - **Tag Chips Display**:
     - Tag pill badges (`border-radius: 99px`), `border: 1px solid var(--border)`, `font-family: var(--mono)`, small font.
     - When tag editing is active: pills include a `×` remove button to delete tags.
4. **Horizontal Bar Divider**:
   - Distinct horizontal rule (`border-top: 1px solid var(--border)` or `var(--rule-soft)`) cleanly dividing:
     - **Above**: The highlight content and appearance section (quote, path, note display/edit, tag display/edit).
     - **Below**: The actions row.
5. **Actions Row**:
   - Located at the bottom of the card, neatly aligned below the divider:
     1. **Copy text** (`HighlightCopyIcon`) — copies quote string.
     2. **Copy quote link** (`HighlightLinkIcon`) — copies quote deep-link URL (with text fragment).
     3. **Note toggle** (`HighlightNoteIcon`) — toggles note editor; active state when open.
     4. **Tag toggle** (`HighlightTagIcon`) — toggles tag editor; active state when open.
     5. **Open source** (`HighlightOpenIcon`) — opens source URL in new browser tab.
     6. **Delete** (`HighlightDeleteIcon`) — triggers confirmation dialog with danger styling.

---

## 2. Current State & Gap Analysis

| Feature | Phone-IA (`PhoneHighlightCard`) | Web App Desktop (`WebHighlightCard`) | Extension Popup (`HighlightCard` / `LibraryHighlightTile`) |
|---|---|---|---|
| **Action Bar Position** | Bottom row below divider | Split: Link & Trash top-right, GhostActions in meta | Bottom row, but notes/tags jammed into `footerStart` on the same row |
| **Horizontal Divider Bar** | Yes (`border-top: 1px solid var(--border)`) | No | No (action row has no top border separating content) |
| **Note Display Box** | Yes: `border-left: 3px solid var(--accent)` + `YOUR NOTE` kicker | Partial / old button with pencil icon | Truncated inline tray |
| **Note Editor** | Yes: `YOUR NOTE` + textarea + `Cancel`/`Save` buttons | Yes in foot, but layout differs | Only in MarginaliaStrip accordion |
| **Tag Editor** | Inline `Add tag…` + `Add` button | Input chip inside tags row | Inline input in MarginaliaStrip tray |
| **Action Bar Icons** | 6 icons (Copy, Link, Note, Tag, Open, Delete) | Missing Copy text, Note, Tag, Open icons in main bar | Has Edit, Copy, Link, Open, Delete; Note/Tag icons not wired |
| **Active Icon Highlight** | Hover works, needs explicit `is-active` / `aria-pressed` | N/A | N/A |

---

## 3. Architecture & Implementation Plan

### Phase 1: Phone-IA Polish & Test Alignment
**Files:**
- `src/web/components/PhoneHighlightCard.tsx`
- `src/web/components/PhoneHighlightCard.test.tsx`
- `src/web/theme/web-app.css`

**Tasks:**
1. In `PhoneHighlightCard.tsx`:
   - Keep separate **Copy Quote Text** button (`HighlightCopyIcon`) and **Copy Quote Link** button (`HighlightLinkIcon`).
   - Add `.is-active` / `aria-pressed={noteEditing}` to Note icon button.
   - Add `.is-active` / `aria-pressed={tagEditing}` to Tag icon button.
   - Clicking Note icon toggles note editor; clicking Tag icon toggles tag editor.
2. In `src/web/theme/web-app.css`:
   - Ensure `.phone-hl-actions .phone-ico.is-active, .phone-hl-actions .phone-ico[aria-pressed='true']` applies `background: var(--accent-soft); color: var(--accent);`.
3. In `PhoneHighlightCard.test.tsx`:
   - Verify all 3 failing tests pass with the 6-icon action bar order: `Copy`, `Copy quote link`, `Note`, `Tags`, `Open source`, `Delete highlight`.

---

### Phase 2: Desktop Web App Parity (`WebHighlightCard.tsx`)
**Files:**
- `src/web/components/WebHighlightCard.tsx`
- `src/web/components/WebHighlightCard.test.tsx`
- `src/web/theme/web-app.css`

**Tasks:**
1. **Refactor Card Layout in `WebHighlightCard.tsx`**:
   - Remove obsolete top-right Link and Delete buttons (lines 518–546).
   - Remove obsolete `hl-meta-invites` ghost buttons from the meta line (lines 497–514).
   - Render the **Appearance Section** inside the card body:
     - **Note Display**: If `hasNote && !noteEditing`, render:
       ```tsx
       <div
         className="hl-note"
         role={canEdit ? 'button' : undefined}
         tabIndex={canEdit ? 0 : undefined}
         onClick={canEdit ? startNoteEdit : undefined}
       >
         <span className="hl-note-kicker">YOUR NOTE</span>
         <p className="hl-note-txt">{note}</p>
       </div>
       ```
     - **Note Editor**: If `noteEditing && canEdit`, render:
       ```tsx
       <div className="hl-note-edit">
         <label className="hl-note-kicker" htmlFor={noteFieldId}>YOUR NOTE</label>
         <textarea
           id={noteFieldId}
           ref={noteRef}
           className="hl-note-input"
           rows={3}
           value={noteDraft}
           onChange={(e) => setNoteDraft(e.target.value)}
           onKeyDown={(e) => { if (e.key === 'Escape') cancelNote(); }}
         />
         <div className="hl-note-actions">
           <button type="button" className="btn sm ghost" onClick={cancelNote}>Cancel</button>
           <button type="button" className="btn sm" disabled={savingNote} onClick={() => void saveNote()}>
             {savingNote ? 'Saving…' : 'Save'}
           </button>
         </div>
       </div>
       ```
     - **Tags Display**: Tag chips with `×` remove button when `tagEditing`.
     - **Tag Editor**: If `tagEditing && canEdit`, render:
       ```tsx
       <div className="hl-tag-edit">
         <input
           id={tagFieldId}
           ref={tagInputRef}
           className="hl-tag-input"
           value={tagInput}
           placeholder="Add tag…"
           onChange={(e) => { setTagInput(e.target.value); if (tagError) setTagError(null); }}
           onKeyDown={(e) => {
             if (e.key === 'Enter') { e.preventDefault(); void addTag(); }
             if (e.key === 'Escape') { setTagEditing(false); }
           }}
         />
         <button type="button" className="btn sm" disabled={savingTags} onClick={() => void addTag()}>
           {savingTags ? 'Saving…' : 'Add'}
         </button>
       </div>
       ```
     - Tag error displayed if present.
   - **Horizontal Divider & Bottom Action Bar**:
     - Render `.hl-actions` with `border-top: 1px solid var(--border)`:
       ```tsx
       <div className="hl-actions">
         <button type="button" className="hl-ico" aria-label="Copy" onClick={handleCopyText}>
           <HighlightCopyIcon />
         </button>
         {sourceHref ? (
           <button type="button" className="hl-ico" aria-label="Copy quote link" onClick={handleCopyLink}>
             <HighlightLinkIcon />
           </button>
         ) : null}
         {canNote ? (
           <button
             type="button"
             className={cn("hl-ico", noteEditing && "is-active")}
             aria-label={hasNote ? "Edit note" : "Add note"}
             aria-pressed={noteEditing}
             onClick={() => { setNoteEditing((v) => !v); setTagEditing(false); }}
           >
             <HighlightNoteIcon />
           </button>
         ) : null}
         {canTag ? (
           <button
             type="button"
             className={cn("hl-ico", tagEditing && "is-active")}
             aria-label="Add tags"
             aria-pressed={tagEditing}
             onClick={() => { setTagEditing((v) => !v); setNoteEditing(false); }}
           >
             <HighlightTagIcon />
           </button>
         ) : null}
         {sourceHref ? (
           <a className="hl-ico" href={sourceHref} target="_blank" rel="noopener noreferrer" aria-label="Open source">
             <HighlightOpenIcon />
           </a>
         ) : null}
         {canDelete ? (
           <button type="button" className="hl-ico is-danger" aria-label="Delete highlight" onClick={() => setDeleteOpen(true)}>
             <HighlightDeleteIcon />
           </button>
         ) : null}
       </div>
       ```
2. **CSS Styling in `src/web/theme/web-app.css`**:
   - Style `.hl-note`: `background: var(--paper-2)`, `border-left: 3px solid var(--accent)`, `border-radius: var(--r-md)`, `padding: 10px 12px`, `margin-top: 10px`.
   - Style `.hl-note-kicker`: `font-family: var(--mono); font-size: var(--step--2); letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); margin-bottom: 4px; display: block;`.
   - Style `.hl-note-input`: `min-height: 72px; padding: 10px 12px; border: 1px solid var(--border); border-left: 3px solid var(--accent); border-radius: var(--r-md); background: var(--paper-2); color: var(--ink); font-family: var(--sans); font-size: var(--step-0);`.
   - Style `.hl-tag-edit`: `display: flex; gap: 8px; align-items: center; margin-top: 8px;`.
   - Style `.hl-actions`: `display: flex; align-items: center; justify-content: flex-end; gap: 2px; margin-top: 10px; padding-top: 6px; border-top: 1px solid var(--border);`.
   - Style `.hl-actions .hl-ico`: `width: 32px; height: 32px; min-width: 32px; border-radius: 8px; border: 0; background: transparent; color: var(--ink-3); display: inline-flex; align-items: center; justify-content: center; cursor: pointer;`.
   - Hover & Active: `.hl-actions .hl-ico:hover, .hl-actions .hl-ico.is-active, .hl-actions .hl-ico[aria-pressed='true'] { color: var(--accent); background: var(--accent-soft); }`.
   - Danger hover: `.hl-actions .hl-ico.is-danger:hover { color: var(--danger); background: var(--danger-soft); }`.
3. **Tests in `WebHighlightCard.test.tsx`**:
   - Update tests for the new action bar buttons, note toggle, tag toggle, active states, and remove obsolete ghost/header test assertions.

---

### Phase 3: Browser Extension Parity (`HighlightCard.tsx` + `LibraryHighlightTile.tsx`)
**Files:**
- `src/features/collections/components/LibraryHighlightTile.tsx`
- `src/ui-system/components/primitives/HighlightCard.tsx`
- `src/ui-system/components/primitives/HighlightCard.test.tsx`
- `src/ui-system/theme/global.css`

**Tasks:**
1. **Extend `HighlightCard.tsx` Props & State**:
   - Add props for notes and tags to `HighlightCardProps`:
     ```typescript
     notes?: string;
     tags?: string[];
     onSaveNotes?: (notes: string) => Promise<boolean>;
     onSaveTags?: (tags: string[]) => Promise<boolean>;
     allowMarginalia?: boolean;
     ```
   - In `HighlightCard.tsx`, manage `noteEditing`, `tagEditing`, `noteDraft`, `tagInput`, and `tags` state.
   - Render the **Appearance Section** (above the divider):
     - **Note Display**: Kicker `YOUR NOTE` (`color: var(--accent)`), note body, `border-left: 3px solid var(--accent)`, `background: var(--paper-2)`.
     - **Note Editor**: Kicker `YOUR NOTE`, textarea with `border-left: 3px solid var(--accent)`, Cancel and Save buttons.
     - **Tags Display**: Rounded-full tag pills with `×` remove buttons when editing.
     - **Tag Editor**: `Add tag…` input and `Add` button.
   - **Horizontal Divider**:
     - Between appearance section and action row: `border-top: 1px solid var(--rule-soft)`.
   - **Actions Row**:
     - Standard 6 action icons (`HighlightCopyIcon`, `HighlightLinkIcon`, `HighlightNoteIcon`, `HighlightTagIcon`, `HighlightOpenIcon`, `HighlightDeleteIcon`, plus optional quote markdown `Edit` if `onSaveQuote` is set).
     - Note button toggles note editor with `is-active` peach background.
     - Tag button toggles tag editor with `is-active` peach background.
2. **Wire in `LibraryHighlightTile.tsx`**:
   - Pass `notes={highlight.notes}`, `tags={highlight.tags}`, `onSaveNotes`, and `onSaveTags` into `HighlightCard`.
   - Implement `onSaveNotes`: calls `updateMetadata(highlight.id, { notes })`.
   - Implement `onSaveTags`: calls `updateMetadata(highlight.id, { tags })`.
   - Deprecate embedding the old accordion `MarginaliaStrip` in favor of this clean, direct inline representation that matches Phone IA.
3. **Styles in `src/ui-system/theme/global.css`**:
   - Ensure `.hl-icon.is-active, .hl-icon[aria-pressed='true']` has `background: var(--accent-soft); color: var(--accent);`.
   - Style note display, note editor, and tag editor using V2 variables (`var(--rule-soft)`, `var(--paper-2)`, `var(--accent)`, `var(--accent-soft)`).
4. **Tests in `HighlightCard.test.tsx`**:
   - Test note toggle, tag toggle, active states, divider line, and note/tag save handlers.

---

## 4. Verification & Testing Matrix

| Scenario | Expected Result |
|---|---|
| **Note Icon Clicked** | Note editor appears above horizontal bar with `YOUR NOTE` kicker, textarea (with accent left line), Cancel & Save buttons. Note icon button shows active peach background. |
| **Note Save / Cancel** | Clicking Cancel reverts draft and closes editor. Clicking Save calls `onSaveNotes` / `onNoteSave` and displays the saved note box. |
| **Note Display** | Note displays in a rounded box with `YOUR NOTE` kicker and accent left line. Clicking the box re-opens note editor. |
| **Tag Icon Clicked** | Tag input appears above horizontal bar with `Add tag…` placeholder and `Add` button. Tag icon button shows active peach background. Tag pills show `×` button. |
| **Tag Add / Remove** | Typing a tag name and clicking Add (or pressing Enter) saves the tag. Clicking `×` removes the tag. |
| **Divider Bar** | Horizontal divider line separates the quote + note + tags section from the bottom actions row across all viewport sizes. |
| **Copy & Link Actions** | Copy copies clean quote text. Link copies URL with text fragment. |
| **Open & Delete Actions** | Open opens source link in new tab. Delete opens confirmation dialog. |
| **Theme Integrity** | Clean appearance in both light and dark mode with editorial V2 tokens (`var(--paper)`, `var(--paper-2)`, `var(--accent)`, `var(--rule-soft)`). |
| **Build & Lint Checks** | `bun run build` / `npm run build` and `npm run type-check` pass without errors. |

---

## 5. Status: Completed

All phases implemented and verified:
- [x] Phase 1: Shared action icons & Phone-IA alignment (`PhoneHighlightCard.tsx`)
- [x] Phase 2: Desktop Web App alignment (`WebHighlightCard.tsx` + `web-app.css`)
- [x] Phase 3: Browser Extension Popup alignment (`HighlightCard.tsx` + `LibraryHighlightTile.tsx` + `global.css`)
- [x] Verification: Type checks passed, all test suites passed (33 in HighlightCard, 6 in PhoneHighlightCard, 18 in WebHighlightCard, 15 in LibraryPage, 27 in ui-system, 37 in web), extension and web builds succeeded.
