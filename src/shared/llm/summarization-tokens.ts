/** Hard ceiling — matches GPT-4o-class max completion; scaled below for small jobs. */
export const MAX_OUTPUT_TOKENS = 16_384;

const MIN_SECTION_OUTPUT = 256;
const MIN_DOMAIN_OUTPUT = 512;

const LENGTH_FACTOR: Record<'short' | 'medium' | 'long', number> = {
  short: 0.55,
  medium: 1,
  long: 1.3,
};

/**
 * Scales with highlight count. Few highlights → small budget; many → up to 16k.
 * The model is prompted to stop once every excerpt is covered — maxTokens is headroom.
 */
export function computeSectionOutputTokens(
  highlightCount: number,
  length: 'short' | 'medium' | 'long' = 'medium'
): number {
  const factor = LENGTH_FACTOR[length];
  const scaled = Math.round((200 + highlightCount * 120) * factor);
  return Math.min(MAX_OUTPUT_TOKENS, Math.max(MIN_SECTION_OUTPUT, scaled));
}

export function computeDomainOutputTokens(
  highlightCount: number,
  sectionCount: number
): number {
  const scaled = 400 + highlightCount * 70 + sectionCount * 150;
  return Math.min(MAX_OUTPUT_TOKENS, Math.max(MIN_DOMAIN_OUTPUT, scaled));
}

/** Q&A answers are usually shorter than summaries; still scales for large scopes. */
export function computeScopeQueryOutputTokens(highlightCount: number): number {
  const scaled = 400 + highlightCount * 50;
  return Math.min(MAX_OUTPUT_TOKENS, Math.max(512, scaled));
}
