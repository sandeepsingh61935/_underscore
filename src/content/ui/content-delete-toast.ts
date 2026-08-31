/**
 * Minimal in-page undo toast for content-script highlight deletes.
 * Popup uses sonner; content pages use this lightweight overlay.
 */

const TOAST_ID = 'underscore-delete-toast';

export function showDeleteUndoToast(
  message: string,
  onUndo: () => void,
  durationMs = 5000
): void {
  dismissDeleteUndoToast();

  const root = document.createElement('div');
  root.id = TOAST_ID;
  root.setAttribute('role', 'status');
  root.setAttribute('aria-live', 'polite');
  root.style.cssText = [
    'position:fixed',
    'bottom:24px',
    'right:24px',
    'z-index:2147483646',
    'display:flex',
    'align-items:center',
    'gap:12px',
    'padding:10px 14px',
    'background:var(--paper, #faf8f5)',
    'color:var(--ink, #1a1a1a)',
    'border:1px solid var(--rule, #d8d2c8)',
    'font:500 13px/1.4 var(--sans, system-ui, sans-serif)',
    'box-shadow:0 4px 16px rgba(0,0,0,0.12)',
  ].join(';');

  const text = document.createElement('span');
  text.textContent = message;

  const undoBtn = document.createElement('button');
  undoBtn.type = 'button';
  undoBtn.textContent = 'Undo';
  undoBtn.style.cssText = [
    'all:unset',
    'cursor:pointer',
    'color:var(--accent, #b85c38)',
    'font:600 12px/1 var(--mono, monospace)',
    'letter-spacing:0.06em',
    'text-transform:uppercase',
  ].join(';');
  undoBtn.addEventListener('click', () => {
    dismissDeleteUndoToast();
    onUndo();
  });

  root.append(text, undoBtn);
  document.body.appendChild(root);

  window.setTimeout(() => {
    dismissDeleteUndoToast();
  }, durationMs);
}

export function showDeleteErrorToast(message: string, durationMs = 4000): void {
  dismissDeleteUndoToast();

  const root = document.createElement('div');
  root.id = TOAST_ID;
  root.setAttribute('role', 'alert');
  root.style.cssText = [
    'position:fixed',
    'bottom:24px',
    'right:24px',
    'z-index:2147483646',
    'padding:10px 14px',
    'background:var(--paper, #faf8f5)',
    'color:var(--ink, #1a1a1a)',
    'border:1px solid var(--accent, #b85c38)',
    'font:500 13px/1.4 var(--sans, system-ui, sans-serif)',
    'box-shadow:0 4px 16px rgba(0,0,0,0.12)',
  ].join(';');
  root.textContent = message;
  document.body.appendChild(root);

  window.setTimeout(() => {
    dismissDeleteUndoToast();
  }, durationMs);
}

export function dismissDeleteUndoToast(): void {
  document.getElementById(TOAST_ID)?.remove();
}
