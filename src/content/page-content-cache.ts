/**
 * Captures `document.body.innerText` and pushes it to the background service
 * worker for use as LLM context (ADR-021 §4).
 *
 *  - Pushed on start (pageshow)
 *  - Re-pushed on MutationObserver events, debounced by `debounceMs`
 *  - Truncated to `maxBytes`
 */

const PAGE_CONTENT_CACHED = 'PAGE_CONTENT_CACHED';

interface PushPayload {
  url: string;
  title: string;
  text: string;
  truncated: boolean;
  originalLength: number;
  pushedAt: number;
}

interface PageContentCacheOptions {
  debounceMs?: number;
  maxBytes?: number;
}

interface DocumentMetadata {
  title: string;
  url: string;
}

export class PageContentCache {
  private observer: MutationObserver | null = null;
  private lastPushedAt = 0;
  private pending: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly send: (msg: { type: string; payload: PushPayload; timestamp: number }) => void,
    private readonly opts: PageContentCacheOptions = {},
    private readonly meta: DocumentMetadata = { title: document.title, url: location.href },
  ) {}

  start(): void {
    this.push();
    this.observer = new MutationObserver(() => this.schedulePush());
    this.observer.observe(document.body, {
      subtree: true, childList: true, characterData: true,
    });
  }

  stop(): void {
    this.observer?.disconnect();
    if (this.pending) clearTimeout(this.pending);
  }

  private schedulePush(): void {
    const debounce = this.opts.debounceMs ?? 2_000;
    const elapsed = Date.now() - this.lastPushedAt;
    if (elapsed >= debounce) this.push();
    else if (!this.pending) this.pending = setTimeout(() => { this.pending = null; this.push(); }, debounce - elapsed);
  }

  private push(): void {
    const maxBytes = this.opts.maxBytes ?? 100 * 1024;
    // innerText respects rendered styling; textContent is the safer fallback
    // for environments (tests, pre-render) where innerText is undefined.
    const fullText = document.body.innerText ?? document.body.textContent ?? '';
    const truncated = fullText.length > maxBytes;
    const text = truncated ? fullText.slice(0, maxBytes) : fullText;
    this.send({
      type: PAGE_CONTENT_CACHED,
      payload: {
        url: this.meta.url,
        title: this.meta.title,
        text,
        truncated,
        originalLength: fullText.length,
        pushedAt: Date.now(),
      },
      timestamp: Date.now(),
    });
    this.lastPushedAt = Date.now();
  }
}