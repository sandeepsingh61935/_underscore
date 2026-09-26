/**
 * @file text-fragment.ts
 * @description W3C Scroll-to-Text Fragment URL generator.
 * Format: #:~:text=[prefix-,]textStart[,textEnd][,-suffix]
 */

export interface TextFragmentOptions {
  exact: string;
  prefix?: string;
  suffix?: string;
  maxExactLength?: number;
}

function encodeTextDirectivePart(str: string): string {
  return encodeURIComponent(str)
    .replace(/-/g, '%2D')
    .replace(/,/g, '%2C')
    .replace(/&/g, '%26');
}

function extractBoundaryChunk(str: string, length: number, fromEnd: boolean): string {
  if (str.length <= length) return str;
  if (!fromEnd) {
    const slice = str.slice(0, length);
    const lastSpace = slice.lastIndexOf(' ');
    return (lastSpace > 15 ? slice.slice(0, lastSpace) : slice).trim();
  } else {
    const slice = str.slice(-length);
    const firstSpace = slice.indexOf(' ');
    return (
      firstSpace !== -1 && firstSpace < length - 15 ? slice.slice(firstSpace + 1) : slice
    ).trim();
  }
}

export function buildTextFragmentDirective(options: TextFragmentOptions): string {
  const exact = options.exact.trim();
  if (!exact) return '';

  const parts: string[] = [];
  if (options.prefix) {
    parts.push(`${encodeTextDirectivePart(options.prefix)}-`);
  }

  const threshold = options.maxExactLength ?? 150;

  if (exact.length > threshold) {
    const chunkSize = Math.max(30, Math.floor(threshold / 2));
    const start = extractBoundaryChunk(exact, chunkSize, false);
    const end = extractBoundaryChunk(exact, chunkSize, true);
    parts.push(encodeTextDirectivePart(start));
    parts.push(encodeTextDirectivePart(end));
  } else {
    parts.push(encodeTextDirectivePart(exact));
  }

  if (options.suffix) {
    parts.push(`-${encodeTextDirectivePart(options.suffix)}`);
  }
  return `#:~:text=${parts.join(',')}`;
}

export function buildTextFragmentUrl(
  baseUrl: string,
  options: TextFragmentOptions
): string {
  const directive = buildTextFragmentDirective(options);
  if (!directive) return baseUrl;

  // Clean any existing text fragment directive from baseUrl if present
  const cleanUrl = baseUrl.replace(/:~:text=.*$/, '');

  if (cleanUrl.includes('#')) {
    // If cleanUrl ends with '#', append :~:text=... directly
    if (cleanUrl.endsWith('#')) {
      return `${cleanUrl}${directive.slice(1)}`; // directive starts with '#', slice to ':~:text=...'
    }
    // Already has an anchor like #intro, append delimiter :~:text=...
    return `${cleanUrl}${directive.replace(/^#/, '')}`;
  }

  return `${cleanUrl}${directive}`;
}
