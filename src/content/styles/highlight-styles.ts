/**
 * @file highlight-styles.ts
 * @description CSS styles for Custom Highlight API with CSS design tokens
 *
 * Uses ::highlight() pseudo-element for zero-DOM rendering
 * Reactive theming via CSS variables
 */

import type { AnnotationType } from '@/shared/types/annotation';

export type HighlightType = AnnotationType;

/**
 * Get the CSS highlight name for a given mode and id
 * CRITICAL: Must be unique per highlight to avoid collisions
 */
export function getHighlightName(mode: HighlightType, id: string): string {
  return `${mode}-${id}`;
}

/**
 * Inject highlight CSS using semantic design tokens
 * Automatically reactive to theme changes via CSS variables
 *
 * @param type Highlight type
 * @param id Highlight ID
 * @param colorRole Semantic color role (e.g., 'yellow', 'blue')
 */
export function injectHighlightCSS(
  type: HighlightType,
  id: string,
  colorRole: string
): void {
  const highlightName = getHighlightName(type, id);
  const styleId = `hl-style-${id}`;

  // Remove existing style if present
  const existing = document.getElementById(styleId);
  if (existing) {
    existing.remove();
  }

  // Create style element
  const style = document.createElement('style');
  style.id = styleId;

  // Generate CSS based on mode
  let css = '';
  switch (type) {
    case 'underscore':
      css = `::highlight(${highlightName}) {
                text-decoration: underline solid;
                text-decoration-color: var(--highlight-${colorRole});
                text-underline-offset: 3px;
                text-decoration-thickness: 2px;
            }`;
      break;
    case 'highlight':
      css = `::highlight(${highlightName}) {
                background-color: var(--highlight-${colorRole});
                color: inherit;
            }`;
      break;
    case 'box':
      css = `::highlight(${highlightName}) {
                outline: 2px solid var(--highlight-${colorRole});
                outline-offset: 2px;
            }`;
      break;
    default:
      css = `::highlight(${highlightName}) {
                background-color: var(--highlight-${colorRole});
            }`;
  }

  style.textContent = css;
  document.head.appendChild(style);
}

/**
 * Remove CSS for a highlight
 */
export function removeHighlightCSS(id: string): void {
  const styleId = `hl-style-${id}`;
  const existing = document.getElementById(styleId);
  if (existing) {
    existing.remove();
  }
}
