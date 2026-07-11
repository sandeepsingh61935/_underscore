/**
 * Three prompt templates mapping the highlight/page/domain scope (ADR-021 §3).
 */

export interface PromptHighlight {
  id: string;
  text: string;
  url: string;
  title: string;
}

export interface PromptContext {
  pageTitle: string;
  pageUrl: string;
  /** Full page text with <mark> around highlighted spans. */
  pageContextWithMarks: string;
  /** Surrounding context text without marks (used by `explain`). */
  pageContext: string;
  highlights: PromptHighlight[];
  /** eTLD+1 domain, present for synthesizeDomain. */
  domain?: string;
  /** Distinct URLs in the highlight set, present for synthesizeDomain. */
  uniqueUrls?: number;
  length?: 'short' | 'medium' | 'long';
}

export type ScopeKind = 'section' | 'domain';

export interface ScopeQueryContext {
  scopeLabel: string;
  scopeKind: ScopeKind;
  highlightCount: number;
}

const SUMMARY_LENGTH_GUIDE: Record<NonNullable<PromptContext['length']>, string> = {
  short: 'Write 2-4 sentences.',
  medium: 'Write 1-2 short paragraphs (roughly 120-200 words).',
  long: 'Write 2-4 paragraphs (roughly 250-400 words) with enough detail to capture nuance in the highlights.',
};

function excerptLengthGuide(count: number, length: NonNullable<PromptContext['length']>): string {
  if (length === 'short') {
    return 'Keep it brief — only as long as needed to cover each excerpt.';
  }
  if (count <= 3) {
    return 'Few highlights: a short paragraph or two is enough. Do not pad.';
  }
  if (count <= 12) {
    return 'Write proportionally: typically 1-3 paragraphs. Stop once every [n] is clearly covered.';
  }
  if (count <= 40) {
    return 'Many highlights: allow several paragraphs so each excerpt gets room. Use more length only where needed.';
  }
  return 'Very many highlights: you may use a long response if required to cover every excerpt fairly — but no filler, repetition, or generic recap.';
}

export const PROMPT_TEMPLATES = {
  explain: (ctx: PromptContext): string => {
    const first = ctx.highlights[0];
    if (!first) throw new Error('PROMPT_TEMPLATES.explain requires at least one highlight');
    return `
You are helping a reader understand a specific passage they marked.
Page: ${ctx.pageTitle} (${ctx.pageUrl})
Surrounding context: ${ctx.pageContext}
Highlighted span: """${first.text}"""
Explain this passage in 2-3 sentences, focusing on what makes it worth highlighting.
`.trim();
  },

  summarizePage: (ctx: PromptContext): string => {
    const length = ctx.length ?? 'medium';
    const count = ctx.highlights.length;
    return `
You are a reading assistant. The user read "${ctx.pageTitle}" (${ctx.pageUrl}) and manually highlighted ${count} passage${count === 1 ? '' : 's'} — those selections are their signal of what matters.

Your task: summarize what the reader cared about on this page. Do not write a generic page recap.

Rules:
1. Treat the numbered highlight list and <mark>...</mark> spans in the user message as highest-priority source material. Every highlight should be clearly represented in your summary.
2. Use surrounding page text only for context and connective tissue — not as the main subject.
3. Ignore navigation chrome, cookie banners, footers, sidebars, and repetitive boilerplate.
4. Stay faithful to the source. Do not add outside knowledge, speculation, or opinions not supported by the text.
5. ${SUMMARY_LENGTH_GUIDE[length]}
6. Write clear, flowing prose in complete sentences. No JSON, no bullet lists unless the source itself is a list.

Answer the question: "What did this reader find worth remembering on this page?"
`.trim();
  },

  summarizeExcerpts: (ctx: PromptContext): string => {
    const count = ctx.highlights.length;
    const length = ctx.length ?? 'medium';
    return `
You are a reading assistant. The user read "${ctx.pageTitle}" and highlighted ${count} passage${count === 1 ? '' : 's'} on this section.

You receive numbered excerpt windows — each shows the user's <mark> selection plus a little surrounding context. There is no full page body.

Rules:
1. Cover every numbered excerpt [1]…[${count}]. None may be skipped or merged away silently.
2. Lead with what the reader marked; use surrounding text only to clarify meaning.
3. Stay faithful to the excerpts. No outside knowledge, speculation, or generic page recap.
4. ${excerptLengthGuide(count, length)}
5. Write flowing prose in complete sentences. No JSON. No bullet lists unless the source itself is a list.

Answer: "What did this reader find worth remembering here?"
`.trim();
  },

  askScope: (scope: ScopeQueryContext): string => {
    const scopeNoun = scope.scopeKind === 'domain' ? 'domain' : 'section';
    return `
You answer questions about a reader's saved highlights on ${scopeNoun} "${scope.scopeLabel}" (${scope.highlightCount} highlight${scope.highlightCount === 1 ? '' : 's'}).

You receive ONLY numbered excerpt windows — each shows the user's <mark> selection plus brief surrounding context. There is no full page body and no outside knowledge.

Rules:
1. Answer ONLY from the excerpts in the user message. Do not use the web, general knowledge, or guesswork.
2. Cite excerpt numbers like [2] or [2, 5] when pointing to specific highlights.
3. If the question cannot be answered from these excerpts, reply exactly: "That isn't covered in your highlights for this ${scopeNoun}."
4. Be direct and concise unless the question needs more detail to be useful.
5. Flowing prose or short paragraphs. No JSON unless the user explicitly asks for structured output.
`.trim();
  },

  reduceDomainSynthesis: (domain: string, totalHighlights: number, sectionCount: number): string => `
You synthesize a reader's highlights across ${sectionCount} section${sectionCount === 1 ? '' : 's'} on ${domain} (${totalHighlights} total highlights).

You receive section-level summaries, not raw pages.

Rules:
1. Identify recurring themes and how ideas build across sections.
2. Note connections and any tensions or open questions — only if supported by the section summaries.
3. Write clear prose. Short markdown headings (##) are allowed for structure.
4. Be as long as needed to synthesize well, but no filler — stop when themes are fully covered.
5. No JSON. No raw highlight dumps.
6. Stay faithful to the provided section summaries.
`.trim(),

  synthesizeDomain: (ctx: PromptContext): string => `
You are synthesizing a reader's understanding across multiple pages on ${ctx.domain ?? 'this domain'}.
The reader highlighted ${ctx.highlights.length} spans across ${ctx.uniqueUrls ?? ctx.highlights.length} pages:
${ctx.highlights.map(h => `[${h.url}] ${h.text}`).join('\n')}
Identify the recurring themes, the connections between pages, and any contradictions.
Write clear prose with short headings. No JSON.
`.trim(),
} as const;

export type PromptTemplateName = keyof typeof PROMPT_TEMPLATES;
