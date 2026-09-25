/**
 * @file selection-annotation-bar.ts
 * @description Shadow-DOM annotation bar for the selection toolbar.
 */

import { tagBoxAction } from '@/content/ui/parse-hash-tags';
import { SELECTION_ANNOTATION_BAR_CSS } from '@/content/ui/selection-annotation-bar-css';
import { sanitizeHighlightNote } from '@/shared/utils/highlight-metadata';

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
  private mount: HTMLElement | null = null;
  private range: Range | null = null;
  private id: string | null = null;
  private savedNote = '';
  private savedTags: string[] = [];
  private current: AnnotationBarMode = 'closed';
  private saving = false;
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
    this.mount = document.createElement('div');
    this.mount.setAttribute('data-mount', '');
    root.appendChild(this.mount);
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
    this.mount = null;
    this.range = null;
    this.id = null;
    this.current = 'closed';
    this.saving = false;
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
    this.saving = false;
    this.current = 'actions';
    const mount = this.ensureMount();
    mount.className = 'bar';
    mount.setAttribute('role', 'toolbar');
    mount.setAttribute('aria-label', 'Highlight');
    mount.replaceChildren(
      this.action('Add tags', () => this.showTags()),
      this.action('Add notes', () => this.showNotes())
    );
    this.reposition();
  }

  private showTags(): void {
    this.saving = false;
    this.current = 'tags';
    const mount = this.ensureMount();
    mount.className = 'editor';
    mount.removeAttribute('role');
    const input = document.createElement('input');
    input.type = 'text';
    input.setAttribute('aria-label', 'Tags');
    input.placeholder = ANNOTATION_TAG_HINT;
    input.value = this.savedTags.map((tag) => `#${tag}`).join(' ');
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        void this.saveCurrent();
      }
    });
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
    this.saving = false;
    this.current = 'notes';
    const mount = this.ensureMount();
    mount.className = 'editor';
    mount.removeAttribute('role');
    const field = document.createElement('textarea');
    field.setAttribute('aria-label', 'Note');
    field.rows = 3;
    field.value = this.savedNote;
    field.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        void this.saveCurrent();
      }
    });
    const error = document.createElement('p');
    error.className = 'error';
    error.setAttribute('role', 'alert');
    mount.replaceChildren(field, error, this.editorRow());
    field.focus();
    this.reposition();
  }

  private ensureMount(): HTMLElement {
    if (!this.mount) {
      const root = this.root();
      this.mount = document.createElement('div');
      this.mount.setAttribute('data-mount', '');
      root.appendChild(this.mount);
    }
    return this.mount;
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
      void this.saveCurrent();
    });
    row.append(back, save);
    return row;
  }

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
}