import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, it, expect } from 'vitest';

import {
  auditCourseraScale,
  type AuditHighlight,
} from '@/shared/llm/summarization-audit';

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const highlights = JSON.parse(
  readFileSync(join(fixtureDir, '../../../fixtures/coursera-scale-highlights.json'), 'utf8'),
) as AuditHighlight[];

describe('summarization audit (coursera-scale fixture)', () => {
  const report = auditCourseraScale({
    domain: 'www.coursera.org',
    highlights,
  });

  it('models a large domain (50 highlights, multiple sections)', () => {
    expect(report.totalHighlights).toBe(50);
    expect(report.sectionCount).toBeGreaterThanOrEqual(6);
  });

  it('section summarize uses scaled output tokens', () => {
    expect(report.busiestSection.maxOutputTokens).toBeGreaterThanOrEqual(256);
    expect(report.busiestSection.flow).toBe('section-summarize');
  });

  it('busiest section uses one batched excerpt call', () => {
    const busiest = report.busiestSection;
    expect(busiest.highlightCount).toBeGreaterThanOrEqual(8);
    expect(busiest.estimatedInputTokens).toBeLessThan(15_000);
  });

  it('section summarize uses excerpt windows, not full page body', () => {
    expect(report.busiestSection.pageBodyChars).toBeLessThan(50_000);
    expect(report.busiestSection.estimatedInputTokens).toBeLessThan(15_000);
  });

  it('domain synthesize uses scaled output from section digests', () => {
    const domain = report.domainSynthesis;
    expect(domain.highlightCount).toBe(50);
    expect(domain.maxOutputTokens).toBeGreaterThan(1024);
    expect(domain.pageBodyChars).toBe(0);
    expect(domain.issues.some(i => i.includes('section'))).toBe(true);
  });

  it('logs audit snapshot for manual review', () => {
    const snapshot = {
      domain: report.domain,
      totalHighlights: report.totalHighlights,
      sectionCount: report.sectionCount,
      busiestSection: {
        section: report.busiestSection.scopeLabel,
        highlights: report.busiestSection.highlightCount,
        inputTokens: report.busiestSection.estimatedInputTokens,
        outputTokens: report.busiestSection.maxOutputTokens,
        tokensPerHighlight: report.busiestSection.outputTokensPerHighlight,
        issues: report.busiestSection.issues,
      },
      domainSynthesis: {
        inputTokens: report.domainSynthesis.estimatedInputTokens,
        outputTokens: report.domainSynthesis.maxOutputTokens,
        tokensPerHighlight: report.domainSynthesis.outputTokensPerHighlight,
        issues: report.domainSynthesis.issues,
      },
    };
    console.info('[summarization-audit]', JSON.stringify(snapshot, null, 2));
    expect(snapshot.busiestSection.highlights).toBeGreaterThan(0);
    expect(snapshot.domainSynthesis.issues.length).toBeGreaterThan(0);
  });
});
