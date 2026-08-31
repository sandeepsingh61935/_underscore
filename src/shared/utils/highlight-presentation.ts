/**
 * App-only presentation of an immutable quote.
 * Never mutates stored `text`; used for library/export display.
 */

import { z } from 'zod';

export const HIGHLIGHT_PRESENTATION_FORMATS = [
  'as_captured',
  'code',
  'bullets',
  'numbered',
] as const;

export type HighlightPresentationFormat = (typeof HIGHLIGHT_PRESENTATION_FORMATS)[number];

export const HighlightPresentationSchema = z.object({
  format: z.enum(HIGHLIGHT_PRESENTATION_FORMATS),
  language: z.string().max(32).optional(),
});

export type HighlightPresentation = z.infer<typeof HighlightPresentationSchema>;

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
 * Display helper: wrap plain code body in markdown fences for ReactMarkdown
 * only when not already fenced. Shared-pure (no DOM). Do not use as TextQuote exact.
 */
export function wrapAsMarkdownCodeFence(source: string, language?: string): string {
  const trimmed = source.replace(/^\n+|\n+$/g, '');
  if (/^```/.test(trimmed)) return source;
  const lang = language?.trim() ?? '';
  return '```' + lang + '\n' + trimmed + '\n```';
}

/**
 * User presentation wins; else capture sourceKind=code → code; else as_captured.
 */
export function resolveHighlightPresentation(
  input: PresentationResolveInput | null | undefined
): ResolvedPresentation {
  const user = input?.presentation;
  if (user?.format && isPresentationFormat(user.format)) {
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
  resolved: ResolvedPresentation
): string {
  const body = text ?? '';
  switch (resolved.format) {
    case 'code':
      return wrapAsMarkdownCodeFence(body, resolved.language);
    case 'bullets': {
      const lines = body
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length === 0) return body;
      return lines.map((l) => `- ${l}`).join('\n');
    }
    case 'numbered': {
      const lines = body
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length === 0) return body;
      return lines.map((l, i) => `${i + 1}. ${l}`).join('\n');
    }
    case 'as_captured':
    default:
      return body;
  }
}

export const PRESENTATION_FORMAT_LABELS: Record<HighlightPresentationFormat, string> = {
  as_captured: 'As captured',
  code: 'Code',
  bullets: 'Bullets',
  numbered: 'Numbered',
};

function isPresentationFormat(value: string): value is HighlightPresentationFormat {
  return (HIGHLIGHT_PRESENTATION_FORMATS as readonly string[]).includes(value);
}

/**
 * Normalize user presentation for persistence.
 * Legacy `plain` (no-op) maps to as_captured so old rows stay valid.
 */
export function normalizePresentation(
  input: HighlightPresentation | { format: string; language?: string } | null | undefined
): HighlightPresentation | undefined {
  if (input == null) return undefined;
  let format = input.format;
  // Pre-cleanup format that was identical to as_captured.
  if (format === 'plain') format = 'as_captured';
  if (!isPresentationFormat(format)) return undefined;
  const language =
    typeof input.language === 'string' && input.language.trim()
      ? input.language.trim().slice(0, 32).toLowerCase()
      : undefined;
  return {
    format,
    ...(language ? { language } : {}),
  };
}
