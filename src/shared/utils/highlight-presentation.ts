/**
 * App-only presentation of an immutable quote.
 * Never mutates stored `text`; used for library/export display.
 */

import { wrapAsMarkdownCodeFence } from '@/content/utils/code-selection-metadata';

export const HIGHLIGHT_PRESENTATION_FORMATS = [
  'as_captured',
  'plain',
  'code',
  'bullets',
  'numbered',
] as const;

export type HighlightPresentationFormat = (typeof HIGHLIGHT_PRESENTATION_FORMATS)[number];

export interface HighlightPresentation {
  format: HighlightPresentationFormat;
  language?: string;
}

export interface PresentationResolveInput {
  sourceKind?: 'code';
  language?: string;
  presentation?: HighlightPresentation | null;
}

export interface ResolvedPresentation {
  format: HighlightPresentationFormat;
  language?: string;
}

/**
 * User presentation wins; else capture sourceKind=code → code; else as_captured.
 */
export function resolveHighlightPresentation(
  input: PresentationResolveInput | null | undefined,
): ResolvedPresentation {
  const user = input?.presentation;
  if (user?.format) {
    return {
      format: user.format,
      language: user.language ?? input?.language,
    };
  }
  if (input?.sourceKind === 'code') {
    return { format: 'code', language: input.language };
  }
  return { format: 'as_captured', language: input?.language };
}

/**
 * Map immutable quote + resolved format → markdown string for HighlightMarkdownBody.
 */
export function applyPresentationToDisplaySource(
  text: string,
  resolved: ResolvedPresentation,
): string {
  const body = text ?? '';
  switch (resolved.format) {
    case 'code':
      return wrapAsMarkdownCodeFence(body, resolved.language);
    case 'bullets': {
      const lines = body.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) return body;
      return lines.map((l) => `- ${l}`).join('\n');
    }
    case 'numbered': {
      const lines = body.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) return body;
      return lines.map((l, i) => `${i + 1}. ${l}`).join('\n');
    }
    case 'plain':
    case 'as_captured':
    default:
      return body;
  }
}

export const PRESENTATION_FORMAT_LABELS: Record<HighlightPresentationFormat, string> = {
  as_captured: 'As captured',
  plain: 'Plain',
  code: 'Code',
  bullets: 'Bullets',
  numbered: 'Numbered',
};
