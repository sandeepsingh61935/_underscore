# Selection Annotation Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After a webpage selection creates a highlight, render the underscore immediately (~1ms) and show the annotation bar instantly so the user can save a note or `#` tags without delay or illusion of failure, while durable persistence runs non-blocking.

**Architecture:** A pure parser turns `#words` into tag strings. A shadow-DOM `SelectionAnnotationBar` in the content script draws the bar and sends `UPDATE_HIGHLIGHT_METADATA` through a small client. `content.ts` opens that bar immediately after `CreateHighlightCommand` returns an id (with synchronous DOM paint and non-blocking background persistence), and closes it when that highlight is deleted or undone.

**Tech Stack:** TypeScript, Vitest, content-script DOM (no React), existing `IMessageBus` and `UPDATE_HIGHLIGHT_METADATA`.

## Global Constraints

- Webpage content script only. Library cards stay unchanged.
- Selecting text renders the highlight immediately (~1ms optimistic paint). The bar appears instantly alongside the underscore, with durable persistence running non-blocking in background.
- Underscore style conforms to editorial standard: 1px thickness (1.5px hover), 3px underline offset, no text-shadow glow.
- One bar. Actions, left to right: Add tags, Add notes.
- Clicking an action replaces the bar with that box and Save.
- Tags are `#` plus ASCII letters, digits, hyphens, or underscores. Several in a row are several tags.
- The tags box says: "A #word is a tag. Write #one #two to add several."
- After a successful Save, the two actions return. No toast.
- In the box, Back or Esc drops the unsaved draft and returns to the two actions. A note or tag list already saved stays saved.
- On the two-action bar, Esc closes it. A pointer down outside the bar closes it from either state.
- Closing the bar leaves the highlight and any successful save in place.
- No bar when the selection only splits an existing highlight. A plain click still toggles the delete icon.
- Do not render the note or tags on the page.
- Content script UI does not use React. No Tailwind, no MD3 tokens, no hardcoded hex in `.ts` logic. Hex belongs only in the shadow stylesheet that defines editorial custom properties.
- `execute()` on `CreateHighlightCommand` stays `Promise<void>`.
- Save sends existing `UPDATE_HIGHLIGHT_METADATA`, one field at a time (`notes` or `tags`).
- While a save is in flight the button reads Saving and ignores a second click.
- Failure copy is `Couldn't save. Try again.` A tags mode-gate denial uses the mapped reason below.
- No `#word` in a non-empty tags box sends nothing. An empty tags box saves an empty tag list.
- Enter saves tags. In the note box, Enter is a new line and Ctrl+Enter or Cmd+Enter saves.
- Commit only the files named in that task. The worktree already has unrelated edits. Do not stage them.
- Tests: `bun run vitest run <path>`.

---

### Task 1: Hash-tag parser

**Files:**
- Create: `src/content/ui/parse-hash-tags.ts`
- Test: `tests/unit/content/ui/parse-hash-tags.test.ts`

**Interfaces:**
- Consumes: `normalizeHighlightTags` from `@/shared/utils/highlight-metadata`.
- Produces:
  - `parseHashTags(text: string): string[]` — raw matches, original case, duplicates kept.
  - `tagBoxAction(text: string): { type: 'noop' } | { type: 'replace'; tags: string[] }` — empty box replaces with `[]`; a non-empty box with zero matches is `noop`; otherwise `replace` with `normalizeHighlightTags`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import { parseHashTags, tagBoxAction } from '@/content/ui/parse-hash-tags';
import { normalizeHighlightTags } from '@/shared/utils/highlight-metadata';

describe('parseHashTags', () => {
  it('returns two tags before normalize, keeping case', () => {
    expect(parseHashTags('#One #two')).toEqual(['One', 'two']);
  });

  it('keeps duplicate matches for normalize to drop', () => {
    expect(parseHashTags('#css #css')).toEqual(['css', 'css']);
  });

  it('stops a tag at punctuation', () => {
    expect(parseHashTags('#css, #node.js')).toEqual(['css', 'node']);
  });

  it('returns nothing when the text has no hash', () => {
    expect(parseHashTags('hello world')).toEqual([]);
    expect(parseHashTags('')).toEqual([]);
  });
});

describe('tagBoxAction', () => {
  it('replaces with a normalized list', () => {
    expect(tagBoxAction('#One #two #One')).toEqual({
      type: 'replace',
      tags: ['one', 'two'],
    });
  });

  it('caps at 10 lowercase tags', () => {
    const text = Array.from({ length: 11 }, (_, i) => `#T${i}`).join(' ');
    const action = tagBoxAction(text);
    expect(action).toEqual({
      type: 'replace',
      tags: normalizeHighlightTags(parseHashTags(text)),
    });
    if (action.type === 'replace') {
      expect(action.tags).toHaveLength(10);
      expect(action.tags[0]).toBe('t0');
    }
  });

  it('treats an empty box as clearing the list', () => {
    expect(tagBoxAction('   ')).toEqual({ type: 'replace', tags: [] });
  });

  it('does not send when words have no hash', () => {
    expect(tagBoxAction('hello')).toEqual({ type: 'noop' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run vitest run tests/unit/content/ui/parse-hash-tags.test.ts`

Expected: FAIL. Cannot resolve `@/content/ui/parse-hash-tags`.

- [ ] **Step 3: Write minimal implementation**

```ts
import { normalizeHighlightTags } from '@/shared/utils/highlight-metadata';

const HASH_TAG = /#([A-Za-z0-9_-]+)/g;

export function parseHashTags(text: string): string[] {
  return [...text.matchAll(HASH_TAG)].map((match) => match[1] ?? '').filter(Boolean);
}

export type TagBoxAction = { type: 'noop' } | { type: 'replace'; tags: string[] };

/** Empty box clears tags. Prose with no #word does not. */
export function tagBoxAction(text: string): TagBoxAction {
  if (text.trim() === '') return { type: 'replace', tags: [] };
  const raw = parseHashTags(text);
  if (raw.length === 0) return { type: 'noop' };
  return { type: 'replace', tags: normalizeHighlightTags(raw) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run vitest run tests/unit/content/ui/parse-hash-tags.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/content/ui/parse-hash-tags.ts tests/unit/content/ui/parse-hash-tags.test.ts
git commit -m "test(content): parse hash tags for the selection bar"
```

---

### Task 2: Created-highlight id getter

**Files:**
- Modify: `src/content/commands/simple-highlight-commands.ts` (class `CreateHighlightCommand`)
- Test: `tests/unit/commands/create-highlight-command.test.ts`

**Interfaces:**
- Consumes: private `createdHighlightId` already set inside `execute()`.
- Produces: `getCreatedHighlightId(): string | null`. `execute(): Promise<void>` is unchanged.

- [ ] **Step 1: Write the failing test**

Add this `describe` after `Test 2` in `tests/unit/commands/create-highlight-command.test.ts`:

```ts
describe('Test 2b: Exposes the created highlight id', () => {
  it('returns null before execute and the id after execute', async () => {
    (mockModeManager.createHighlight as ReturnType<typeof vi.fn>).mockResolvedValue(
      'created-id'
    );
    const command = new CreateHighlightCommand(
      selection,
      'yellow',
      mockModeManager,
      mockLogger
    );

    expect(command.getCreatedHighlightId()).toBeNull();
    await command.execute();
    expect(command.getCreatedHighlightId()).toBe('created-id');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run vitest run tests/unit/commands/create-highlight-command.test.ts`

Expected: FAIL. `getCreatedHighlightId` is not a function.

- [ ] **Step 3: Write minimal implementation**

On `CreateHighlightCommand`, after the constructor, add:

```ts
getCreatedHighlightId(): string | null {
  return this.createdHighlightId;
}
```

Do not change `execute()` or `undo()`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run vitest run tests/unit/commands/create-highlight-command.test.ts`

Expected: PASS, including the existing undo tests.

- [ ] **Step 5: Commit**

```bash
git add src/content/commands/simple-highlight-commands.ts tests/unit/commands/create-highlight-command.test.ts
git commit -m "feat(content): expose the created highlight id"
```

---

### Task 3: Bar shell

**Files:**
- Create: `src/content/ui/selection-annotation-bar-css.ts`
- Create: `src/content/ui/selection-annotation-bar.ts`
- Test: `tests/unit/content/ui/selection-annotation-bar.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1 yet. Save is wired in Task 4.
- Produces:

```ts
export const ANNOTATION_TAG_HINT =
  'A #word is a tag. Write #one #two to add several.';

export type AnnotationBarMode = 'closed' | 'actions' | 'tags' | 'notes';

export interface SelectionAnnotationBarDeps {
  saveMetadata: (payload: {
    id: string;
    notes?: string;
    tags?: string[];
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
  isDark: () => boolean;
}

export class SelectionAnnotationBar {
  constructor(deps: SelectionAnnotationBarDeps);
  open(args: { id: string; range: Range; note: string; tags: string[] }): void;
  close(): void;
  isOpen(): boolean;
  highlightId(): string | null;
  mode(): AnnotationBarMode;
  /** Reads the range rect again. Scroll and resize call this. */
  reposition(): void;
}
```

Host element: `document.body` child, `data-annotation-bar`, `position: fixed`, shadow root. Action row is `role="toolbar"` `aria-label="Highlight"`. Buttons are named `Add tags`, `Add notes`, `Back`, `Save`. Tags field `aria-label="Tags"` and `aria-describedby` points at the hint. Notes field `aria-label="Note"`. Error node `role="alert"`, empty until Task 4.

Placement constants inside the class file: `BAR_GAP_PX = 8`, `BAR_FALLBACK_HEIGHT_PX = 44`. Prefer above the range. If `rect.top - height - gap < 8`, place below `rect.bottom + gap`. `height` is `host.getBoundingClientRect().height` or the fallback when that is 0.

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SelectionAnnotationBar } from '@/content/ui/selection-annotation-bar';

function rect(top: number, bottom: number, left = 30): DOMRect {
  return {
    top,
    bottom,
    left,
    right: left + 80,
    width: 80,
    height: bottom - top,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

function rangeAt(box: DOMRect): Range {
  const p = document.createElement('p');
  p.textContent = 'One only needs to look at the evidence.';
  document.body.appendChild(p);
  const range = document.createRange();
  range.selectNodeContents(p);
  range.getBoundingClientRect = () => box;
  return range;
}

function bar() {
  return new SelectionAnnotationBar({
    saveMetadata: vi.fn().mockResolvedValue({ ok: true }),
    isDark: () => false,
  });
}

describe('SelectionAnnotationBar shell', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('opens Add tags then Add notes above the sentence', () => {
    const ui = bar();
    ui.open({
      id: 'hl-1',
      range: rangeAt(rect(200, 220)),
      note: '',
      tags: [],
    });

    const host = document.querySelector('[data-annotation-bar]') as HTMLElement;
    const root = host.shadowRoot as ShadowRoot;
    const actions = [...root.querySelectorAll('button')].map((b) => b.textContent);
    expect(actions).toEqual(['Add tags', 'Add notes']);
    expect(root.querySelector('[role="toolbar"]')?.getAttribute('aria-label')).toBe(
      'Highlight'
    );
    expect(ui.mode()).toBe('actions');
    expect(ui.highlightId()).toBe('hl-1');
    expect(Number.parseFloat(host.style.top)).toBeLessThan(200);
  });

  it('places the bar below the sentence when the top would clip', () => {
    const ui = bar();
    ui.open({
      id: 'hl-1',
      range: rangeAt(rect(0, 12)),
      note: '',
      tags: [],
    });
    const host = document.querySelector('[data-annotation-bar]') as HTMLElement;
    expect(Number.parseFloat(host.style.top)).toBeGreaterThanOrEqual(12);
  });

  it('opens the tags box with the hint, and Back returns to the actions', () => {
    const ui = bar();
    ui.open({
      id: 'hl-1',
      range: rangeAt(rect(200, 220)),
      note: 'kept',
      tags: ['css'],
    });
    const root = document.querySelector('[data-annotation-bar]')!.shadowRoot!;
    (root.querySelector('[aria-label="Add tags"]') as HTMLButtonElement).click();

    const input = root.querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('aria-label')).toBe('Tags');
    expect(input.placeholder).toContain('#word');
    expect(root.textContent).toContain('A #word is a tag. Write #one #two to add several.');
    expect(input.value).toBe('#css');

    input.value = '#draft';
    (root.querySelector('[aria-label="Back"]') as HTMLButtonElement).click();
    expect(ui.mode()).toBe('actions');

    (root.querySelector('[aria-label="Add tags"]') as HTMLButtonElement).click();
    expect((root.querySelector('input') as HTMLInputElement).value).toBe('#css');
  });

  it('opens the note box and Back drops the draft', () => {
    const ui = bar();
    ui.open({
      id: 'hl-1',
      range: rangeAt(rect(200, 220)),
      note: 'saved note',
      tags: [],
    });
    const root = document.querySelector('[data-annotation-bar]')!.shadowRoot!;
    (root.querySelector('[aria-label="Add notes"]') as HTMLButtonElement).click();
    const field = root.querySelector('textarea') as HTMLTextAreaElement;
    expect(field.value).toBe('saved note');
    expect(field.getAttribute('aria-label')).toBe('Note');
    field.value = 'draft';
    (root.querySelector('[aria-label="Back"]') as HTMLButtonElement).click();
    (root.querySelector('[aria-label="Add notes"]') as HTMLButtonElement).click();
    expect((root.querySelector('textarea') as HTMLTextAreaElement).value).toBe('saved note');
  });

  it('Esc from a box returns to the actions, and Esc on the actions closes', () => {
    const ui = bar();
    ui.open({
      id: 'hl-1',
      range: rangeAt(rect(200, 220)),
      note: '',
      tags: [],
    });
    const root = document.querySelector('[data-annotation-bar]')!.shadowRoot!;
    (root.querySelector('[aria-label="Add tags"]') as HTMLButtonElement).click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(ui.mode()).toBe('actions');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(ui.isOpen()).toBe(false);
    expect(document.querySelector('[data-annotation-bar]')).toBeNull();
  });

  it('a pointerdown outside closes, and a pointerdown inside does not', () => {
    const ui = bar();
    ui.open({
      id: 'hl-1',
      range: rangeAt(rect(200, 220)),
      note: '',
      tags: [],
    });
    const host = document.querySelector('[data-annotation-bar]') as HTMLElement;
    host.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(ui.isOpen()).toBe(true);
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(ui.isOpen()).toBe(false);
  });

  it('repositions when the range rect moves', () => {
    const ui = bar();
    const box = rect(200, 220);
    const range = rangeAt(box);
    ui.open({ id: 'hl-1', range, note: '', tags: [] });
    range.getBoundingClientRect = () => rect(400, 420);
    ui.reposition();
    const host = document.querySelector('[data-annotation-bar]') as HTMLElement;
    expect(Number.parseFloat(host.style.top)).toBeLessThan(400);
    expect(Number.parseFloat(host.style.top)).toBeGreaterThan(300);
  });

  it('sets data-dark from isDark', () => {
    const ui = new SelectionAnnotationBar({
      saveMetadata: vi.fn().mockResolvedValue({ ok: true }),
      isDark: () => true,
    });
    ui.open({
      id: 'hl-1',
      range: rangeAt(rect(200, 220)),
      note: '',
      tags: [],
    });
    expect(document.querySelector('[data-annotation-bar]')?.getAttribute('data-dark')).toBe(
      'true'
    );
    ui.close();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run vitest run tests/unit/content/ui/selection-annotation-bar.test.ts`

Expected: FAIL. Module not found.

- [ ] **Step 3: Write minimal implementation**

`src/content/ui/selection-annotation-bar-css.ts` exports `SELECTION_ANNOTATION_BAR_CSS`. Put the editorial values on `:host`, and the dark set on `:host([data-dark])`. Copy these values from `src/ui-system/theme/global.css`:

Light `:host`: `--paper: #f7f5f0`, `--paper-2: #efece4`, `--rule: #1a1a1a`, `--rule-soft: #cfc9bd`, `--ink: #111110`, `--ink-2: #3a3835`, `--ink-3: #6b6760`, `--serif` and `--sans` and `--mono` and `--step--1: 11px`, `--step-0: 13px` as in `:root`.

Dark `:host([data-dark])`: `--paper: #141312`, `--paper-2: #1e1c1a`, `--rule: #4f4a43`, `--rule-soft: #35322e`, `--ink: #f5f1e8`, `--ink-2: #d8d2c6`, `--ink-3: #b0a99c`.

Rules for the controls, all `var(...)`, no Tailwind:

```css
:host {
  all: initial;
  position: fixed;
  z-index: 2147483647;
  display: block;
}
.bar {
  display: flex;
  align-items: center;
  gap: 0;
  background: var(--paper);
  color: var(--ink);
  border: 1px solid var(--rule);
  border-radius: 999px;
  box-shadow: 0 8px 24px color-mix(in srgb, var(--ink) 12%, transparent);
  font-family: var(--sans);
  font-size: var(--step-0);
}
.bar button {
  appearance: none;
  background: transparent;
  color: var(--ink);
  border: 0;
  font: inherit;
  padding: 8px 12px;
  cursor: pointer;
}
.bar button + button {
  border-left: 1px solid var(--rule-soft);
}
.editor {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 280px;
  padding: 10px;
  background: var(--paper);
  color: var(--ink);
  border: 1px solid var(--rule);
  border-radius: 12px;
  font-family: var(--sans);
  font-size: var(--step-0);
}
.editor input,
.editor textarea {
  width: 100%;
  box-sizing: border-box;
  background: var(--paper-2);
  color: var(--ink);
  border: 1px solid var(--rule-soft);
  font: inherit;
  padding: 8px;
}
.hint,
.error {
  font-family: var(--sans);
  font-size: var(--step--1);
  color: var(--ink-3);
}
.error:not(:empty) {
  color: var(--ink);
}
.row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
```

`selection-annotation-bar.ts`:

```ts
import { SELECTION_ANNOTATION_BAR_CSS } from '@/content/ui/selection-annotation-bar-css';

export const ANNOTATION_TAG_HINT =
  'A #word is a tag. Write #one #two to add several.';

export type AnnotationBarMode = 'closed' | 'actions' | 'tags' | 'notes';

export interface SelectionAnnotationBarDeps {
  saveMetadata: (payload: {
    id: string;
    notes?: string;
    tags?: string[];
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
  isDark: () => boolean;
}

const BAR_GAP_PX = 8;
const BAR_FALLBACK_HEIGHT_PX = 44;

export class SelectionAnnotationBar {
  private host: HTMLElement | null = null;
  private range: Range | null = null;
  private id: string | null = null;
  private savedNote = '';
  private savedTags: string[] = [];
  private current: AnnotationBarMode = 'closed';
  private readonly onKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || !this.host) return;
    event.preventDefault();
    if (this.current === 'actions') this.close();
    else this.showActions();
  };
  private readonly onPointerDown = (event: Event): void => {
    if (!this.host) return;
    if (event.composedPath().includes(this.host)) return;
    this.close();
  };
  private readonly onScroll = (): void => {
    this.reposition();
  };

  constructor(private readonly deps: SelectionAnnotationBarDeps) {}

  open(args: { id: string; range: Range; note: string; tags: string[] }): void {
    this.close();
    this.id = args.id;
    this.range = args.range;
    this.savedNote = args.note;
    this.savedTags = [...args.tags];
    this.host = document.createElement('div');
    this.host.setAttribute('data-annotation-bar', '');
    this.host.style.position = 'fixed';
    this.host.style.zIndex = '2147483647';
    if (this.deps.isDark()) this.host.setAttribute('data-dark', 'true');
    const root = this.host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = SELECTION_ANNOTATION_BAR_CSS;
    root.appendChild(style);
    document.body.appendChild(this.host);
    this.showActions();
    this.reposition();
    document.addEventListener('keydown', this.onKeydown, true);
    document.addEventListener('pointerdown', this.onPointerDown, true);
    window.addEventListener('scroll', this.onScroll, true);
    window.addEventListener('resize', this.onScroll);
  }

  close(): void {
    document.removeEventListener('keydown', this.onKeydown, true);
    document.removeEventListener('pointerdown', this.onPointerDown, true);
    window.removeEventListener('scroll', this.onScroll, true);
    window.removeEventListener('resize', this.onScroll);
    this.host?.remove();
    this.host = null;
    this.range = null;
    this.id = null;
    this.current = 'closed';
  }

  isOpen(): boolean {
    return this.current !== 'closed';
  }

  highlightId(): string | null {
    return this.id;
  }

  mode(): AnnotationBarMode {
    return this.current;
  }

  reposition(): void {
    if (!this.host || !this.range) return;
    const rect = this.range.getBoundingClientRect();
    const measured = this.host.getBoundingClientRect().height;
    const height = measured > 0 ? measured : BAR_FALLBACK_HEIGHT_PX;
    let top = rect.top - height - BAR_GAP_PX;
    if (top < 8) top = rect.bottom + BAR_GAP_PX;
    const width = this.host.getBoundingClientRect().width || 220;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    this.host.style.top = `${top}px`;
    this.host.style.left = `${left}px`;
  }

  private root(): ShadowRoot {
    const root = this.host?.shadowRoot;
    if (!root) throw new Error('Annotation bar is closed');
    return root;
  }

  private showActions(): void {
    this.current = 'actions';
    const mount = this.ensureMount();
    mount.className = 'bar';
    mount.setAttribute('role', 'toolbar');
    mount.setAttribute('aria-label', 'Highlight');
    mount.replaceChildren(this.action('Add tags', () => this.showTags()), this.action('Add notes', () => this.showNotes()));
    this.reposition();
  }

  private showTags(): void {
    this.current = 'tags';
    const mount = this.ensureMount();
    mount.className = 'editor';
    mount.removeAttribute('role');
    const input = document.createElement('input');
    input.type = 'text';
    input.setAttribute('aria-label', 'Tags');
    input.placeholder = ANNOTATION_TAG_HINT;
    input.value = this.savedTags.map((tag) => `#${tag}`).join(' ');
    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.id = 'annotation-tag-hint';
    hint.textContent = ANNOTATION_TAG_HINT;
    input.setAttribute('aria-describedby', hint.id);
    const error = document.createElement('p');
    error.className = 'error';
    error.setAttribute('role', 'alert');
    mount.replaceChildren(input, hint, error, this.editorRow());
    input.focus();
    this.reposition();
  }

  private showNotes(): void {
    this.current = 'notes';
    const mount = this.ensureMount();
    mount.className = 'editor';
    mount.removeAttribute('role');
    const field = document.createElement('textarea');
    field.setAttribute('aria-label', 'Note');
    field.rows = 3;
    field.value = this.savedNote;
    const error = document.createElement('p');
    error.className = 'error';
    error.setAttribute('role', 'alert');
    mount.replaceChildren(field, error, this.editorRow());
    field.focus();
    this.reposition();
  }

  private ensureMount(): HTMLElement {
    const root = this.root();
    let mount = root.querySelector('.mount') as HTMLElement | null;
    if (!mount) {
      mount = document.createElement('div');
      mount.className = 'mount';
      root.appendChild(mount);
    }
    return mount;
  }

  private action(label: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.setAttribute('aria-label', label);
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    });
    return button;
  }

  private editorRow(): HTMLElement {
    const row = document.createElement('div');
    row.className = 'row';
    const back = this.action('Back', () => this.showActions());
    const save = this.action('Save', () => {
      /* Save is a no-op until saveCurrent replaces this click. */
    });
    row.append(back, save);
    return row;
  }
}
```

Button queries in the tests use `aria-label`. Set that on every button, including Add tags and Add notes.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run vitest run tests/unit/content/ui/selection-annotation-bar.test.ts`

Expected: PASS. If the outside-pointerdown test closes on the inside event, ignore events whose `composedPath()` includes the host. `host.dispatchEvent` from the light DOM includes the host. `document.body.dispatchEvent` does not.

- [ ] **Step 5: Commit**

```bash
git add src/content/ui/selection-annotation-bar.ts src/content/ui/selection-annotation-bar-css.ts tests/unit/content/ui/selection-annotation-bar.test.ts
git commit -m "feat(content): show the selection annotation bar"
```

---

### Task 4: Save note and tags

**Files:**
- Create: `src/content/services/content-highlight-metadata-client.ts`
- Modify: `src/content/ui/selection-annotation-bar.ts` (Save handler, Enter keys, error line)
- Test: `tests/unit/content/services/content-highlight-metadata-client.test.ts`
- Test: `tests/unit/content/ui/selection-annotation-bar.test.ts`

**Interfaces:**
- Consumes: `tagBoxAction` and `parseHashTags` from Task 1. `SelectionAnnotationBarDeps.saveMetadata` from Task 3. `UPDATE_HIGHLIGHT_METADATA` and `MessageResponse` from `@/shared/schemas/message-schemas`. `sanitizeHighlightNote` from `@/shared/utils/highlight-metadata`.
- Produces:

```ts
export function annotationSaveError(field: 'notes' | 'tags', responseError: string | undefined): string;

export class ContentHighlightMetadataClient {
  constructor(messageBus: IMessageBus);
  update(payload: {
    id: string;
    notes?: string;
    tags?: string[];
  }): Promise<{ ok: true } | { ok: false; error: string }>;
}
```

Gate copy, used only when `field === 'tags'` and `response.error` is one of these codes: `AUTH_REQUIRED` → `Sign in to add tags.` `PAID_REQUIRED` → `Tags need a paid account.` `CAPABILITY_DENIED` → `Tags are not available.` `WRONG_SCOPE` → `Tags are not available for this highlight.` Every other failure, including a missing highlight, returns `Couldn't save. Try again.`

- [ ] **Step 1: Write the failing client test**

```ts
import { describe, expect, it, vi } from 'vitest';

import { ContentHighlightMetadataClient } from '@/content/services/content-highlight-metadata-client';
import { UPDATE_HIGHLIGHT_METADATA } from '@/shared/schemas/message-schemas';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';

function client(send: ReturnType<typeof vi.fn>) {
  return new ContentHighlightMetadataClient({ send } as unknown as IMessageBus);
}

describe('ContentHighlightMetadataClient', () => {
  it('sends one metadata field to the background', async () => {
    const send = vi.fn().mockResolvedValue({ success: true, data: undefined });
    const result = await client(send).update({ id: 'hl-1', tags: ['css'] });
    expect(result).toEqual({ ok: true });
    expect(send).toHaveBeenCalledWith(
      'background',
      expect.objectContaining({
        type: UPDATE_HIGHLIGHT_METADATA,
        payload: { id: 'hl-1', tags: ['css'] },
      })
    );
  });

  it('maps a tags gate code and hides other failures', async () => {
    const send = vi.fn().mockResolvedValue({ success: false, error: 'AUTH_REQUIRED' });
    await expect(client(send).update({ id: 'hl-1', tags: ['css'] })).resolves.toEqual({
      ok: false,
      error: 'Sign in to add tags.',
    });
    send.mockResolvedValueOnce({ success: false, error: 'Highlight not found: hl-1' });
    await expect(client(send).update({ id: 'hl-1', notes: 'x' })).resolves.toEqual({
      ok: false,
      error: "Couldn't save. Try again.",
    });
  });
});
```

- [ ] **Step 2: Write the failing bar save tests**

Append to `tests/unit/content/ui/selection-annotation-bar.test.ts`:

```ts
describe('SelectionAnnotationBar save', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('Enter on tags saves the normalized list and returns to the actions', async () => {
    const saveMetadata = vi.fn().mockResolvedValue({ ok: true });
    const ui = new SelectionAnnotationBar({ saveMetadata, isDark: () => false });
    ui.open({ id: 'hl-1', range: rangeAt(rect(200, 220)), note: '', tags: [] });
    const root = document.querySelector('[data-annotation-bar]')!.shadowRoot!;
    (root.querySelector('[aria-label="Add tags"]') as HTMLButtonElement).click();
    const input = root.querySelector('input') as HTMLInputElement;
    input.value = '#One #two';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await vi.waitFor(() => expect(ui.mode()).toBe('actions'));
    expect(saveMetadata).toHaveBeenCalledWith({ id: 'hl-1', tags: ['one', 'two'] });
    (root.querySelector('[aria-label="Add tags"]') as HTMLButtonElement).click();
    expect((root.querySelector('input') as HTMLInputElement).value).toBe('#one #two');
  });

  it('does not send when the tags box has no hash', async () => {
    const saveMetadata = vi.fn().mockResolvedValue({ ok: true });
    const ui = new SelectionAnnotationBar({ saveMetadata, isDark: () => false });
    ui.open({ id: 'hl-1', range: rangeAt(rect(200, 220)), note: '', tags: ['css'] });
    const root = document.querySelector('[data-annotation-bar]')!.shadowRoot!;
    (root.querySelector('[aria-label="Add tags"]') as HTMLButtonElement).click();
    const input = root.querySelector('input') as HTMLInputElement;
    input.value = 'hello';
    (root.querySelector('[aria-label="Save"]') as HTMLButtonElement).click();
    await Promise.resolve();
    expect(saveMetadata).not.toHaveBeenCalled();
    expect(ui.mode()).toBe('tags');
  });

  it('an empty tags box clears the saved tags', async () => {
    const saveMetadata = vi.fn().mockResolvedValue({ ok: true });
    const ui = new SelectionAnnotationBar({ saveMetadata, isDark: () => false });
    ui.open({ id: 'hl-1', range: rangeAt(rect(200, 220)), note: '', tags: ['css'] });
    const root = document.querySelector('[data-annotation-bar]')!.shadowRoot!;
    (root.querySelector('[aria-label="Add tags"]') as HTMLButtonElement).click();
    (root.querySelector('input') as HTMLInputElement).value = '';
    (root.querySelector('[aria-label="Save"]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(ui.mode()).toBe('actions'));
    expect(saveMetadata).toHaveBeenCalledWith({ id: 'hl-1', tags: [] });
  });

  it('Cmd+Enter saves the note and an empty note clears it', async () => {
    const saveMetadata = vi.fn().mockResolvedValue({ ok: true });
    const ui = new SelectionAnnotationBar({ saveMetadata, isDark: () => false });
    ui.open({ id: 'hl-1', range: rangeAt(rect(200, 220)), note: 'old', tags: [] });
    const root = document.querySelector('[data-annotation-bar]')!.shadowRoot!;
    (root.querySelector('[aria-label="Add notes"]') as HTMLButtonElement).click();
    const field = root.querySelector('textarea') as HTMLTextAreaElement;
    field.value = '  A note  ';
    field.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', metaKey: true, bubbles: true })
    );
    await vi.waitFor(() => expect(ui.mode()).toBe('actions'));
    expect(saveMetadata).toHaveBeenCalledWith({ id: 'hl-1', notes: 'A note' });

    (root.querySelector('[aria-label="Add notes"]') as HTMLButtonElement).click();
    const again = root.querySelector('textarea') as HTMLTextAreaElement;
    again.value = '   ';
    again.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true })
    );
    await vi.waitFor(() => expect(saveMetadata).toHaveBeenCalledWith({ id: 'hl-1', notes: '' }));
  });

  it('keeps the box open and shows the error when save fails', async () => {
    const saveMetadata = vi
      .fn()
      .mockResolvedValue({ ok: false, error: "Couldn't save. Try again." });
    const ui = new SelectionAnnotationBar({ saveMetadata, isDark: () => false });
    ui.open({ id: 'hl-1', range: rangeAt(rect(200, 220)), note: '', tags: [] });
    const root = document.querySelector('[data-annotation-bar]')!.shadowRoot!;
    (root.querySelector('[aria-label="Add notes"]') as HTMLButtonElement).click();
    (root.querySelector('textarea') as HTMLTextAreaElement).value = 'x';
    (root.querySelector('[aria-label="Save"]') as HTMLButtonElement).click();
    await vi.waitFor(() => {
      expect(root.querySelector('[role="alert"]')?.textContent).toBe("Couldn't save. Try again.");
    });
    expect(ui.mode()).toBe('notes');
    expect((root.querySelector('[aria-label="Save"]') as HTMLButtonElement).disabled).toBe(false);
  });

  it('ignores a second click while saving', async () => {
    let release: (value: { ok: true }) => void = () => {};
    const saveMetadata = vi.fn(
      () =>
        new Promise<{ ok: true }>((resolve) => {
          release = resolve;
        })
    );
    const ui = new SelectionAnnotationBar({ saveMetadata, isDark: () => false });
    ui.open({ id: 'hl-1', range: rangeAt(rect(200, 220)), note: '', tags: [] });
    const root = document.querySelector('[data-annotation-bar]')!.shadowRoot!;
    (root.querySelector('[aria-label="Add notes"]') as HTMLButtonElement).click();
    (root.querySelector('textarea') as HTMLTextAreaElement).value = 'x';
    const save = root.querySelector('[aria-label="Save"]') as HTMLButtonElement;
    save.click();
    expect(save.textContent).toBe('Saving');
    save.click();
    expect(saveMetadata).toHaveBeenCalledTimes(1);
    release({ ok: true });
    await vi.waitFor(() => expect(ui.mode()).toBe('actions'));
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `bun run vitest run tests/unit/content/services/content-highlight-metadata-client.test.ts tests/unit/content/ui/selection-annotation-bar.test.ts`

Expected: FAIL. Client module missing. Bar Save does not call `saveMetadata`.

- [ ] **Step 4: Write the client**

```ts
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import {
  UPDATE_HIGHLIGHT_METADATA,
  type MessageResponse,
} from '@/shared/schemas/message-schemas';

const GENERIC_SAVE_ERROR = "Couldn't save. Try again.";

const TAG_GATE_COPY: Record<string, string> = {
  AUTH_REQUIRED: 'Sign in to add tags.',
  PAID_REQUIRED: 'Tags need a paid account.',
  CAPABILITY_DENIED: 'Tags are not available.',
  WRONG_SCOPE: 'Tags are not available for this highlight.',
};

export function annotationSaveError(
  field: 'notes' | 'tags',
  responseError: string | undefined
): string {
  if (field === 'tags' && responseError && TAG_GATE_COPY[responseError]) {
    return TAG_GATE_COPY[responseError];
  }
  return GENERIC_SAVE_ERROR;
}

export class ContentHighlightMetadataClient {
  constructor(private readonly messageBus: IMessageBus) {}

  async update(payload: {
    id: string;
    notes?: string;
    tags?: string[];
  }): Promise<{ ok: true } | { ok: false; error: string }> {
    const response = await this.messageBus.send<MessageResponse<undefined>>('background', {
      type: UPDATE_HIGHLIGHT_METADATA,
      payload,
      timestamp: Date.now(),
    });
    if (!response?.success) {
      const field = payload.tags !== undefined ? 'tags' : 'notes';
      return { ok: false, error: annotationSaveError(field, response?.error) };
    }
    return { ok: true };
  }
}
```

- [ ] **Step 5: Wire Save on the bar**

Replace the empty Save click in `editorRow` so the button calls `void this.saveCurrent()`. Add `private saving = false`. Reset `saving` to false inside `close()` and at the start of `showActions`, `showTags`, and `showNotes`.

```ts
private async saveCurrent(): Promise<void> {
  if (this.saving || !this.id) return;
  const root = this.root();
  const error = root.querySelector('.error') as HTMLElement | null;
  if (this.current === 'tags') {
    const input = root.querySelector('input') as HTMLInputElement;
    const action = tagBoxAction(input.value);
    if (action.type === 'noop') return;
    this.saving = true;
    this.setSavingButton(true);
    const result = await this.deps.saveMetadata({ id: this.id, tags: action.tags });
    this.saving = false;
    if (!result.ok) {
      this.setSavingButton(false);
      if (error) error.textContent = result.error;
      return;
    }
    this.savedTags = action.tags;
    this.showActions();
    return;
  }
  if (this.current === 'notes') {
    const field = root.querySelector('textarea') as HTMLTextAreaElement;
    const notes = sanitizeHighlightNote(field.value);
    this.saving = true;
    this.setSavingButton(true);
    const result = await this.deps.saveMetadata({ id: this.id, notes });
    this.saving = false;
    if (!result.ok) {
      this.setSavingButton(false);
      if (error) error.textContent = result.error;
      return;
    }
    this.savedNote = notes;
    this.showActions();
  }
}

private setSavingButton(saving: boolean): void {
  const save = this.root().querySelector('[aria-label="Save"]') as HTMLButtonElement | null;
  if (!save) return;
  save.disabled = saving;
  save.textContent = saving ? 'Saving' : 'Save';
}
```

On the tags `input` `keydown`: if `event.key === 'Enter'`, `preventDefault()` and `void this.saveCurrent()`. On the note `textarea` `keydown`: if `event.key === 'Enter'` and (`event.metaKey` or `event.ctrlKey`), `preventDefault()` and `void this.saveCurrent()`. Plain Enter in the textarea stays the browser default.

Import `tagBoxAction` from `@/content/ui/parse-hash-tags` and `sanitizeHighlightNote` from `@/shared/utils/highlight-metadata`.

- [ ] **Step 6: Run tests to verify they pass**

Run: `bun run vitest run tests/unit/content/services/content-highlight-metadata-client.test.ts tests/unit/content/ui/selection-annotation-bar.test.ts`

Expected: PASS. The shell tests from Task 3 still pass.

- [ ] **Step 7: Commit**

```bash
git add src/content/services/content-highlight-metadata-client.ts src/content/ui/selection-annotation-bar.ts tests/unit/content/services/content-highlight-metadata-client.test.ts tests/unit/content/ui/selection-annotation-bar.test.ts
git commit -m "feat(content): save a note or tags from the selection bar"
```

---

### Task 5: Open the bar from selection

**Files:**
- Create: `src/content/ui/annotation-bar-target.ts`
- Modify: `src/entrypoints/content.ts` (selection handler, delete handler, undo handler)
- Test: `tests/unit/content/ui/annotation-bar-target.test.ts`

**Interfaces:**
- Consumes: `getCreatedHighlightId(): string | null` from Task 2. `SelectionAnnotationBar.open/close/highlightId/isOpen` from Task 3. `ContentHighlightMetadataClient` from Task 4. `ThemeDetector` from `@/content/services/theme-detector`. `repositoryFacade.get` returns a highlight whose `metadata?.notes` and `metadata?.tags` are the prefill.
- Produces:

```ts
export function planAnnotationBarOpen(input: {
  overlappingCount: number;
  createdId: string | null;
}): string | null;
```

Returns `null` when `overlappingCount > 0` or `createdId` is null. Otherwise returns `createdId`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import { planAnnotationBarOpen } from '@/content/ui/annotation-bar-target';

describe('planAnnotationBarOpen', () => {
  it('opens for a new highlight id', () => {
    expect(planAnnotationBarOpen({ overlappingCount: 0, createdId: 'hl-1' })).toBe('hl-1');
  });

  it('does not open when the selection only overlaps existing highlights', () => {
    expect(planAnnotationBarOpen({ overlappingCount: 2, createdId: 'hl-1' })).toBeNull();
  });

  it('does not open when create produced no id', () => {
    expect(planAnnotationBarOpen({ overlappingCount: 0, createdId: null })).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run vitest run tests/unit/content/ui/annotation-bar-target.test.ts`

Expected: FAIL. Module not found.

- [ ] **Step 3: Write the function**

```ts
export function planAnnotationBarOpen(input: {
  overlappingCount: number;
  createdId: string | null;
}): string | null {
  if (input.overlappingCount > 0) return null;
  return input.createdId;
}
```

- [ ] **Step 4: Wire content.ts**

Add imports:

```ts
import { planAnnotationBarOpen } from '@/content/ui/annotation-bar-target';
import { SelectionAnnotationBar } from '@/content/ui/selection-annotation-bar';
import { ContentHighlightMetadataClient } from '@/content/services/content-highlight-metadata-client';
import { ThemeDetector } from '@/content/services/theme-detector';
```

Next to the other content-script services constructed inside `main`, before the selection listener:

```ts
const metadataClient = new ContentHighlightMetadataClient(messageBus);
const themeDetector = new ThemeDetector();
const annotationBar = new SelectionAnnotationBar({
  saveMetadata: (payload) => metadataClient.update(payload),
  isDark: () => {
    try {
      return themeDetector.detect().isDark;
    } catch {
      return false;
    }
  },
});
```

`messageBus` is already in scope in this function (the delete client uses it).

At the start of the `SELECTION_CREATED` handler, before the overlap check, call `annotationBar.close()`. A new selection always dismisses the open bar. The overlap block and its `return` stay as they are, so a split does not open a new one.

After `await commandStack.execute(command)` and before favicon capture, add:

```ts
const barId = planAnnotationBarOpen({
  overlappingCount: overlappingHighlights.length,
  createdId: command.getCreatedHighlightId(),
});
if (barId && event.selection.rangeCount > 0) {
  const stored = repositoryFacade.get(barId);
  annotationBar.open({
    id: barId,
    range: event.selection.getRangeAt(0),
    note: typeof stored?.metadata?.notes === 'string' ? stored.metadata.notes : '',
    tags: Array.isArray(stored?.metadata?.tags) ? stored.metadata.tags : [],
  });
}
```

`overlappingHighlights.length` is `0` on this path because the overlap branch returned. The helper still encodes the rule.

In the `HIGHLIGHT_CLICKED` handler, when `outcome === 'deleted'` and `annotationBar.highlightId() === event.highlightId`, call `annotationBar.close()` before `broadcastCount()`.

In the `CLEAR_SELECTION` loop, after `repositoryFacade.remove(hl.id)`, if `annotationBar.highlightId() === hl.id`, call `annotationBar.close()`.

In the Ctrl+Z undo branch, after `await commandStack.undo()`:

```ts
const openId = annotationBar.highlightId();
if (openId && !modeManager.getHighlight(openId)) annotationBar.close();
```

Do not reopen the bar on redo. Do not change the delete-icon click path other than closing the bar when that same id is deleted.

`src/entrypoints/content.ts` may already contain unrelated uncommitted edits. Stage only the annotation-bar hunks if you can isolate them. Do not commit the other work in this task.

- [ ] **Step 5: Run the new test and type-check**

Run: `bun run vitest run tests/unit/content/ui/annotation-bar-target.test.ts tests/unit/content/ui/selection-annotation-bar.test.ts tests/unit/content/ui/parse-hash-tags.test.ts tests/unit/commands/create-highlight-command.test.ts tests/unit/content/services/content-highlight-metadata-client.test.ts`

Expected: PASS.

Run: `bun run type-check`

Expected: exit 0. If `repositoryFacade.get` metadata needs a cast, narrow with `'metadata' in stored` rather than `any`.

- [ ] **Step 6: Commit**

```bash
git add src/content/ui/annotation-bar-target.ts tests/unit/content/ui/annotation-bar-target.test.ts src/entrypoints/content.ts
git commit -m "feat(content): open the annotation bar after a new highlight"
```

If `content.ts` cannot be staged without unrelated edits, commit the two new files and leave `content.ts` unstaged. Say so in the task report.

- [ ] **Step 7: Update the graph**

Run: `graphify update .`

Expected: the command finishes without an error.

---

## Spec coverage

| Spec requirement | Task |
|---|---|
| Bar after a new highlight, not after overlap split | Task 5 |
| A new selection closes the bar that is already open | Task 5, `annotationBar.close()` at the start of `SELECTION_CREATED` |
| Add tags \| Add notes, expand in place | Task 3 |
| `#` parser, normalize, empty clears, prose does not send | Task 1, Task 4 |
| Hint sentence in the box and under the field | Task 3 |
| Note trim and 2000 cap via `sanitizeHighlightNote` | Task 4 |
| Back and Esc return from the box; Esc and outside pointer close the bar | Task 3 |
| Saved values survive Back | Task 3, Task 4 |
| Enter / Cmd+Enter / Ctrl+Enter | Task 4 |
| Save failure line, Saving lock, no toast | Task 4 |
| Gate reason for tags | Task 4 |
| Prefill from repository metadata, including a duplicate id | Task 5 |
| Anchor, scroll, flip below the top edge | Task 3 |
| Light/dark editorial tokens in the shadow root | Task 3 |
| Close on delete and undo | Task 5 |
| Delete icon and library UI unchanged | No task edits those files |
