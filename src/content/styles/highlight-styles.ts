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
 * Get the CSS highlight name for a given mode and color role
 * CRITICAL: Must be semantic per color/type to avoid DOM explosion
 */
export function getHighlightName(type: HighlightType, colorRole: string): string {
  return `${type}-${colorRole}`;
}

const COLORS = ['yellow', 'blue', 'green', 'pink', 'purple'];

/**
 * Inject global highlight CSS using semantic design tokens
 * Automatically reactive to theme changes via CSS variables
 */
export function injectGlobalHighlightStyles(): void {
  const styleId = `underscore-global-highlight-styles`;
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;

  let css = '';
  for (const color of COLORS) {
    css += `
      ::highlight(underscore-${color}) {
        text-decoration: underline solid;
        text-decoration-color: var(--highlight-${color});
        text-underline-offset: 3px;
        text-decoration-thickness: 2px;
      }
      ::highlight(highlight-${color}) {
        background-color: var(--highlight-${color});
        color: inherit;
      }
      ::highlight(box-${color}) {
        outline: 2px solid var(--highlight-${color});
        outline-offset: 2px;
      }
    `;
  }

  style.textContent = css;
  document.head.appendChild(style);
}
