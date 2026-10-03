/**
 * @file webGroupExport.ts
 * @description Export utilities for Page Groups:
 * - Markdown summary with page titles, URLs, and highlights
 * - HTML Bookmarks in Netscape Bookmark format
 * - Copy all group URLs to clipboard
 */

import { toast } from 'sonner';

import type { PageGroup, PageGroupItem } from '@/shared/types/page-group';
import { copyTextToClipboard } from '@/shared/highlight-export/delivery';
import type { WebHighlight } from '@/web/hooks/useWebLibrary';

function sanitizeFilename(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'group';
}

function downloadFile(filename: string, content: string, mimeType: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function getGroupUrls(items: PageGroupItem[]): string[] {
  const urls: string[] = [];
  for (const item of items) {
    if (item.deletedAt !== null) continue;
    if (item.kind === 'page') {
      if (item.urlNormalized && !urls.includes(item.urlNormalized)) {
        urls.push(item.urlNormalized);
      }
    } else if (item.kind === 'domain') {
      const domUrl = `https://${item.hostname}`;
      if (!urls.includes(domUrl)) {
        urls.push(domUrl);
      }
    }
  }
  return urls;
}

export async function copyGroupUrlsToClipboard(items: PageGroupItem[]): Promise<boolean> {
  const urls = getGroupUrls(items);
  if (urls.length === 0) {
    toast.error('No URLs in group to copy');
    return false;
  }
  try {
    await copyTextToClipboard(urls.join('\n'));
    toast.success(`Copied ${urls.length} ${urls.length === 1 ? 'URL' : 'URLs'} to clipboard`);
    return true;
  } catch (err) {
    toast.error('Failed to copy URLs to clipboard');
    return false;
  }
}

export function exportGroupHtmlBookmarks(group: PageGroup, items: PageGroupItem[]): void {
  const liveItems = items.filter((i) => i.deletedAt === null);
  const nowUnix = Math.floor(Date.now() / 1000);

  const links = liveItems
    .map((item) => {
      const url =
        item.kind === 'page' ? item.urlNormalized : `https://${item.hostname}`;
      const title =
        item.kind === 'page' ? item.title || item.urlNormalized : item.hostname;
      return `        <DT><A HREF="${url}" ADD_DATE="${nowUnix}">${title}</A>`;
    })
    .join('\n');

  const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="${nowUnix}" LAST_MODIFIED="${nowUnix}">${group.name}</H3>
    <DL><p>
${links}
    </DL><p>
</DL><p>
`;

  downloadFile(`${sanitizeFilename(group.name)}-bookmarks.html`, html, 'text/html;charset=utf-8');
  toast.success('Downloaded HTML bookmarks');
}

export function exportGroupMarkdown(
  group: PageGroup,
  items: PageGroupItem[],
  highlights: WebHighlight[] = []
): void {
  const liveItems = items.filter((i) => i.deletedAt === null);

  const lines: string[] = [
    `# ${group.name}`,
    '',
    `*Exported on ${new Date().toLocaleDateString()} · ${liveItems.length} items*`,
    '',
  ];

  for (const item of liveItems) {
    if (item.kind === 'domain') {
      lines.push(`## ${item.hostname} (Domain Rule)`);
      lines.push(`- URL: https://${item.hostname}`);
      // Find highlights for this domain
      const domHls = highlights.filter(
        (h) => h.domain.toLowerCase() === item.hostname.toLowerCase()
      );
      if (domHls.length > 0) {
        lines.push('');
        lines.push('### Highlights:');
        for (const h of domHls) {
          lines.push(`> ${h.quote.trim().replace(/\n/g, '\n> ')}`);
          if (h.note) {
            lines.push(`*Note:* ${h.note}`);
          }
          lines.push('');
        }
      }
      lines.push('');
    } else {
      lines.push(`## ${item.title || item.urlNormalized}`);
      lines.push(`- URL: ${item.urlNormalized}`);
      // Find highlights for this specific page
      const pageHls = highlights.filter((h) => {
        const fullUrl = `https://${h.domain}${h.path || '/'}`;
        return fullUrl.toLowerCase().includes(item.urlNormalized.toLowerCase());
      });
      if (pageHls.length > 0) {
        lines.push('');
        lines.push('### Highlights:');
        for (const h of pageHls) {
          lines.push(`> ${h.quote.trim().replace(/\n/g, '\n> ')}`);
          if (h.note) {
            lines.push(`*Note:* ${h.note}`);
          }
          lines.push('');
        }
      }
      lines.push('');
    }
  }

  downloadFile(`${sanitizeFilename(group.name)}.md`, lines.join('\n'), 'text/markdown;charset=utf-8');
  toast.success('Downloaded Markdown summary');
}
