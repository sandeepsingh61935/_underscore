/**
 * Strategy interface for generating annotation styles
 */
export interface AnnotationStyleStrategy {
  /**
   * Generate CSS styles for the shadow DOM of the annotation
   * @param color The base color (hex or var)
   */
  getStyles(color: string): string;
}

/**
 * Base abstract strategy with common utilities
 */
abstract class BaseAnnotationStrategy implements AnnotationStyleStrategy {
  abstract getStyles(color: string): string;

  protected getBaseStyles(color: string, rgb?: string): string {
    return `
      :host {
        --annotation-color: ${color};
        ${rgb ? `--annotation-rgb: ${rgb};` : ''}
        cursor: pointer;
      }
    `;
  }

  protected parseColor(color: string): string | null {
    if (color.startsWith('var(')) return null;

    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }
}

/**
 * Strategy for the "Underscore" style (Default)
 */
export class UnderscoreStrategy extends BaseAnnotationStrategy {
  getStyles(color: string): string {
    const rgb = this.parseColor(color);
    const base = this.getBaseStyles(color, rgb || undefined);

    return (
      base +
      `
      :host {
        text-decoration: underline;
        text-decoration-color: var(--annotation-color);
        text-decoration-thickness: 2px;
        text-underline-offset: 2px;
        transition: all 0.2s ease;
      }
      :host(:hover) {
        text-decoration-thickness: 3px;
        text-shadow: 0 0 8px ${color};
      }
    `
    );
  }
}

/**
 * Strategy for the traditional "Highlight" marker style
 */
export class HighlightStrategy extends BaseAnnotationStrategy {
  getStyles(color: string): string {
    const rgb = this.parseColor(color);
    const base = this.getBaseStyles(color, rgb || undefined);

    // Dynamic bg for variables vs static rgba for hex
    const bgStyle = !rgb
      ? `background-color: color-mix(in srgb, var(--annotation-color), transparent 76%);`
      : `background-color: rgba(var(--annotation-rgb), 0.24);`;

    const hoverBgStyle = !rgb
      ? `filter: brightness(0.9);`
      : `background-color: rgba(var(--annotation-rgb), 0.32);`;

    return (
      base +
      `
      :host {
        ${bgStyle}
        border-radius: 2px;
      }
      :host(:hover) {
        ${hoverBgStyle}
      }
    `
    );
  }
}

/**
 * Strategy for "Box" style
 */
export class BoxStrategy extends BaseAnnotationStrategy {
  getStyles(color: string): string {
    const rgb = this.parseColor(color);
    const base = this.getBaseStyles(color, rgb || undefined);

    const hoverBgStyle = !rgb
      ? `background-color: color-mix(in srgb, var(--annotation-color), transparent 92%);`
      : `background-color: rgba(var(--annotation-rgb), 0.08);`;

    return (
      base +
      `
      :host {
        border: 2px solid var(--annotation-color);
        border-radius: 4px;
        padding: 2px 4px;
        margin: 2px 0;
        display: inline;
        box-decoration-break: clone;
        -webkit-box-decoration-break: clone;
      }
      :host(:hover) {
        ${hoverBgStyle}
      }
    `
    );
  }
}

/**
 * Registry to retrieve strategies
 */
export const strategyRegistry = {
  underscore: new UnderscoreStrategy(),
  highlight: new HighlightStrategy(),
  box: new BoxStrategy(),
} as const;

export type StrategyType = keyof typeof strategyRegistry;
