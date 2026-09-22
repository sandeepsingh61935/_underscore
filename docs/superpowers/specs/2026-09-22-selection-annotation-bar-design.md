# Spec: Selection annotation bar

**Date:** 2026-09-22
**Status:** Ready for review
**Scope:** Webpage content script. After the normal select-to-highlight save, a compact bar offers Add tags and Add notes.

## Goal

Selecting text still saves the highlight. The same gesture shows a bar on that sentence so the user can write a note or tags there. Opening the library is not required to attach them.

The reference shape is the ChatGPT selection bar: one compact row, two actions, sitting on the selected sentence. Type, color, and borders stay the editorial system.

## Locked decisions

| # | Decision |
|---|----------|
| 1 | Webpage only, inside the existing select-to-highlight gesture. |
| 2 | The highlight saves immediately, as it does today. The bar then appears. |
| 3 | One bar. Actions, left to right: Add tags, Add notes. |
| 4 | Clicking an action replaces the bar with that box and Save. |
| 5 | Tags are `#` plus ASCII letters, digits, hyphens, or underscores. Several in a row are several tags. |
| 6 | The tags box says: "A #word is a tag. Write #one #two to add several." |
| 7 | After a successful Save, the two actions return. |
| 8 | In the box, Back or Esc drops the unsaved draft and returns to the two actions. |
| 9 | On the two-action bar, Esc closes it. A pointer down outside the bar closes it from either state. |
| 10 | Closing the bar leaves the highlight and any successful save in place. |
| 11 | No bar when the selection only splits an existing highlight. |
| 12 | Guest and signed-in. Library cards are unchanged. |

## Out of scope

- Changing overlap-split, the delete icon, or what a plain click on a highlight does.
- Rendering the note or tags on the page. They show up in the library, as they do today.
- Ask, share, color, or any third action.
- A new storage model. Notes and tags use the highlight fields the library already reads.

## Interaction

1. The user selects text. The existing create path runs.
2. When create returns a highlight id, the bar opens above that range: **Add tags | Add notes**.
3. **Add tags** replaces the bar with one single-line field, the hint, Back, and Save. The field placeholder is the hint sentence, and the same sentence stays visible under the field while typing.
4. **Add notes** replaces the bar with one multi-line field, Back, and Save. No hashtag hint.
5. Save success returns to the two actions. There is no toast.
6. In the box, Back or Esc discards only the unsaved draft and returns to the two actions. A note or tag list already saved stays saved.
7. On the two-action bar, Esc closes the bar.
8. A pointer down outside the bar, from either state, closes it and discards an unsaved draft.
9. The pointer-up that created the highlight does not close the bar. The bar also stays when the browser selection collapses.
10. The bar is anchored to the saved range. Scroll and resize move it with the sentence. If the bar would clip the top of the viewport, it sits below the sentence.
11. A new selection closes the open bar. If that selection creates a highlight, a new bar opens for the new id.
12. Deleting that highlight, or undoing its create, closes the bar.
13. The overlap-split path returns before create, so it does not open a bar.
14. A plain click on a highlight still toggles the delete icon.

Enter in the tags field saves. In the note field, Enter inserts a new line, and Ctrl+Enter or Cmd+Enter saves.

## Notes and tags

Both use the existing limits in `highlight-metadata.ts`.

**Tags.** `parseHashTags` finds each `#` followed by one or more of `A-Z`, `a-z`, `0-9`, `-`, `_`. Other characters end the tag, so `#css,` is `css` and `#node.js` is `node`. Words with no `#` are ignored. The result goes through `normalizeHighlightTags`: trim, lowercase, drop empties and duplicates, 32 characters, at most 10. Extra tags past 10 are dropped.

The box is the tag list. Reopening Add tags fills it from the last saved tags as `#one #two`. Clearing the box and saving removes the tags. Save with no `#word` sends nothing, leaves the saved tags unchanged, and stays on the box with the hint.

**Notes.** One note. Trimmed, at most 2000 characters. Reopening Add notes shows the saved note. The box is the note: saving an empty box clears the note.

If create returns an existing id because the text was already stored, the bar still opens, and the boxes prefill from that highlight's saved note and tags when the repository has them.

## Build

Content script UI does not use React.

- `parseHashTags(text: string): string[]` is a pure function. Normalization stays in `normalizeHighlightTags`.
- `SelectionAnnotationBar` lives under `src/content/ui/`, next to the delete-icon overlay. One instance. A shadow root so the page cannot restyle it. The shadow host defines the editorial custom properties the bar uses (`--paper`, `--ink`, `--rule`, `--serif`, `--sans`, `--mono`, `--step-*`), light or dark from the theme the content script already resolves. If that theme is unavailable, use the light tokens.
- The host is `position: fixed` and sits above page content. Buttons and fields are real controls: the action row is a toolbar, each control has an accessible name, and the tags hint is the field's description.
- `CreateHighlightCommand` already stores the new id and `execute()` stays `Promise<void>`. Add a getter for that id. The selection handler in `src/entrypoints/content.ts` opens the bar only after create resolves with an id.
- Save sends the existing `UPDATE_HIGHLIGHT_METADATA` message, one field at a time (`notes` or `tags`). That handler already merges metadata, writes tag labels, and notifies the library. Create has already awaited `addPersisted`, so the background repository has the row before the bar can save.
- While a save is in flight the button reads Saving and ignores a second click.

## Errors

- The message returns failure, or the highlight is missing: the box stays open, the button returns to Save, and one line reads "Couldn't save. Try again."
- Tags are rejected by the mode gate: the same line, using the gate's reason when it has one.
- No `#word`: no message is sent.

## Testing

- Parser: `#One #two` becomes two tags before normalize; duplicates; `#css,` and `#node.js`; text with no hash; empty string. Normalize still caps at 10 and lowercases.
- Bar: actions open the matching box; Back and Esc from a box return to the actions and drop the draft; Esc on the actions closes; outside pointerdown closes; a failed save keeps the box and shows the error line; a tag save with no hash does not send; Enter saves tags; Ctrl/Cmd+Enter saves a note.
- Selection handler: the create path opens the bar with the returned id; the overlap-split path does not.
