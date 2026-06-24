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

  summarizePage: (ctx: PromptContext): string => `
You are summarizing what a reader found important on this page.
Page: ${ctx.pageTitle} (${ctx.pageUrl})
Full page content (highlighted spans wrapped in <mark>):
${ctx.pageContextWithMarks}
The reader highlighted ${ctx.highlights.length} span(s):
${ctx.highlights.map(h => `<mark>${h.text}</mark>`).join('\n')}
Write a ${ctx.length ?? 'medium'} summary emphasizing what the reader chose to mark.
`.trim(),

  synthesizeDomain: (ctx: PromptContext): string => `
You are synthesizing a reader's understanding across multiple pages on ${ctx.domain ?? 'this domain'}.
The reader highlighted ${ctx.highlights.length} spans across ${ctx.uniqueUrls ?? ctx.highlights.length} pages:
${ctx.highlights.map(h => `[${h.url}] ${h.text}`).join('\n')}
Identify the recurring themes, the connections between pages, and any contradictions.
Return: { themes: [...], connections: [...], contradictions: [...] }
`.trim(),
} as const;

export type PromptTemplateName = keyof typeof PROMPT_TEMPLATES;