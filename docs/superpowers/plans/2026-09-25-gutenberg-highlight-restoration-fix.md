# Gutenberg Highlight Restoration Fix — Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` or `superpowers:subagent-driven-development`. Steps use checkbox syntax. One logical change per commit, `bun run build && bun run type-check` before marking complete.

**Goal:** Highlights saved from `www.gutenberg.org/files/67799/67799-h/67799-h.htm` (and any page with `\n` line-wraps / `’` smart quotes) restore on reload and paint `RangeOverlayPainter` underline, even for already-persisted rows whose `selector.exact` was normalized to spaces/ASCII. `www.` ↔ bare domain no longer orphans rows. No `liveRanges` written to IDB.

**Context:** Diagnosis review 2026-09-25 confirmed root cause is `src/services/cloud-mode-service.ts:84 saveHighlight` overwriting `payload.ranges[0].selector` with `{exact: highlight.text}` (normalized via `src/shared/utils/normalize-captured-highlight-text.ts:53`) + `src/content/utils/text-quote-finder.ts:60 findExactMatches` literal `indexOf` on raw `body.textContent` containing `\n`/`\u2019`. `src/services/cloud-mode-service.ts:275 restoreHighlightRange` returns `null` without fallback. `src/background/services/background-highlight-orchestrator.ts:143 onFindByUrl` exact URL set misses `www.` variant.

**Non-goals:** Change library body text normalization. Add new storage schema. Migrate all rows eagerly.

---

## Global Constraints

- Two `TextQuoteFinder` copies exist: `src/content/utils/text-quote-finder.ts:23` (virtual concat + `mapTextIndexToNode`) and `src/shared/utils/text-quote-finder.ts:23` (per-node). Unify or fix both identically.
- `highlight.text` is display body (normalized prose); `selector.exact` is raw anchoring text from `range.toString()` via `src/content/utils/text-quote-extractor.ts:61`. Never assign `highlight.text` to `selector.exact`.
- `SerializedRange` (`src/shared/schemas/highlight-schema.ts:53`) not `MultiSelector` (`src/services/multi-selector-engine.ts:68`) is what is actually stored in `highlight.ranges[0]`. Fallback must go through `src/content/utils/range-converter.ts:56 deserializeRange`, not `MultiSelectorEngine.restore`.
- `normalizePageUrl:62` strips `#` and tracking params but keeps `www.` and host — URL variants must be generated via `URL.hostname`, not substring replace.
- Run `bun run build && bun run type-check` before marking any task complete. Tests: `bun run vitest run <path>`.

---

### Task 1: Stop destroying prefix/suffix and raw exact on save — the 5-line fix

**Files:**
- Modify: `src/services/cloud-mode-service.ts` (`saveHighlight:66`)
- Test: `tests/unit/services/cloud-mode-service.test.ts` + new `tests/unit/services/cloud-mode-service.save.test.ts` if needed

**Interfaces:**
- Consumes: `highlight.ranges[0]` already produced by `src/content/modes/pro-mode.ts:439 serializeRange` which embeds a correct `TextQuoteSelector` with raw `exact/prefix/suffix` via `extractTextQuoteSelector`.
- Produces: `payload.ranges[0].selector` preserved when present; only synthesized when absent.

**Why first:** Highest leverage, smallest diff, unblocks all other fixes. Without this every new highlight continues to lose disambiguation.

- [ ] **Step 1: Write failing test**

```ts
import { CloudModeService } from '@/services/cloud-mode-service';
import { MultiSelectorEngine } from '@/services/multi-selector-engine';
import type { RepositoryFacade } from '@/shared/repositories/repository-facade';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';

it('preserves raw selector with prefix/suffix instead of overwriting with normalized text', async () => {
  const facade = { addPersisted: vi.fn().mockResolvedValue(undefined) } as unknown as RepositoryFacade;
  const svc = new CloudModeService(facade, new MultiSelectorEngine(), { info:vi.fn(), warn:vi.fn(), error:vi.fn(), debug:vi.fn() } as any);
  const raw = { xpath:'/html/body/p[1]/text()[1]', startOffset:2, endOffset:10, text:'raw\ntext\u2019s', textBefore:'before ', textAfter:' after', selector:{ type:'TextQuoteSelector' as const, exact:'raw\ntext\u2019s', prefix:'before ', suffix:' after' } } as any;
  const highlight = { id: crypto.randomUUID(), text: "raw text's", contentHash:'a'.repeat(64), colorRole:'yellow', type:'underscore', createdAt:new Date(), url:'https://example.com/p', ranges:[raw] } as HighlightDataV2;
  await svc.saveHighlight(highlight, document.createRange());
  const saved = (facade.addPersisted as any).mock.calls[0][0] as HighlightDataV2;
  expect(saved.ranges[0]!.selector!.exact).toBe('raw\ntext\u2019s');
  expect(saved.ranges[0]!.selector!.prefix).toBe('before ');
  expect(saved.ranges[0]!.text).toBe('raw\ntext\u2019s'); // raw, not normalized body
});
it('does not write liveRanges to IDB', async () => {
  // assert payload has no liveRanges key after saveHighlight
});
```

- [ ] **Step 2: Run test to verify it fails**
  `bun run vitest run tests/unit/services/cloud-mode-service.test.ts` — expect `exact` is `"raw text's"` (normalized).

- [ ] **Step 3: Minimal implementation**

At `src/services/cloud-mode-service.ts:84` replace overwrite block with:

```ts
if (payload.ranges && payload.ranges.length > 0) {
  const first = payload.ranges[0]!;
  // Preserve extractor's raw selector (with prefix/suffix) when present
  const existing = (first as any).selector as TextQuoteSelector | undefined;
  const selector: TextQuoteSelector = existing?.exact
    ? existing
    : { type: 'TextQuoteSelector' as const, exact: first.text };
  payload.ranges[0] = {
    xpath: first.xpath,
    startOffset: first.startOffset,
    endOffset: first.endOffset,
    text: first.text, // raw SerializedRange.text, not highlight.text
    textBefore: first.textBefore,
    textAfter: first.textAfter,
    selector,
  };
}
```

Delete assignment `exact: highlight.text`. Keep `highlight.text` only as `payload.text` (display body, already set). Ensure `liveRanges` deletion stays.

- [ ] **Step 4: Run test to verify it passes**
  `bun run vitest run tests/unit/services/cloud-mode-service.test.ts && bun run type-check`

- [ ] **Step 5: Commit**
  `git add src/services/cloud-mode-service.ts tests/unit/services/cloud-mode-service.test.ts`
  `git commit -m "fix(cloud-mode): preserve raw TextQuoteSelector on save"`

---

### Task 2: Collapsed-whitespace + quote-equivalent TextQuoteFinder with correct Range mapping

**Files:**
- Modify: `src/content/utils/text-quote-finder.ts` + `src/shared/utils/text-quote-finder.ts` (unify; one re-exports the other)
- Test: `tests/unit/content/utils/text-quote-finder.test.ts` (extend) + `tests/unit/shared/utils/text-quote-finder.test.ts` if kept

**Interfaces:**
- Consumes: `TextQuoteSelector {exact,prefix,suffix}` (both normalized legacy and raw new)
- Produces: `Range | null` via `find(selector, root)`

**Contract:**
- Normalization fn `normalizeForMatch(s: string): string` applied identically to `fullText` and `selector.exact/prefix/suffix`:
  - `[\u00A0\u2000-\u200B\u202F\u205F\u3000]` -> ` ` (match `normalize-captured-highlight-text.ts:15`)
  - `[\u2018\u2019]` -> `'`, `[\u201C\u201D]` -> `"`
  - `[\t\n\r ]+` -> single ` `
  - `trim()` ends (Gutenberg leading indent)
- Search on normalized string, map `normIndex -> rawIndex` via tables so `Range` offsets are in raw DOM coordinates.
- `filterByPrefix/suffix` compare normalized `getTextBefore/After` slices normalized the same way.
- Multi-node spans preserved (virtual concat path, not per-node).

- [ ] **Step 1: Write failing tests (Gutenberg fixture)**

```ts
function gutenbergContainer() {
  const c = document.createElement('div');
  // line-wrapped + smart apostrophe
  c.innerHTML = '<p>art is more the expression\nof the ideal and men\u2019s creed</p>';
  return c;
}
it('finds normalized exact across \\n with collapsed whitespace', () => {
  const sel = { type:'TextQuoteSelector' as const, exact:'art is more the expression of the ideal' };
  expect(new TextQuoteFinder().find(sel, gutenbergContainer())).not.toBeNull();
  expect(new TextQuoteFinder().find(sel, gutenbergContainer())!.toString()).toContain('expression');
});
it('equates smart apostrophe', () => {
  const sel = { type:'TextQuoteSelector' as const, exact:"men's creed" };
  expect(new TextQuoteFinder().find(sel, gutenbergContainer())).not.toBeNull();
});
it('maps Range offsets back to raw text nodes (no IndexSizeError)', () => {
  const r = new TextQuoteFinder().find({ type:'TextQuoteSelector', exact:'expression of' }, gutenbergContainer())!;
  expect(() => r.getBoundingClientRect()).not.toThrow();
  expect(r.startContainer.nodeType).toBe(Node.TEXT_NODE);
});
it('spans <p>Hello <b>World</b></p> still works', () => {
  const c = document.createElement('div'); c.innerHTML='<p>Hello <b>World</b></p>';
  expect(new TextQuoteFinder().find({ type:'TextQuoteSelector', exact:'Hello World' }, c)!.toString()).toBe('Hello World');
});
```

- [ ] **Step 2: Run to fail**
  `bun run vitest run tests/unit/content/utils/text-quote-finder.test.ts` — first two fail with `null`.

- [ ] **Step 3: Minimal implementation**

Replace `findExactMatches` with normalized search + index tables:

```ts
private normalize(s: string): string {
  return s.replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g,' ')
          .replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"')
          .replace(/[\t\n\r ]+/g,' ').trim();
}
private findExactMatches(exact: string, root: Node): Range[] {
  const normExact = this.normalize(exact);
  if (!normExact) return [];
  // Build virtual text + norm->raw map
  const textNodes: Text[] = [];
  let raw = '';
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  let n: Text|null; while(n=walker.nextNode() as Text){ textNodes.push(n); raw+=n.textContent||''; }
  const normRaw = this.normalize(raw);
  // Build normRaw index -> raw index mapping (first raw char of each norm char)
  // naive O(n) walk raw chars -> normRaw chars; collapsed runs map to single norm char
  // Then indexOf on normRaw, map start/end via table, then mapTextIndexToNode
}
```

Fix `mapTextIndexToNode:104` boundary: `if(targetIndex < nodeEnd)` not `<=` (EOF case handled after loop).

Normalize `prefix/suffix` before `endsWith/startsWith` in `filterByPrefix/Suffix` and normalize `getTextBefore/After` output.

Unify modules: `src/shared/utils/text-quote-finder.ts` becomes canonical impl; `src/content/utils/text-quote-finder.ts` re-exports it.

- [ ] **Step 4: Verify**
  `bun run vitest run tests/unit/content/utils/text-quote-finder.test.ts && bun run type-check`

- [ ] **Step 5: Commit**
  `git add src/content/utils/text-quote-finder.ts src/shared/utils/text-quote-finder.ts tests/unit/content/utils/text-quote-finder.test.ts`
  `git commit -m "fix(text-quote): collapsed whitespace and quote equivalence with correct Range mapping"`

---

### Task 3: Restore fallback via SerializedRange + healed rewrite (not MultiSelector)

**Files:**
- Modify: `src/services/cloud-mode-service.ts` (`extractSelector:209`, `restoreHighlightRange:275`, `determineRestorationTier:312`)
- Modify: `src/content/modes/pro-mode.ts:514 restore` ( healed rewrite hook, optional)
- Test: `tests/unit/services/cloud-mode-service.restore.test.ts`

**Why:** `extractSelector` returning only `selector` loses `xpath/startOffset` needed for fallback; `MultiSelectorEngine` expects a different shape.

- [ ] **Step 1: Write failing test**

```ts
it('falls back to xpath when TextQuoteFinder misses but SerializedRange xpath matches', async () => {
  const c = document.createElement('div'); c.innerHTML='<p id="p">hello world</p>'; document.body.appendChild(c);
  const sr = { xpath:'/html/body/div/p[1]/text()[1]', startOffset:0, endOffset:5, text:'hello', textBefore:'', textAfter:' world', selector:{ type:'TextQuoteSelector', exact:'missing normalized text' } } as any;
  const h = { id:crypto.randomUUID(), text:'missing normalized text', contentHash:'a'.repeat(64), colorRole:'yellow', type:'underscore', createdAt:new Date(), url: location.href, ranges:[sr] } as any;
  getAll.mockReturnValue([h]);
  const res = await svc.restoreHighlightsForUrl();
  expect(res[0]!.range).not.toBeNull(); // via fallback
  expect(res[0]!.restoredUsing).not.toBe('failed');
});
```

- [ ] **Step 2: Run to fail**
  `bun run vitest run src/services/cloud-mode-service.restore.test.ts` — currently `failed`.

- [ ] **Step 3: Implementation**

- Change `extractSelector` to return full `SerializedRange` when selector is TextQuote, or keep returning `HighlightSelector` but add `fallbackRange: SerializedRange` param to `restoreHighlightRange`.
- In `restoreHighlightRange`: `if(isTextQuote){ const q=find(...); if(q) return q; // fallback` then try `deserializeRange(highlight.ranges[0])` or inline `tryExactMatch`/`tryFuzzyMatch` from `range-converter.ts:95,118`. Import `deserializeRange` rather than `MultiSelectorEngine` for this path. Keep `MultiSelector` path for legacy `selectors` flat shape.
- Update `determineRestorationTier` to return `'text-quote'` vs `'xpath'`/`'fuzzy'` based on which tier succeeded (peek at `range.toString() === sr.text` + xpath node check).

Optional healing: in `ProMode.restore:546` after `if(range)` and `markAnchored`, if `storedData.ranges[0].selector.prefix == null` and `range.toString().length < 5000`, fire-and-forget:

```ts
void import('@/content/utils/text-quote-extractor').then(({extractTextQuoteSelector})=>{
  try{ const fresh=extractTextQuoteSelector(range!); this.facade.updatePersisted(storedData.id, { ranges:[{...storedData.ranges[0]!, selector:fresh}] } as any);}catch{}
});
```

- [ ] **Step 4: Verify**
  `bun run vitest run src/services/cloud-mode-service.restore.test.ts && bun run type-check`

- [ ] **Step 5: Commit**
  `git add src/services/cloud-mode-service.ts src/content/modes/pro-mode.ts tests/unit/services/cloud-mode-service.restore.test.ts`
  `git commit -m "fix(restore): fallback to SerializedRange xpath/fuzzy when TextQuote misses"`

---

### Task 4: www. ↔ bare domain candidate keys in background findByUrl

**Files:**
- Modify: `src/background/services/background-highlight-orchestrator.ts:143 onFindByUrl`
- Modify: `src/services/cloud-mode-service.ts:152 restoreHighlightsForUrl` facade filter (same parity)
- Test: `tests/unit/background/background-highlight-orchestrator.test.ts` (new or extend)

- [ ] **Step 1: Write failing test**

```ts
it('finds highlights stored as www. when page is bare domain and vice versa', async () => {
  const stored = { id:'1', url:'https://www.gutenberg.org/files/67799/67799-h/67799-h.htm', text:'x', contentHash:'a'.repeat(64), colorRole:'yellow', type:'underscore', createdAt:new Date(), ranges:[{xpath:'/a',startOffset:0,endOffset:1,text:'x',textBefore:'',textAfter:''}] } as any;
  facade.getAll.mockReturnValue([stored]);
  readable.findByUrl.mockResolvedValue([]);
  const res = await orchestrator['onFindByUrl']({ url:'https://gutenberg.org/files/67799/67799-h/67799-h.htm' }, { tab:{ url:'https://gutenberg.org/files/67799/67799-h/67799-h.htm' } } as any);
  expect(res.data).toHaveLength(1);
});
```

- [ ] **Step 2: Run to fail**

- [ ] **Step 3: Implementation**

In `onFindByUrl:157` after building `keys`:

```ts
function wwwVariants(url: string): string[] {
  try{ const u=new URL(url); const h=u.hostname; const other = h.startsWith('www.') ? h.slice(4) : `www.${h}`;
       const v=new URL(url); v.hostname=other; return [normalizePageUrl(v.href)]; }catch{ return []; }
}
for(const k of [...keys]) for(const v of wwwVariants(k)) keys.add(v);
```

Apply same expansion to `restoreHighlightsForUrl:152` filter: normalize both `h.url` and page `url`, compare also with `www.` toggled. Scope to `http(s)` only; do not over-match `m.` or other subdomains.

- [ ] **Step 4: Verify**
  `bun run vitest run tests/unit/background/background-highlight-orchestrator.test.ts && bun run type-check`

- [ ] **Step 5: Commit**
  `git add src/background/services/background-highlight-orchestrator.ts src/services/cloud-mode-service.ts tests/unit/background/background-highlight-orchestrator.test.ts`
  `git commit -m "fix(url): include www variant in findByUrl candidate keys"`

---

### Task 5: E2E fixture + manual verification (no new prod code)

**Files:**
- Create: `tests/fixtures/gutenberg-67799-snippet.html` (minimal p with `\n` + `\u2019`)
- Create: `tests/e2e/gutenberg-restore.spec.ts` (Playwright) or jsdom harness `scripts/hitl-loop.template.sh` copy

- [ ] Steps:
  1. Save fixture HTML matching `#:~:text=art%20is%20more%20the%20expression%20of%20the%20ideal...` paragraph.
  2. Headless script: `ProMode.createHighlight` on that range -> assert `facade.addPersisted` payload selector has raw exact with `\n`, prefix present -> reload jsdom with fixture -> call `restoreHighlightsForUrl` -> assert `RangeOverlayPainter.getInstance().paintedCount===1`.
  3. Also test legacy row: manually insert row with `exact:"art is more the expression of the ideal"` (spaces) and no prefix -> restore returns range via collapsed finder (healed later).
  4. Run `bun run build && bun run type-check && bun run vitest run` — all green.

- [ ] **Commit** fixture + harness (or leave harness throwaway per diagnose cleanup rule; fixture stays).

---

## Spec coverage

| Requirement | Task |
|---|---|
| `highlight.text` stays normalized body, `selector.exact` stays raw | 1 |
| Existing IDB rows with spaces/ASCII restore | 2 |
| Smart quotes `’`/`“”` + NBSP/ZWSP equivalence | 2 |
| `Range` offsets correct across collapsed `\n` runs | 2 |
| Prefix/suffix preserved for new rows, fallback when missing | 1, 3 |
| Fallback to xpath/fuzzy via `SerializedRange` not `MultiSelector` | 3 |
| `www.` ↔ bare domain not orphaned | 4 |
| No `www.` over-match, hash `#:~:text=` ignored | 4 |
| LiveRanges never persisted | 1 |
| Lazy healing of legacy selectors | 3 (optional) |

## Sequencing

1 -> 2 -> 3 -> 4 -> 5. Task 1 is 30 min and unblocks. Tasks 2+3 touch same finder; do 2 first to get correct `Range`. Task 4 is independent and can parallelize with 2.

## Rollback

Each task is independently revertible. Reverting Task 1 restores old (buggy) behavior for new rows only; reverting Task 2 re-breaks Gutenberg but keeps Task 1 fix.

