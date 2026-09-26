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
    let root = document.querySelector('[data-annotation-bar]')!.shadowRoot!;
    (root.querySelector('[aria-label="Add tags"]') as HTMLButtonElement).click();

    const input = root.querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('aria-label')).toBe('Tags');
    expect(input.placeholder).toContain('#word');
    expect(root.textContent).toContain(
      'A #word is a tag. Write #one #two to add several.'
    );
    expect(input.value).toBe('#css');

    input.value = '#draft';
    (root.querySelector('[aria-label="Back"]') as HTMLButtonElement).click();
    expect(ui.mode()).toBe('actions');

    (root.querySelector('[aria-label="Add tags"]') as HTMLButtonElement).click();
    root = document.querySelector('[data-annotation-bar]')!.shadowRoot!;
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
    let root = document.querySelector('[data-annotation-bar]')!.shadowRoot!;
    (root.querySelector('[aria-label="Add notes"]') as HTMLButtonElement).click();
    const field = root.querySelector('textarea') as HTMLTextAreaElement;
    expect(field.value).toBe('saved note');
    expect(field.getAttribute('aria-label')).toBe('Note');
    field.value = 'draft';
    (root.querySelector('[aria-label="Back"]') as HTMLButtonElement).click();
    (root.querySelector('[aria-label="Add notes"]') as HTMLButtonElement).click();
    root = document.querySelector('[data-annotation-bar]')!.shadowRoot!;
    expect((root.querySelector('textarea') as HTMLTextAreaElement).value).toBe(
      'saved note'
    );
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
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );
    expect(ui.mode()).toBe('actions');
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );
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
    expect(
      document.querySelector('[data-annotation-bar]')?.getAttribute('data-dark')
    ).toBe('true');
    ui.close();
  });

  it('without onDelete renders only Add tags and Add notes', () => {
    const ui = bar();
    ui.open({ id: 'hl-1', range: rangeAt(rect(200, 220)), note: '', tags: [] });
    const root = document.querySelector('[data-annotation-bar]')!.shadowRoot!;
    const actions = [...root.querySelectorAll('button')].map((b) => b.textContent);
    expect(actions).toEqual(['Add tags', 'Add notes']);
    expect(root.querySelector('[aria-label="Delete"]')).toBeNull();
    ui.close();
  });

  it('with onDelete renders Delete last with destructive styling', () => {
    const ui = bar();
    ui.open({
      id: 'hl-1',
      range: rangeAt(rect(200, 220)),
      note: 'kept',
      tags: ['css'],
      onDelete: vi.fn(),
    });
    const root = document.querySelector('[data-annotation-bar]')!.shadowRoot!;
    const actions = [...root.querySelectorAll('button')].map((b) => b.textContent);
    expect(actions).toEqual(['Add tags', 'Add notes', 'Delete']);
    expect(
      root.querySelector('[aria-label="Delete"]')?.classList.contains('danger')
    ).toBe(true);
    ui.close();
  });

  it('clicking Delete invokes onDelete and leaves close to the caller', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const ui = bar();
    ui.open({
      id: 'hl-1',
      range: rangeAt(rect(200, 220)),
      note: '',
      tags: [],
      onDelete,
    });
    const root = document.querySelector('[data-annotation-bar]')!.shadowRoot!;
    (root.querySelector('[aria-label="Delete"]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
    expect(ui.isOpen()).toBe(true);
    ui.close();
  });

  it('ignores repeated Delete clicks while a delete is in flight', async () => {
    let release: () => void = () => {};
    const onDelete = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        })
    );
    const ui = bar();
    ui.open({
      id: 'hl-1',
      range: rangeAt(rect(200, 220)),
      note: '',
      tags: [],
      onDelete,
    });
    const root = document.querySelector('[data-annotation-bar]')!.shadowRoot!;
    const del = root.querySelector('[aria-label="Delete"]') as HTMLButtonElement;
    del.click();
    del.click();
    expect(onDelete).toHaveBeenCalledTimes(1);
    release();
    await vi.waitFor(() => expect(del.disabled).toBe(false));
    ui.close();
  });

  it('Delete is hidden while a tags/notes editor is open', () => {
    const ui = bar();
    ui.open({
      id: 'hl-1',
      range: rangeAt(rect(200, 220)),
      note: '',
      tags: [],
      onDelete: vi.fn(),
    });
    const root = document.querySelector('[data-annotation-bar]')!.shadowRoot!;
    (root.querySelector('[aria-label="Add tags"]') as HTMLButtonElement).click();
    expect(root.querySelector('[aria-label="Delete"]')).toBeNull();
    (root.querySelector('[aria-label="Back"]') as HTMLButtonElement).click();
    expect(root.querySelector('[aria-label="Delete"]')).not.toBeNull();
    ui.close();
  });
});

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
    await vi.waitFor(() =>
      expect(saveMetadata).toHaveBeenCalledWith({ id: 'hl-1', notes: '' })
    );
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
      expect(root.querySelector('[role="alert"]')?.textContent).toBe(
        "Couldn't save. Try again."
      );
    });
    expect(ui.mode()).toBe('notes');
    expect(
      (root.querySelector('[aria-label="Save"]') as HTMLButtonElement).disabled
    ).toBe(false);
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
