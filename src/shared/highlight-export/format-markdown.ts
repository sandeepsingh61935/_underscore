/**
 * @file format-markdown.ts
 * @description Pure markdown formatter for highlight export/copy.
 */

import type { ExportArtifactsBundle } from '@/shared/llm/llm-artifact-service';
import type { ExportableHighlight, ExportResult, ExportScope, ExportStats } from './types';
import { buildFilename } from './filename';
import { partitionExportable } from './normalize';

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Source annotation: plain URL only (no markdown link — the URL is the citation).
 * Example: `[source] https://chatgpt.com/g/...`
 */
export function formatSourceAnnotation(url: string): string {
  return `[source] ${url}`;
}

function formatHighlightBlock(h: ExportableHighlight, index: number): string {
  const quote = h.text.replace(/"/g, '\\"');
  const lines: string[] = [
    `**${index}.**`,
    '',
    `> "${quote}"`,
    '',
    `[date] ${formatDate(h.createdAt)}`,
    formatSourceAnnotation(h.url),
  ];

  if (h.tags && h.tags.length > 0) {
    lines.push(`[tags] ${h.tags.join(', ')}`);
  }
  if (h.note) {
    lines.push(`[note] ${h.note}`);
  }

  return lines.join('\n');
}

export function formatSingleHighlightMarkdown(h: ExportableHighlight, index = 1): string {
  return formatHighlightBlock(h, index);
}

function buildHeaderTitle(scope: ExportScope): string {
  switch (scope.kind) {
    case 'library':
      return 'My Highlights';
    case 'domain':
      return scope.domain;
    case 'section': {
      const label = scope.sectionKey === '/' ? 'Home' : scope.sectionKey;
      return `${scope.domain}${scope.sectionKey === '/' ? '' : ` · ${label}`}`;
    }
    case 'highlight':
      return 'Highlight';
  }
}

function groupHighlights(highlights: ExportableHighlight[]): Map<string, Map<string, ExportableHighlight[]>> {
  const byDomain = new Map<string, Map<string, ExportableHighlight[]>>();

  for (const h of highlights) {
    if (!byDomain.has(h.domain)) {
      byDomain.set(h.domain, new Map());
    }
    const sections = byDomain.get(h.domain)!;
    if (!sections.has(h.sectionKey)) {
      sections.set(h.sectionKey, []);
    }
    sections.get(h.sectionKey)!.push(h);
  }

  for (const sections of byDomain.values()) {
    for (const list of sections.values()) {
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
  }

  return byDomain;
}

function buildStats(highlights: ExportableHighlight[], omitted: number): ExportStats {
  const domains = new Set(highlights.map((h) => h.domain)).size;
  return { included: highlights.length, omitted, domains };
}

function formatArtifactDate(iso: string): string {
  return iso.slice(0, 10);
}

function formatArtifactSections(artifacts?: ExportArtifactsBundle): string[] {
  if (!artifacts) return [];
  const lines: string[] = [];

  if (artifacts.domainSynthesis?.content.trim()) {
    lines.push('## Domain synthesis');
    lines.push(`[generated] ${formatArtifactDate(artifacts.domainSynthesis.updatedAt)}`);
    lines.push('');
    lines.push(artifacts.domainSynthesis.content.trim());
    lines.push('');
  }

  if (artifacts.sectionSummary?.content.trim()) {
    lines.push('## Summary');
    lines.push(`[generated] ${formatArtifactDate(artifacts.sectionSummary.updatedAt)}`);
    lines.push('');
    lines.push(artifacts.sectionSummary.content.trim());
    lines.push('');
  }

  if (artifacts.scopeQueries.length > 0) {
    lines.push('## Questions');
    lines.push('');
    for (const qa of artifacts.scopeQueries) {
      if (qa.question) {
        lines.push(`### Q: ${qa.question}`);
      }
      lines.push(`[answered] ${formatArtifactDate(qa.updatedAt)}`);
      lines.push('');
      lines.push(qa.content.trim());
      lines.push('');
    }
  }

  return lines;
}

export function formatMarkdown(
  highlights: ExportableHighlight[],
  scope: ExportScope,
  omitted = 0,
  artifacts?: ExportArtifactsBundle,
): string {
  const { included } = partitionExportable(highlights);
  const exportable = included.length > 0 ? included : highlights.filter((h) => h.text.trim());

  if (exportable.length === 0) {
    return '# No highlights\n\nNothing to export in this scope.';
  }

  if (scope.kind === 'highlight' && exportable.length === 1) {
    return formatSingleHighlightMarkdown(exportable[0]!);
  }

  const lines: string[] = [];
  const title = buildHeaderTitle(scope);
  const exportedDate = formatDate(new Date());
  const domainCount = new Set(exportable.map((h) => h.domain)).size;

  lines.push(`# ${title}`);
  lines.push(`[exported] ${exportedDate}`);
  lines.push(`[count] ${exportable.length} highlight${exportable.length === 1 ? '' : 's'} · ${domainCount} domain${domainCount === 1 ? '' : 's'}`);
  lines.push('');

  const artifactLines = formatArtifactSections(artifacts);
  if (artifactLines.length > 0) {
    lines.push(...artifactLines);
  }

  const grouped = groupHighlights(exportable);
  const showDomainHeadings = scope.kind === 'library' || scope.kind === 'domain';
  let highlightIndex = 0;

  for (const [domain, sections] of grouped) {
    if (showDomainHeadings) {
      lines.push(`## ${domain}`);
      lines.push('');
    }

    const showSectionHeadings = scope.kind !== 'section';

    for (const [sectionKey, sectionHighlights] of sections) {
      if (showSectionHeadings) {
        const sectionLabel = sectionKey === '/' ? 'Home' : sectionKey;
        lines.push(`#### ${sectionLabel}`);
        lines.push('');
      }

      for (const h of sectionHighlights) {
        highlightIndex += 1;
        lines.push(formatHighlightBlock(h, highlightIndex));
        lines.push('');
      }
    }
  }

  if (omitted > 0) {
    lines.push('---');
    lines.push(`*[omitted] ${omitted} highlight${omitted === 1 ? '' : 's'} (vault locked or unavailable).*`);
  }

  return lines.join('\n').trimEnd();
}

export function buildMarkdownExport(
  highlights: ExportableHighlight[],
  scope: ExportScope,
  artifacts?: ExportArtifactsBundle,
): ExportResult {
  const { included, omitted } = partitionExportable(highlights);
  const markdown = formatMarkdown(highlights, scope, omitted, artifacts);
  return {
    format: 'md',
    markdown,
    filename: buildFilename(scope, 'md'),
    stats: buildStats(included, omitted),
  };
}

/** @deprecated Use buildScopedExport or buildMarkdownExport */
export function buildExport(
  highlights: ExportableHighlight[],
  scope: ExportScope,
  artifacts?: ExportArtifactsBundle,
): ExportResult {
  return buildMarkdownExport(highlights, scope, artifacts);
}
