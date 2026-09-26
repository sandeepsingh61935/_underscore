/**
 * @file selection-annotation-bar-css.ts
 * @description CSS for the selection annotation bar shadow DOM.
 */

export const SELECTION_ANNOTATION_BAR_CSS = `
:host {
  all: initial;
  position: fixed;
  z-index: 2147483647;
  display: block;
}
:host {
  --paper: #f7f5f0;
  --paper-2: #efece4;
  --rule: #1a1a1a;
  --rule-soft: #cfc9bd;
  --ink: #111110;
  --ink-2: #3a3835;
  --ink-3: #6b6760;
  --serif: 'Noto Serif', Georgia, serif;
  --sans: 'DM Sans', system-ui, sans-serif;
  --mono: 'JetBrains Mono', monospace;
  --step--1: 11px;
  --step-0: 13px;
}
:host([data-dark]) {
  --paper: #141312;
  --paper-2: #1e1c1a;
  --rule: #4f4a43;
  --rule-soft: #35322e;
  --ink: #f5f1e8;
  --ink-2: #d8d2c6;
  --ink-3: #b0a99c;
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
.bar button.danger {
  color: #b3261e;
}
:host([data-dark]) .bar button.danger {
  color: #ff8a7a;
}
.bar button:disabled {
  opacity: 0.5;
  cursor: default;
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
`;