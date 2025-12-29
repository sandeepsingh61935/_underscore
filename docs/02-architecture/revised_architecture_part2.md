# Web Highlighter Extension - REVISED Architecture (Part 2)

**Continuation of Revised Architecture Specification**  
**Focus:** Frontend, Multi-Selector, Security, Real-time Features

---

## 9. Frontend Architecture Deep Dive

### 9.1 State Management Architecture

```typescript
// Centralized state management (no Redux needed, custom lightweight)
class AppState {
  private state: {
    currentMode: 'sprint' | 'vault' | 'gen';
    highlights: Map<string, Highlight>;
    collections: Collection[];
    settings: UserSettings;
    syncStatus: 'idle' | 'syncing' | 'error';
  };

  private listeners: Map<string, Set<(value: any) => void>> = new Map();

  // Observable pattern
  subscribe<K extends keyof typeof this.state>(
    key: K,
    callback: (value: (typeof this.state)[K]) => void
  ): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);

    // Return unsubscribe function
    return () => this.listeners.get(key)?.delete(callback);
  }

  setState<K extends keyof typeof this.state>(
    key: K,
    value: (typeof this.state)[K]
  ): void {
    this.state[key] = value;
    this.listeners.get(key)?.forEach((cb) => cb(value));

    // Persist to IndexedDB
    this.persistState();
  }

  getState<K extends keyof typeof this.state>(key: K): (typeof this.state)[K] {
    return this.state[key];
  }

  private async persistState(): Promise<void> {
    await db.app_state.put({
      id: 'current',
      ...this.state,
      updatedAt: new Date(),
    });
  }
}

// Global state instance
const appState = new AppState();

// Usage in components
class ModeIndicator extends HTMLElement {
  private unsubscribe?: () => void;

  connectedCallback() {
    this.unsubscribe = appState.subscribe('currentMode', (mode) => {
      this.render(mode);
    });

    this.render(appState.getState('currentMode'));
  }

  disconnectedCallback() {
    this.unsubscribe?.();
  }

  render(mode: string) {
    this.innerHTML = `
      <div class="mode-indicator mode-${mode}">
        ${mode.toUpperCase()} MODE
      </div>
    `;
  }
}
```

### 9.2 Progressive Enhancement Strategy

```typescript
// Feature detection and graceful degradation
class FeatureDetector {
  private features = {
    indexedDB: false,
    serviceWorker: false,
    shadowDOM: false,
    webComponents: false,
    intersectionObserver: false,
    mutationObserver: false,
  };

  async detect(): Promise<void> {
    // IndexedDB
    this.features.indexedDB = 'indexedDB' in window;

    // Service Worker
    this.features.serviceWorker = 'serviceWorker' in navigator;

    // Shadow DOM
    this.features.shadowDOM = 'attachShadow' in Element.prototype;

    // Web Components
    this.features.webComponents = 'customElements' in window;

    // IntersectionObserver
    this.features.intersectionObserver = 'IntersectionObserver' in window;

    // MutationObserver
    this.features.mutationObserver = 'MutationObserver' in window;
  }

  async initializeApp(): Promise<void> {
    await this.detect();

    // Essential features check
    if (!this.features.shadowDOM || !this.features.webComponents) {
      this.showUnsupportedBrowserError();
      return;
    }

    // Fallback strategies
    if (!this.features.indexedDB) {
      console.warn('IndexedDB unavailable, using Sprint Mode only');
      appState.setState('currentMode', 'sprint');
      this.disableVaultMode();
    }

    if (!this.features.serviceWorker) {
      console.warn('Service Worker unavailable, no background sync');
      this.disableBackgroundSync();
    }

    if (!this.features.intersectionObserver) {
      console.warn('IntersectionObserver unavailable, using eager loading');
      this.useEagerLoading();
    }

    // Initialize with available features
    await this.initializeExtension();
  }

  private showUnsupportedBrowserError(): void {
    const banner = document.createElement('div');
    banner.className = 'extension-error';
    banner.innerHTML = `
      <h3>⚠️ Unsupported Browser</h3>
      <p>This extension requires a modern browser with Web Components support.</p>
      <p>Please use Chrome 90+, Firefox 90+, or Edge 90+.</p>
    `;
    document.body.prepend(banner);
  }
}
```

### 9.3 Bundle Size Optimization

```typescript
// Lazy loading for non-critical features
class LazyLoader {
  private loaded = new Set<string>();

  async loadGenMode(): Promise<void> {
    if (this.loaded.has('gen-mode')) return;

    // Dynamic import (code-splitting)
    const { GenModeUI } = await import('./gen-mode/ui.js');
    const { AIClient } = await import('./gen-mode/ai-client.js');

    this.loaded.add('gen-mode');

    // Initialize Gen Mode
    new GenModeUI().mount();
  }

  async loadExporter(): Promise<void> {
    if (this.loaded.has('exporter')) return;

    const { MarkdownExporter } = await import('./exporters/markdown.js');
    const { PDFExporter } = await import('./exporters/pdf.js');

    this.loaded.add('exporter');
  }
}

// Vite config for optimal bundling
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['lit', 'dexie'],
          'content-script': ['src/content/main.ts'],
          background: ['src/background/main.ts'],
          popup: ['src/popup/main.ts'],
          'gen-mode': ['src/gen-mode/**/*.ts'], // Lazy loaded
        },
      },
    },
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
        pure_funcs: ['console.debug', 'console.trace'],
      },
    },
  },
});
```

### 9.4 Performance Monitoring

```typescript
// Real User Monitoring (RUM)
class PerformanceMonitor {
  private metrics = {
    highlightRenderTime: [] as number[],
    restoreTime: [] as number[],
    searchTime: [] as number[],
    syncTime: [] as number[],
  };

  measureHighlightRender(fn: () => void): void {
    const start = performance.now();
    fn();
    const duration = performance.now() - start;

    this.metrics.highlightRenderTime.push(duration);

    // Alert if slow (>100ms)
    if (duration > 100) {
      this.reportSlowOperation('highlight_render', duration);
    }
  }

  async reportMetrics(): Promise<void> {
    const stats = {
      highlightRender: {
        p50: this.percentile(this.metrics.highlightRenderTime, 0.5),
        p95: this.percentile(this.metrics.highlightRenderTime, 0.95),
        p99: this.percentile(this.metrics.highlightRenderTime, 0.99),
      },
      // ... other metrics
    };

    // Send to analytics (Plausible custom events)
    await fetch('https://plausible.io/api/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'performance_metrics',
        url: window.location.href,
        props: stats,
      }),
    });
  }

  private percentile(arr: number[], p: number): number {
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[index] || 0;
  }

  private async reportSlowOperation(
    operation: string,
    duration: number
  ): Promise<void> {
    // Report to Sentry
    if (window.Sentry) {
      Sentry.captureMessage(`Slow operation: ${operation} took ${duration}ms`, {
        level: 'warning',
        tags: { operation },
        extra: { duration },
      });
    }
  }
}
```

---

## 10. Multi-Selector Strategy - Advanced Implementation

### 10.1 Content Fingerprinting (Improved)

```typescript
// Better content hashing that's robust to minor changes
class ContentFingerprinter {
  async generateFingerprint(doc: Document): Promise<string> {
    // Extract main content, ignore ads/navbars
    const mainContent = this.extractMainContent(doc);

    // Normalize text (remove extra whitespace, case-insensitive)
    const normalized = this.normalizeText(mainContent);

    // Create SimHash (locality-sensitive hashing)
    const simhash = this.computeSimHash(normalized);

    // Also store traditional SHA-256 for exact matching
    const sha256 = await this.sha256(normalized);

    return JSON.stringify({
      simhash,
      sha256,
      length: normalized.length,
      timestamp: Date.now(),
    });
  }

  private extractMainContent(doc: Document): string {
    // Try common article selectors
    const selectors = [
      'article',
      '[role="main"]',
      'main',
      '.post-content',
      '.article-content',
      '.entry-content',
      '#content',
    ];

    for (const selector of selectors) {
      const element = doc.querySelector(selector);
      if (element && element.textContent!.length > 500) {
        return element.textContent!;
      }
    }

    // Fallback: body minus header/footer/nav
    const body = doc.body.cloneNode(true) as HTMLElement;
    body
      .querySelectorAll('header, footer, nav, aside, .ad, .advertisement')
      .forEach((el) => el.remove());

    return body.textContent || '';
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .trim();
  }

  private computeSimHash(text: string): string {
    // SimHash algorithm for fuzzy matching
    const tokens = text.split(' ');
    const hashBits = 64;
    const vector = new Array(hashBits).fill(0);

    for (const token of tokens) {
      const hash = this.hashString(token);
      for (let i = 0; i < hashBits; i++) {
        const bit = (hash >> i) & 1;
        vector[i] += bit ? 1 : -1;
      }
    }

    let simhash = 0n;
    for (let i = 0; i < hashBits; i++) {
      if (vector[i] > 0) {
        simhash |= 1n << BigInt(i);
      }
    }

    return simhash.toString(16);
  }

  private hashString(str: string): bigint {
    let hash = 0n;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5n) - hash + BigInt(str.charCodeAt(i));
      hash = hash & 0xffffffffffffffffn; // 64-bit
    }
    return hash;
  }

  async sha256(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Check if two fingerprints match within threshold
  isSimilar(fp1: string, fp2: string, threshold = 0.9): boolean {
    const data1 = JSON.parse(fp1);
    const data2 = JSON.parse(fp2);

    // Exact match
    if (data1.sha256 === data2.sha256) return true;

    // SimHash hamming distance
    const hash1 = BigInt('0x' + data1.simhash);
    const hash2 = BigInt('0x' + data2.simhash);
    const xor = hash1 ^ hash2;

    // Count bits set (hamming distance)
    let distance = 0;
    let temp = xor;
    while (temp > 0n) {
      distance += Number(temp & 1n);
      temp >>= 1n;
    }

    const similarity = 1 - distance / 64;
    return similarity >= threshold;
  }
}
```

### 10.2 XPath Generation - Robust

```typescript
class XPathGenerator {
  generate(node: Node, offset: number): string {
    const path: string[] = [];
    let current: Node | null = node;

    while (current && current !== document.body) {
      const index = this.getNodeIndex(current);
      const tagName = (current as Element).tagName?.toLowerCase() || 'text()';

      // Add ID shortcut if available (but validate it's stable)
      if (
        current instanceof Element &&
        current.id &&
        this.isStableId(current.id)
      ) {
        path.unshift(`//*[@id="${current.id}"]`);
        break;
      }

      // Add class if unique within parent
      if (current instanceof Element && this.hasUniqueClass(current)) {
        const className = Array.from(current.classList).find((c) =>
          this.isStableClass(c)
        );
        if (className) {
          path.unshift(`//${tagName}[@class="${className}"]`);
          break;
        }
      }

      path.unshift(`${tagName}[${index}]`);
      current = current.parentNode;
    }

    return '/' + path.join('/');
  }

  private getNodeIndex(node: Node): number {
    let index = 1;
    let sibling = node.previousSibling;

    while (sibling) {
      if (sibling.nodeName === node.nodeName) {
        index++;
      }
      sibling = sibling.previousSibling;
    }

    return index;
  }

  private isStableId(id: string): boolean {
    // Avoid dynamic IDs (react-id-*, ember-*, auto-generated)
    const dynamicPatterns = [
      /^react-/,
      /^ember-/,
      /-\d{13,}$/, // Timestamp suffixes
      /^[a-f0-9]{32}$/, // UUID-like
    ];

    return !dynamicPatterns.some((pattern) => pattern.test(id));
  }

  private isStableClass(className: string): boolean {
    // Avoid CSS-in-JS generated classes
    const dynamicPatterns = [
      /^css-[a-z0-9]{6,}$/,
      /^sc-[a-z0-9]+$/,
      /^_[a-z0-9]+$/,
    ];

    return !dynamicPatterns.some((pattern) => pattern.test(className));
  }

  private hasUniqueClass(element: Element): boolean {
    for (const className of element.classList) {
      if (!this.isStableClass(className)) continue;

      const matches = document.querySelectorAll(`.${className}`);
      if (matches.length === 1) return true;
    }

    return false;
  }
}
```

### 10.3 Restoration Algorithm - Production Ready

```typescript
interface RestorationStrategy {
  name: string;
  execute(
    data: HighlightData,
    doc: Document
  ): Promise<RestorationResult | null>;
}

class XPathStrategy implements RestorationStrategy {
  name = 'xpath';

  async execute(
    data: HighlightData,
    doc: Document
  ): Promise<RestorationResult | null> {
    try {
      const evaluator = new XPathEvaluator();
      const result = evaluator.evaluate(
        data.selectors.xpath.startContainer,
        doc,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );

      if (!result.singleNodeValue) return null;

      const range = doc.createRange();
      range.setStart(result.singleNodeValue, data.selectors.xpath.startOffset);
      range.setEnd(result.singleNodeValue, data.selectors.xpath.endOffset);

      // Verify text matches
      const text = range.toString();
      const similarity = this.textSimilarity(text, data.selectors.quote.exact);

      if (similarity > 0.95) {
        return {
          range,
          confidence: similarity,
          method: 'xpath',
        };
      }

      return null;
    } catch (e) {
      return null;
    }
  }

  private textSimilarity(a: string, b: string): number {
    if (a === b) return 1.0;

    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(a, b);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }
}

class PositionStrategy implements RestorationStrategy {
  name = 'position';

  async execute(
    data: HighlightData,
    doc: Document
  ): Promise<RestorationResult | null> {
    const textContent = doc.body.textContent || '';
    const start = data.selectors.position.start;
    const end = data.selectors.position.end;

    if (start < 0 || end > textContent.length) return null;

    const extractedText = textContent.substring(start, end);
    const similarity = new XPathStrategy().textSimilarity(
      extractedText,
      data.selectors.quote.exact
    );

    if (similarity > 0.9) {
      const range = this.createRangeFromPosition(doc.body, start, end);
      if (range) {
        return { range, confidence: similarity * 0.95, method: 'position' };
      }
    }

    return null;
  }

  private createRangeFromPosition(
    root: Node,
    start: number,
    end: number
  ): Range | null {
    const range = document.createRange();
    let currentOffset = 0;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);

    let startNode: Node | null = null;
    let startOffset = 0;
    let endNode: Node | null = null;
    let endOffset = 0;

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const length = node.textContent?.length || 0;

      if (currentOffset + length >= start && !startNode) {
        startNode = node;
        startOffset = start - currentOffset;
      }

      if (currentOffset + length >= end) {
        endNode = node;
        endOffset = end - currentOffset;
        break;
      }

      currentOffset += length;
    }

    if (startNode && endNode) {
      try {
        range.setStart(startNode, startOffset);
        range.setEnd(endNode, endOffset);
        return range;
      } catch (e) {
        return null;
      }
    }

    return null;
  }
}

class FuzzyStrategy implements RestorationStrategy {
  name = 'fuzzy';

  async execute(
    data: HighlightData,
    doc: Document
  ): Promise<RestorationResult | null> {
    // Run in Web Worker to avoid blocking main thread
    return new Promise((resolve) => {
      const worker = new Worker('/fuzzy-worker.js');

      worker.postMessage({
        documentText: doc.body.textContent,
        searchText: data.selectors.quote.exact,
        prefix: data.selectors.quote.prefix,
        suffix: data.selectors.quote.suffix,
        threshold: 0.75,
      });

      const timeout = setTimeout(() => {
        worker.terminate();
        resolve(null);
      }, 5000); // 5s timeout

      worker.onmessage = (e) => {
        clearTimeout(timeout);
        worker.terminate();

        if (e.data.found) {
          const range = new PositionStrategy().createRangeFromPosition(
            doc.body,
            e.data.startOffset,
            e.data.endOffset
          );

          if (range) {
            resolve({
              range,
              confidence: e.data.similarity * 0.85,
              method: 'fuzzy',
            });
          } else {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };
    });
  }
}

// Orchestrator
class HighlightRestorer {
  private strategies: RestorationStrategy[] = [
    new XPathStrategy(),
    new PositionStrategy(),
    new FuzzyStrategy(),
  ];

  async restore(
    data: HighlightData,
    doc: Document
  ): Promise<RestorationResult> {
    // Try strategies in order (fast to slow)
    for (const strategy of this.strategies) {
      const result = await strategy.execute(data, doc);

      if (result && result.confidence > 0.75) {
        // Log successful restoration method
        this.logRestoration(data.id, strategy.name, result.confidence);
        return result;
      }
    }

    // All strategies failed
    return {
      range: null,
      confidence: 0,
      method: 'failed',
      orphaned: true,
    };
  }

  private async logRestoration(
    highlightId: string,
    method: string,
    confidence: number
  ): Promise<void> {
    // Analytics for understanding which strategies work best
    await db.restoration_logs.add({
      highlight_id: highlightId,
      method,
      confidence,
      timestamp: new Date(),
      url: window.location.href,
    });
  }
}
```

---

## 11. Export Security - Signed URLs

```typescript
// Backend: Generate signed export URLs
import { createHmac } from 'crypto';

class ExportService {
  private readonly SECRET_KEY = process.env.EXPORT_SECRET_KEY!;
  private readonly EXPIRY_SECONDS = 3600; // 1 hour

  async createExportJob(
    userId: string,
    highlightIds: string[],
    format: 'markdown' | 'pdf' | 'json'
  ): Promise<{ downloadUrl: string; expiresAt: Date }> {
    const jobId = crypto.randomUUID();

    // Generate export file
    const content = await this.generateExport(highlightIds, format);

    // Store in R2 (Cloudflare) or S3
    const key = `exports/${userId}/${jobId}.${format}`;
    await this.uploadToStorage(key, content);

    // Generate signed URL
    const expiresAt = new Date(Date.now() + this.EXPIRY_SECONDS * 1000);
    const signature = this.generateSignature(key, expiresAt);

    const downloadUrl =
      `https://cdn.yourdomain.com/${key}?` +
      `expires=${expiresAt.getTime()}&` +
      `signature=${signature}&` +
      `token=${jobId}`;

    // Store export job metadata
    await db.export_jobs.insert({
      id: jobId,
      user_id: userId,
      format,
      storage_key: key,
      expires_at: expiresAt,
      downloads: 0,
      max_downloads: 3, // Allow 3 downloads
      created_at: new Date(),
    });

    return { downloadUrl, expiresAt };
  }

  private generateSignature(key: string, expiresAt: Date): string {
    const message = `${key}:${expiresAt.getTime()}`;
    return createHmac('sha256', this.SECRET_KEY).update(message).digest('hex');
  }

  // Verify signature on download
  async verifyAndServeExport(
    key: string,
    expires: string,
    signature: string,
    token: string
  ): Promise<Response> {
    // Check expiration
    const expiresAt = new Date(parseInt(expires));
    if (expiresAt < new Date()) {
      return new Response('Link expired', { status: 410 });
    }

    // Verify signature
    const expectedSig = this.generateSignature(key, expiresAt);
    if (signature !== expectedSig) {
      return new Response('Invalid signature', { status: 403 });
    }

    // Check download count
    const job = await db.export_jobs.findOne({ id: token });
    if (!job) {
      return new Response('Export not found', { status: 404 });
    }

    if (job.downloads >= job.max_downloads) {
      return new Response('Download limit exceeded', { status: 429 });
    }

    // Increment download count
    await db.export_jobs.update({ id: token }, { $inc: { downloads: 1 } });

    // Serve file from R2/S3
    const file = await this.downloadFromStorage(key);

    // Log access for audit
    await db.export_access_logs.insert({
      export_job_id: token,
      user_id: job.user_id,
      ip_address: request.headers.get('CF-Connecting-IP'),
      user_agent: request.headers.get('User-Agent'),
      accessed_at: new Date(),
    });

    return new Response(file, {
      headers: {
        'Content-Type': this.getContentType(job.format),
        'Content-Disposition': `attachment; filename="highlights.${job.format}"`,
        'Cache-Control': 'private, no-cache',
      },
    });
  }

  // Cleanup expired exports (run daily via cron)
  async cleanupExpiredExports(): Promise<void> {
    const expired = await db.export_jobs.find({
      expires_at: { $lt: new Date() },
    });

    for (const job of expired) {
      // Delete from storage
      await this.deleteFromStorage(job.storage_key);

      // Delete from database
      await db.export_jobs.delete({ id: job.id });
    }
  }
}
```

---

## 12. Real-Time Sync - WebSocket Implementation

```typescript
// Backend: WebSocket handler (Cloudflare Durable Objects)
export class SyncCoordinator {
  state: DurableObjectState;
  sessions: Map<string, WebSocket> = new Map();

  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected websocket', { status: 400 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.handleSession(server, request);

    return new Response(null, { status: 101, webSocket: client });
  }

  async handleSession(webSocket: WebSocket, request: Request): Promise<void> {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const deviceId = url.searchParams.get('deviceId');

    if (!userId || !deviceId) {
      webSocket.close(1008, 'Missing userId or deviceId');
      return;
    }

    const sessionId = `${userId}:${deviceId}`;
    this.sessions.set(sessionId, webSocket);

    webSocket.addEventListener('message', async (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'event':
          await this.handleEvent(userId, message.data);
          break;

        case 'heartbeat':
          webSocket.send(JSON.stringify({ type: 'pong' }));
          break;
      }
    });

    webSocket.addEventListener('close', () => {
      this.sessions.delete(sessionId);
    });

    // Send initial state
    const events = await this.getRecentEvents(userId);
    webSocket.send(
      JSON.stringify({
        type: 'initial_state',
        events,
      })
    );
  }

  async handleEvent(userId: string, event: any): Promise<void> {
    // Store event in database
    await db.events.insert({
      ...event,
      user_id: userId,
      timestamp: new Date(),
    });

    // Broadcast to all user's devices
    for (const [sessionId, ws] of this.sessions) {
      if (sessionId.startsWith(`${userId}:`)) {
        ws.send(
          JSON.stringify({
            type: 'event',
            data: event,
          })
        );
      }
    }
  }
}

// Frontend: WebSocket client
class SyncClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  async connect(): Promise<void> {
    const token = await getAuthToken();
    const deviceId = await getDeviceId();

    const wsUrl =
      `wss://api.yourdomain.com/sync?` +
      `userId=${currentUser.id}&` +
      `deviceId=${deviceId}&` +
      `token=${token}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('Sync connected');
      this.reconnectAttempts = 0;
      this.startHeartbeat();
    };

    this.ws.onmessage = async (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'initial_state':
          await this.applyInitialState(message.events);
          break;

        case 'event':
          await this.applyEvent(message.data);
          break;

        case 'pong':
          // Heartbeat acknowledged
          break;
      }
    };

    this.ws.onclose = () => {
      console.log('Sync disconnected');
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('Sync error:', error);
    };
  }

  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.fallbackToPollSync();
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    setTimeout(() => this.connect(), delay);
  }

  private startHeartbeat(): void {
    setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'heartbeat' }));
      }
    }, 30000); // Every 30 seconds
  }

  async sendEvent(event: any): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'event',
          data: event,
        })
      );
    } else {
      // Fallback: Queue for later
      await db.sync_queue.add(event);
    }
  }

  private async fallbackToPollSync(): Promise<void> {
    // Fallback to polling if WebSocket unavailable
    setInterval(async () => {
      const lastSync = await db.sync_metadata.get('last_sync');
      const events = await api.get('/events/since', {
        timestamp: lastSync.timestamp,
      });

      for (const event of events) {
        await this.applyEvent(event);
      }
    }, 30000); // Poll every 30s
  }
}
```

---

**This document continues with Part 3 covering Testing Strategy, Deployment
Architecture, and Monitoring...**
