/**
 * @file highlight-styles.ts
 * @description Paint helpers for highlight registry naming and color roles.
 *
 * Visual styles live only in `highlight-paint.css` (WXT content.css).
 * No JS-injected ::highlight CSS — host-page paint is overlay-only.
 */

import type { AnnotationType } from '@/shared/types/annotation';
import type { ColorRole } from '@/shared/schemas/highlight-schema';
import { ColorRoleSchema } from '@/shared/schemas/highlight-schema';

export type HighlightType = AnnotationType;

/**
 * Get the semantic name for a type + color role (overlay data-color / logs).
 */
export function getHighlightName(type: HighlightType, colorRole: string): string {
  return `${type}-${colorRole}`;
}

/**
 * Resolve a paint color role from storage fields.
 * Prefers colorRole; accepts deprecated color only when it is a known role
 * (legacy hex values map to yellow).
 */
export function resolveColorRoleForPaint(
  colorRole?: string | null,
  color?: string | null
): ColorRole {
  const candidates = [colorRole, color];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const parsed = ColorRoleSchema.safeParse(candidate);
    if (parsed.success) return parsed.data;
  }
  return 'yellow';
}

/**
 * Normalize annotation type for paint metadata.
 */
export function resolveHighlightTypeForPaint(type?: string | null): HighlightType {
  if (type === 'highlight' || type === 'box' || type === 'underscore') {
    return type;
  }
  return 'underscore';
}
