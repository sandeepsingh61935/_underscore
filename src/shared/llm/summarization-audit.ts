/**
 * Offline audit helpers for section summarize + domain synthesize payloads.
 * Used to verify token budgets and coverage before changing prompts.
 */

import { buildHighlightExcerpts } from '@/shared/llm/highlight-excerpts';
import { type PromptContext, type PromptHighlight } from '@/shared/llm/prompts';
import {
  buildExcerptSummaryRequest,
  buildReduceDomainRequest,
  formatExcerptUserContent,
} from '@/shared/llm/summary-request';
import {
  computeDomainOutputTokens,
  MAX_OUTPUT_TOKENS,
} from '@/shared/llm/summarization-tokens';
import { getSectionKey } from '@/shared/utils/section-key';

export interface AuditHighlight {
  id: string;
  url: string;
  text: string;
  path?: string;
}

export interface PageCacheSimulator {
  /** page text per normalized url; omit for cache miss */
  get: (url: string) => { title: string; text: string; truncated: boolean } | null;
}

export interface SummarizationAuditInput {
  domain: string;
  highlights: AuditHighlight[];
  pageCache?: PageCacheSimulator;
  /** Bytes cap mirroring content script PageContentCache default */
  pageMaxBytes?: number;
}

export interface FlowAudit {
  flow: 'section-summarize' | 'domain-synthesize';
  scopeLabel: string;
  highlightCount: number;
  uniqueUrlCount: number;
  systemPromptChars: number;
  userMessageChars: number;
  totalInputChars: number;
  estimatedInputTokens: number;
  maxOutputTokens: number;
  outputTokensPerHighlight: number;
  cacheMissUrlCount: number;
  pageBodyChars: number;
  numberedHighlightChars: number;
  issues: string[];
}

/** Rough token estimate (English prose ~4 chars/token). */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function simulateCourseraPageBody(seed: string, maxBytes: number): string {
  const boilerplate = [
    'Coursera | Online Courses & Credentials From Top Educators',
    'Join for Free Log In',
    'Home My Courses Browse',
    '© 2026 Coursera Inc. All rights reserved.',
    'Terms of Use Privacy Policy',
    'Cookie Preferences',
  ].join('\n');

  const paragraph = (n: number) =>
    `Module ${n}: This lecture introduces core concepts, definitions, and worked examples. `
    + `Learners review prerequisites, watch video segments, and complete practice quizzes. `
    + `Key terms include hypothesis testing, confidence intervals, and regression assumptions. `
    + `The instructor emphasizes intuition before formulas and connects ideas to real datasets.`;

  let body = `${boilerplate}\n\n${seed}\n\n`;
  let i = 1;
  while (body.length < maxBytes * 0.85) {
    body += `${paragraph(i)}\n\n`;
    i += 1;
  }
  return body.slice(0, maxBytes);
}

export function defaultPageCacheSimulator(
  highlights: AuditHighlight[],
  maxBytes = 100 * 1024,
): PageCacheSimulator {
  const byUrl = new Map<string, AuditHighlight[]>();
  for (const h of highlights) {
    const list = byUrl.get(h.url) ?? [];
    list.push(h);
    byUrl.set(h.url, list);
  }

  return {
    get(url) {
      const urlHighlights = byUrl.get(url);
      if (!urlHighlights) return null;
      const title = `Coursera | ${url.split('/').filter(Boolean).slice(-2).join(' / ') || 'Course'}`;
      const seed = urlHighlights.map(h => h.text).join(' ');
      const full = simulateCourseraPageBody(seed, maxBytes);
      return { title, text: full, truncated: full.length >= maxBytes };
    },
  };
}

export function groupHighlightsBySection(highlights: AuditHighlight[]): Map<string, AuditHighlight[]> {
  const map = new Map<string, AuditHighlight[]>();
  for (const h of highlights) {
    const key = getSectionKey({ url: h.url, path: h.path });
    const list = map.get(key) ?? [];
    list.push(h);
    map.set(key, list);
  }
  return map;
}

function toPromptHighlights(items: AuditHighlight[], title: string): PromptHighlight[] {
  return items.map(h => ({
    id: h.id,
    text: h.text,
    url: h.url,
    title,
  }));
}

export function auditSectionSummarize(
  sectionKey: string,
  sectionHighlights: AuditHighlight[],
  input: SummarizationAuditInput,
): FlowAudit {
  const pageCache = input.pageCache ?? defaultPageCacheSimulator(input.highlights, input.pageMaxBytes);
  const promptHighlights = toPromptHighlights(sectionHighlights, sectionKey);

  const { excerpts, cacheMissUrls } = buildHighlightExcerpts(
    promptHighlights.map(h => ({ id: h.id, url: h.url, text: h.text })),
    (url) => {
      const cached = pageCache.get(url);
      if (!cached) return null;
      return { url, title: cached.title, text: cached.text, truncated: cached.truncated };
    },
  );

  const ctx: PromptContext = {
    pageTitle: sectionKey,
    pageUrl: input.domain,
    pageContextWithMarks: '',
    pageContext: '',
    highlights: promptHighlights,
    length: 'medium',
  };

  const request = buildExcerptSummaryRequest(ctx, excerpts);
  const systemPrompt = request.systemPrompt;
  const userMessage = request.messages[0]?.content ?? '';
  const excerptBlock = formatExcerptUserContent(excerpts);

  const issues: string[] = [];
  const maxOutput = request.maxTokens;
  const hCount = sectionHighlights.length;

  if (hCount > 40 && maxOutput < MAX_OUTPUT_TOKENS) {
    issues.push(
      `${hCount} highlights — output budget ${maxOutput} tokens may be tight; consider long length mode.`,
    );
  }
  if (cacheMissUrls.length > 0) {
    issues.push(
      `${cacheMissUrls.length} URL(s) missing page cache — excerpt windows use highlight quotes only.`,
    );
  }
  const totalExcerptChars = excerpts.reduce((sum, e) => sum + e.excerpt.length, 0);
  if (totalExcerptChars > 40_000) {
    issues.push('Excerpt windows are very large — consider smaller radius or stricter page cache trimming.');
  }

  return {
    flow: 'section-summarize',
    scopeLabel: sectionKey,
    highlightCount: hCount,
    uniqueUrlCount: new Set(sectionHighlights.map(h => h.url)).size,
    systemPromptChars: systemPrompt.length,
    userMessageChars: userMessage.length,
    totalInputChars: systemPrompt.length + userMessage.length,
    estimatedInputTokens: estimateTokens(systemPrompt + userMessage),
    maxOutputTokens: maxOutput,
    outputTokensPerHighlight: hCount > 0 ? Math.round((maxOutput / hCount) * 10) / 10 : maxOutput,
    cacheMissUrlCount: cacheMissUrls.length,
    pageBodyChars: totalExcerptChars,
    numberedHighlightChars: excerptBlock.length,
    issues,
  };
}

export function auditDomainSynthesize(
  highlights: AuditHighlight[],
  input: SummarizationAuditInput,
): FlowAudit {
  const uniqueUrls = new Set(highlights.map(h => h.url)).size;
  const bySection = groupHighlightsBySection(highlights);
  const sectionCount = bySection.size;

  const maxOutput = computeDomainOutputTokens(highlights.length, sectionCount);
  const placeholderDigests = [...bySection.entries()].map(([sectionKey, items]) => ({
    sectionKey,
    summary: `[section summary for ${items.length} highlights]`,
    highlightCount: items.length,
  }));

  const request = buildReduceDomainRequest(input.domain, placeholderDigests, highlights.length);
  const systemPrompt = request.systemPrompt;
  const userMessage = request.messages[0]?.content ?? '';

  const issues: string[] = [];
  const hCount = highlights.length;

  if (hCount > 30) {
    issues.push(
      `${hCount} highlights across ${sectionCount} sections — one batched excerpt call per section, then domain reduce.`,
    );
  }
  if (maxOutput < hCount * 8) {
    issues.push(
      `Only ${maxOutput} output tokens for ${hCount} highlights (~${Math.floor(maxOutput / hCount)} tokens each).`,
    );
  }

  return {
    flow: 'domain-synthesize',
    scopeLabel: input.domain,
    highlightCount: hCount,
    uniqueUrlCount: uniqueUrls,
    systemPromptChars: systemPrompt.length,
    userMessageChars: userMessage.length,
    totalInputChars: systemPrompt.length + userMessage.length,
    estimatedInputTokens: estimateTokens(systemPrompt + userMessage),
    maxOutputTokens: maxOutput,
    outputTokensPerHighlight: hCount > 0 ? Math.round((maxOutput / hCount) * 10) / 10 : maxOutput,
    cacheMissUrlCount: 0,
    pageBodyChars: 0,
    numberedHighlightChars: userMessage.length,
    issues,
  };
}

export function auditCourseraScale(input: SummarizationAuditInput): {
  domain: string;
  totalHighlights: number;
  sectionCount: number;
  busiestSection: FlowAudit;
  domainSynthesis: FlowAudit;
  allSections: FlowAudit[];
} {
  const bySection = groupHighlightsBySection(input.highlights);
  const allSections = [...bySection.entries()].map(([key, items]) =>
    auditSectionSummarize(key, items, input),
  );
  allSections.sort((a, b) => b.highlightCount - a.highlightCount);
  const busiestSection = allSections[0] ?? auditSectionSummarize('/', [], input);

  return {
    domain: input.domain,
    totalHighlights: input.highlights.length,
    sectionCount: bySection.size,
    busiestSection,
    domainSynthesis: auditDomainSynthesize(input.highlights, input),
    allSections,
  };
}
