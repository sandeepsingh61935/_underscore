#!/usr/bin/env node
/**
 * POC: related highlights + related tags (hybrid scorer)
 *
 * Signals:
 *  - tag Jaccard (IDF-weighted)
 *  - BM25 on highlight text (+ notes)
 *  - same URL / same domain boosts
 *
 * Usage:
 *   node scripts/poc-relatedness.mjs
 *   node scripts/poc-relatedness.mjs path/to/export.json
 *   node scripts/poc-relatedness.mjs path/to/export.md --gate
 *   node scripts/poc-relatedness.mjs path/to/export.md --gate --synth-tags
 *   node scripts/poc-relatedness.mjs --sparse
 *   node scripts/poc-relatedness.mjs --no-autotag
 *
 * Export JSON shape (array or {highlights}):
 *   { id, text|quote, url|source, tags?, notes|note?, createdAtMs? }
 * Markdown export: underscore library .md (## domain / **N.** / > quote / [source])
 */

import { readFileSync } from 'node:fs';
import { resolve, extname } from 'node:path';

const TOP_K = 5;
const W_TAG = 0.55;
const W_TEXT = 0.35;
const W_URL = 0.08;
const W_DOMAIN = 0.02;
const SPARSE = process.argv.includes('--sparse');
const GATE = process.argv.includes('--gate');
const SYNTH_TAGS = process.argv.includes('--synth-tags');
const NO_AUTOTAG = process.argv.includes('--no-autotag') || GATE;
const inputPath =
  process.argv.slice(2).find((a) => !a.startsWith('--')) ??
  'tests/fixtures/coursera-scale-highlights.json';

// --- keyword tagger for fixture-only (skipped with --gate / --no-autotag) ---
const RULES = [
  [/supervised|labeled training/i, ['supervised-learning', 'ml-basics']],
  [/regression|mse|normal equation|hypothesis/i, ['regression', 'supervised-learning']],
  [/classification|decision boundary|one-vs-all|multiclass/i, ['classification', 'supervised-learning']],
  [/logistic|sigmoid|log loss|softmax/i, ['logistic-regression', 'classification']],
  [/gradient descent|learning rate|stochastic gradient|batch gradient/i, ['optimization', 'gradient-descent']],
  [/cost function|convex/i, ['optimization', 'regression']],
  [/feature scaling|feature normalization|polynomial features|vectorization/i, ['features', 'preprocessing']],
  [/overfitting|underfitting|high variance|high bias|regulariz/i, ['regularization', 'model-selection']],
  [/cross-validation|learning curves|hyperparameter|validation/i, ['model-selection', 'evaluation']],
  [/precision|recall|f1|skewed/i, ['evaluation', 'classification']],
  [/neural|backprop|forward propagation|hidden layer|dropout|gradient checking|random initialization|network architecture|unrolling parameters/i, ['neural-nets', 'deep-learning']],
  [/anomaly|collaborative filtering|matrix factorization|pca|principal component|unsupervised/i, ['unsupervised', 'ml-basics']],
  [/octave|machine learning is programming|applications include|course uses/i, ['ml-basics', 'course']],
  [/online learning|map-reduce|large-scale/i, ['systems', 'optimization']],
  [/training set|test set/i, ['evaluation', 'ml-basics']],
];

function autoTags(text) {
  const tags = new Set();
  for (const [re, ts] of RULES) {
    if (re.test(text)) ts.forEach((t) => tags.add(t));
  }
  if (tags.size === 0) tags.add('untagged');
  return [...tags].sort();
}

/**
 * Synthetic tags for real-library validation when user tags are absent/junk.
 * Deterministic from domain + URL path + text keywords. Families are known so
 * related-tags can be scored against expected co-members.
 */
const TAG_FAMILIES = {
  'startup-essays': ['paul-graham', 'startups', 'essays', 'founders'],
  'ai-systems': ['ai', 'llm', 'agents', 'rag', 'ml-eng'],
  'ml-course': ['machine-learning', 'coursera', 'supervised', 'optimization'],
  'philosophy': ['philosophy', 'marx', 'hegel', 'history-of-ideas'],
  'design': ['design', 'figma', 'product-ui'],
  'algorithms': ['algorithms', 'dsa', 'leetcode', 'coding-practice'],
  'apple-dev': ['apple', 'ios-dev', 'app-store'],
  'reference': ['wikipedia', 'definitions', 'etymology'],
  'systems-lang': ['golang', 'systems-programming', 'github'],
};

const DOMAIN_FAMILY = [
  [/paulgraham\.com/i, 'startup-essays'],
  [/chatgpt\.com|claude\.ai|gemini\.google\.com/i, 'ai-systems'],
  [/coursera\.org/i, 'ml-course'],
  [/youtubetotranscript\.com|youtube\.com/i, 'philosophy'],
  [/plato\.stanford\.edu|americanliterature\.com/i, 'philosophy'],
  [/figma\.com/i, 'design'],
  [/geeksforgeeks\.org|leetcode\.com|hackerrank\.com/i, 'algorithms'],
  [/developer\.apple\.com/i, 'apple-dev'],
  [/wikipedia\.org/i, 'reference'],
  [/go\.dev|github\.com/i, 'systems-lang'],
];

const TEXT_TAG_RULES = [
  [/startup|founder|investor|yc\b|venture/i, ['startups', 'founders']],
  [/essay|write|writing|reader/i, ['essays']],
  [/llm|language model|transformer|prompt|rag\b|agent/i, ['llm', 'ai', 'agents']],
  [/gpu|cuda|inference|embedding/i, ['ml-eng', 'ai']],
  [/gradient|regression|neural|supervised|overfit|backprop/i, ['machine-learning', 'supervised']],
  [/marx|hegel|alienation|dialectic|capital/i, ['marx', 'hegel', 'philosophy']],
  [/figma|prototype|component|design system|ui\b|ux\b/i, ['design', 'product-ui']],
  [/array|binary|sort|complexity|big.?o|tree|graph/i, ['algorithms', 'dsa']],
  [/app store|swift|ios|apple/i, ['apple', 'ios-dev']],
  [/etymology|hello|definition|means/i, ['definitions', 'etymology']],
  [/go\b|golang|goroutine/i, ['golang', 'systems-programming']],
];

function synthTagsFor(h) {
  const tags = new Set();
  const hay = `${h.domain} ${h.url} ${h.text} ${h.notes}`;
  let family = null;
  for (const [re, fam] of DOMAIN_FAMILY) {
    if (re.test(hay)) {
      family = fam;
      break;
    }
  }
  if (family) {
    const members = TAG_FAMILIES[family] ?? [];
    // always attach family anchor + 1-2 stable members
    tags.add(members[0] ?? family);
    if (members[1]) tags.add(members[1]);
    // hash-stable extra member so not every doc is identical
    const n = [...h.id].reduce((s, c) => s + c.charCodeAt(0), 0);
    if (members.length > 2) tags.add(members[2 + (n % Math.max(members.length - 2, 1))] ?? members[2]);
  }
  for (const [re, ts] of TEXT_TAG_RULES) {
    if (re.test(hay)) ts.forEach((t) => tags.add(t));
  }
  // light noise tags (~8%) to mimic messy libraries
  const noiseRoll = [...h.id].reduce((s, c) => s + c.charCodeAt(0), 0) % 100;
  if (noiseRoll < 8) tags.add(noiseRoll < 4 ? 'todo' : 'misc');
  if (tags.size === 0) tags.add('untagged');
  return [...tags].sort();
}

function expectedRelatedTags(tag) {
  for (const members of Object.values(TAG_FAMILIES)) {
    if (members.includes(tag)) return new Set(members.filter((t) => t !== tag));
  }
  // text-only tags: map into families that contain them
  const out = new Set();
  for (const members of Object.values(TAG_FAMILIES)) {
    if (members.includes(tag)) members.filter((t) => t !== tag).forEach((t) => out.add(t));
  }
  return out;
}

function domainOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function parseMarkdownExport(md) {
  const lines = md.split(/\n/);
  const items = [];
  let i = 0;
  while (i < lines.length) {
    const m = lines[i].match(/^\*\*(\d+)\.\*\*\s*$/);
    if (!m) {
      i++;
      continue;
    }
    const num = m[1];
    i++;
    while (i < lines.length && lines[i].trim() === '') i++;
    let text = '';
    if (i < lines.length && lines[i].startsWith('>')) {
      const parts = [];
      while (i < lines.length) {
        const L0 = lines[i];
        if (L0.startsWith('[')) break;
        if (L0.startsWith('**') && L0.match(/^\*\*\d+\.\*\*/)) break;
        if (L0.startsWith('##')) break;
        if (L0.startsWith('>')) {
          parts.push(L0.replace(/^>\s?/, ''));
          i++;
          continue;
        }
        if (L0.trim() === '') {
          let j = i + 1;
          while (j < lines.length && lines[j].trim() === '') j++;
          if (
            j < lines.length &&
            (lines[j].startsWith('[') || lines[j].startsWith('**') || lines[j].startsWith('##'))
          ) {
            break;
          }
        }
        if (L0.trim()) parts.push(L0);
        i++;
      }
      text = parts.join('\n').trim();
    }
    while (i < lines.length && lines[i].trim() === '') i++;
    let date = '';
    let url = '';
    let tags = [];
    let note = '';
    while (i < lines.length && lines[i].startsWith('[')) {
      const L = lines[i];
      const dm = L.match(/^\[date\]\s*(.*)$/);
      const sm = L.match(/^\[source\]\s*(.*)$/);
      const tm = L.match(/^\[tags\]\s*(.*)$/);
      const nm = L.match(/^\[note\]\s*(.*)$/);
      if (dm) date = dm[1].trim();
      else if (sm) url = sm[1].trim();
      else if (tm) tags = tm[1].split(/[,;]/).map((s) => s.trim()).filter(Boolean);
      else if (nm) note = nm[1].trim();
      i++;
    }
    items.push({
      id: `md-${num}`,
      text,
      url,
      tags,
      notes: note,
      createdAtMs: date ? Date.parse(date) || 0 : 0,
    });
  }
  return items;
}

function loadRawRows(path) {
  const abs = resolve(path);
  const body = readFileSync(abs, 'utf8');
  if (extname(abs).toLowerCase() === '.md') return parseMarkdownExport(body);

  const raw = JSON.parse(body);
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.highlights)) return raw.highlights;
  if (Array.isArray(raw.data)) return raw.data;
  return [];
}

function loadHighlights(path) {
  const rows = loadRawRows(path);
  const hasAnyTags = rows.some((r) => Array.isArray(r.tags) && r.tags.length > 0);
  const allowAuto = !NO_AUTOTAG && !hasAnyTags;

  return rows.map((r, i) => {
    const text = String(r.text ?? r.quote ?? r.highlightedText ?? '');
    let url = String(r.url ?? r.source ?? '');
    if (!url && r.domain) {
      const path = String(r.path ?? '');
      url = `https://${String(r.domain).replace(/^https?:\/\//, '')}${path.startsWith('/') ? path : path ? `/${path}` : ''}`;
    }
    let tags = Array.isArray(r.tags)
      ? r.tags.map(String)
      : Array.isArray(r.metadata?.tags)
        ? r.metadata.tags.map(String)
        : [];
    if (allowAuto) tags = autoTags(text);
    if (SPARSE && tags.length > 1) tags = tags.slice(0, 1);
    const row = {
      id: String(r.id ?? `h${i}`),
      text,
      notes: String(r.notes ?? r.note ?? ''),
      url,
      domain: String(r.domain ?? domainOf(url)),
      tags: [...new Set(tags.map((t) => t.toLowerCase().trim()).filter(Boolean))].sort(),
      createdAtMs: Number(r.createdAtMs ?? (r.savedAt ? Date.parse(r.savedAt) : 0) ?? r.createdAt ?? 0) || 0,
    };
    if (SYNTH_TAGS) row.tags = synthTagsFor(row);
    return row;
  });
}

// --- text: tiny BM25 ---
const STOP = new Set(
  'a an the is are was were be been being to of in on for and or as at by with from that this it its into our your their we you they not no'.split(
    ' ',
  ),
);

function tokenize(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

function buildBm25(docs) {
  const N = docs.length;
  const k1 = 1.4;
  const b = 0.75;
  const tfs = [];
  const df = new Map();
  let totalLen = 0;

  for (const d of docs) {
    const tokens = tokenize(`${d.text} ${d.notes}`);
    totalLen += tokens.length;
    const tf = new Map();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    tfs.push({ tf, len: tokens.length });
    for (const t of tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const avgdl = totalLen / Math.max(N, 1);
  const idf = new Map();
  for (const [t, n] of df) {
    idf.set(t, Math.log(1 + (N - n + 0.5) / (n + 0.5)));
  }

  function score(queryIdx, docIdx) {
    if (queryIdx === docIdx) return 0;
    const q = tfs[queryIdx];
    const d = tfs[docIdx];
    let s = 0;
    for (const [t, qf] of q.tf) {
      const f = d.tf.get(t);
      if (!f) continue;
      const idfT = idf.get(t) ?? 0;
      const denom = f + k1 * (1 - b + (b * d.len) / avgdl);
      s += idfT * ((f * (k1 + 1)) / denom) * Math.min(qf, 3);
    }
    return s;
  }

  let max = 0;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      if (i === j) continue;
      max = Math.max(max, score(i, j));
    }
  }
  return {
    scoreNorm(i, j) {
      const s = score(i, j);
      return max > 0 ? s / max : 0;
    },
  };
}

function buildTagStats(docs) {
  const df = new Map();
  for (const d of docs) {
    for (const t of new Set(d.tags)) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const N = docs.length;
  const idf = new Map();
  for (const [t, n] of df) idf.set(t, Math.log(1 + N / n));

  function weightedJaccard(a, b) {
    const A = new Set(a.tags);
    const B = new Set(b.tags);
    if (A.size === 0 && B.size === 0) return 0;
    let inter = 0;
    let union = 0;
    const all = new Set([...A, ...B]);
    for (const t of all) {
      const w = idf.get(t) ?? 1;
      union += w;
      if (A.has(t) && B.has(t)) inter += w;
    }
    return union > 0 ? inter / union : 0;
  }

  function relatedTags(tag, limit = TOP_K) {
    const pair = new Map();
    let tagDf = 0;
    for (const d of docs) {
      if (!d.tags.includes(tag)) continue;
      tagDf++;
      for (const other of d.tags) {
        if (other === tag) continue;
        // drop obvious noise from suggestions
        if (other === 'todo' || other === 'misc' || other === 'untagged') continue;
        pair.set(other, (pair.get(other) ?? 0) + 1);
      }
    }
    // Jaccard over highlight sets: |A∩B| / |A∪B|
    // Prefer pairs that truly share mass; rare 1-off co-occurs rank low.
    return [...pair.entries()]
      .map(([other, c]) => {
        const dfB = df.get(other) ?? 1;
        const union = tagDf + dfB - c;
        const jaccard = union > 0 ? c / union : 0;
        return {
          tag: other,
          cooccur: c,
          score: jaccard,
          reason: `co-occur ${c}x jaccard=${jaccard.toFixed(2)} (df=${dfB})`,
        };
      })
      .filter((r) => r.cooccur >= 2 || r.score >= 0.15)
      .sort((a, b) => b.score - a.score || b.cooccur - a.cooccur)
      .slice(0, limit);
  }

  return { weightedJaccard, relatedTags, df };
}

function relatedHighlights(docs, idx, bm25, tagStats, limit = TOP_K) {
  const seed = docs[idx];
  const scored = [];
  for (let j = 0; j < docs.length; j++) {
    if (j === idx) continue;
    const other = docs[j];
    const tag = tagStats.weightedJaccard(seed, other);
    const text = bm25.scoreNorm(idx, j);
    const sameUrl = seed.url && seed.url === other.url ? 1 : 0;
    const sameDomain = seed.domain && seed.domain === other.domain ? 1 : 0;
    const score = W_TAG * tag + W_TEXT * text + W_URL * sameUrl + W_DOMAIN * sameDomain;
    if (score <= 0) continue;
    const reasons = [];
    if (tag > 0) {
      const shared = seed.tags.filter((t) => other.tags.includes(t));
      reasons.push(`tags:${shared.join(',') || tag.toFixed(2)}`);
    }
    if (text > 0.05) reasons.push(`text:${text.toFixed(2)}`);
    if (sameUrl) reasons.push('same-url');
    else if (sameDomain) reasons.push('same-domain');
    scored.push({
      id: other.id,
      idx: j,
      score,
      tag,
      text,
      sameUrl: !!sameUrl,
      sameDomain: !!sameDomain,
      reasons: reasons.join(' | ') || 'weak',
      textPreview: other.text.slice(0, 100).replace(/\s+/g, ' '),
      tags: other.tags,
      url: other.url,
    });
  }
  scored.sort((a, b) => b.score - a.score || b.tag - a.tag || b.text - a.text);
  return scored.slice(0, limit);
}

// --- fixture topic proxy ---
const TOPIC = {
  regression: [/regression|mse|normal equation|hypothesis|feature scaling|gradient descent|learning rate|batch gradient|stochastic|feature normalization/i],
  logistic: [/logistic|sigmoid|decision boundary|classification|one-vs-all|multiclass|log loss|precision|recall|f1/i],
  neural: [/neural|backprop|forward propagation|hidden|softmax|gradient checking|random initialization|network architecture|dropout|unrolling/i],
  model: [/overfitting|underfitting|bias|variance|regulariz|cross-validation|learning curves|hyperparameter/i],
};

function guessTopic(h) {
  for (const [name, res] of Object.entries(TOPIC)) {
    if (res.some((re) => re.test(h.text) || h.tags.some((t) => re.test(t)))) return name;
  }
  return null;
}

function evaluateFixture(docs, bm25, tagStats) {
  let seeds = 0;
  let hitAt1 = 0;
  let hitAt3 = 0;
  const failures = [];

  for (let i = 0; i < docs.length; i++) {
    const topic = guessTopic(docs[i]);
    if (!topic) continue;
    seeds++;
    const top = relatedHighlights(docs, i, bm25, tagStats);
    const topics = top.map((r) => guessTopic(docs[r.idx]));
    if (topics[0] === topic) hitAt1++;
    if (topics.slice(0, 3).includes(topic)) hitAt3++;
    else {
      failures.push({
        id: docs[i].id,
        topic,
        got: top.slice(0, 3).map((r) => `${r.id}:${guessTopic(docs[r.idx]) ?? '?'}`),
      });
    }
  }

  return {
    seeds,
    precisionAt1: seeds ? hitAt1 / seeds : 0,
    recallProxyAt3: seeds ? hitAt3 / seeds : 0,
    failures: failures.slice(0, 8),
  };
}

/**
 * Real-library structural gate (no topic labels required).
 * - siblingHit@3: seed on URL with >=1 sibling → at least one same-URL in top3
 * - siblingRecall@5: fraction of same-URL siblings recovered in top5
 * - meanSameUrlInTop3: purity of top3 for clustered URLs
 * - nonEmptyTop3: scorer returns results
 * - meaningfulTagSupport: enough real tags to judge related-tags
 */
function evaluateRealGate(docs, bm25, tagStats) {
  const byUrl = new Map();
  for (let i = 0; i < docs.length; i++) {
    const u = docs[i].url;
    if (!u) continue;
    if (!byUrl.has(u)) byUrl.set(u, []);
    byUrl.get(u).push(i);
  }

  let clusterSeeds = 0;
  let siblingHitAt3 = 0;
  let siblingRecallNum = 0;
  let siblingRecallDen = 0;
  let puritySum = 0;
  let nonEmpty = 0;
  let textLenOkSeeds = 0;
  const review = [];

  for (let i = 0; i < docs.length; i++) {
    const seed = docs[i];
    const cluster = byUrl.get(seed.url) ?? [i];
    const siblings = cluster.filter((j) => j !== i);
    const top = relatedHighlights(docs, i, bm25, tagStats, TOP_K);
    if (top.length > 0) nonEmpty++;

    if (siblings.length === 0) continue;
    if (seed.text.trim().length >= 40) textLenOkSeeds++;
    clusterSeeds++;

    const top3 = top.slice(0, 3);
    const sameInTop3 = top3.filter((r) => r.sameUrl).length;
    const sameInTop5 = top.filter((r) => r.sameUrl).length;
    if (sameInTop3 > 0) siblingHitAt3++;
    puritySum += top3.length ? sameInTop3 / top3.length : 0;
    siblingRecallNum += sameInTop5;
    siblingRecallDen += Math.min(TOP_K, siblings.length);

    if (review.length < 8 && seed.text.trim().length >= 40) {
      review.push({
        id: seed.id,
        text: seed.text.slice(0, 110).replace(/\s+/g, ' '),
        url: seed.url,
        siblingCount: siblings.length,
        top: top.slice(0, 3).map((r) => ({
          id: r.id,
          score: r.score,
          sameUrl: r.sameUrl,
          reasons: r.reasons,
          text: r.textPreview,
        })),
      });
    }
  }

  const multiTag = docs.filter((d) => d.tags.length >= 2);
  const anyTag = docs.filter((d) => d.tags.length >= 1);
  const tagDf = tagStats.df;
  const realishTags = [...tagDf.entries()].filter(
    ([t, n]) => n >= 2 && t.length > 2 && !/^sdf|asdf|something|test/i.test(t),
  );

  return {
    n: docs.length,
    withTags: anyTag.length,
    multiTag: multiTag.length,
    uniqueUrls: byUrl.size,
    urlsWithSiblings: [...byUrl.values()].filter((a) => a.length > 1).length,
    clusterSeeds,
    textLenOkSeeds,
    nonEmptyRate: docs.length ? nonEmpty / docs.length : 0,
    siblingHitAt3: clusterSeeds ? siblingHitAt3 / clusterSeeds : null,
    siblingRecallAt5: siblingRecallDen ? siblingRecallNum / siblingRecallDen : null,
    meanSameUrlPurityAt3: clusterSeeds ? puritySum / clusterSeeds : null,
    relatedTagsViable: realishTags.length >= 3 && anyTag.length >= 20,
    realishTagCount: realishTags.length,
    junkTagNote: anyTag.length > 0 && realishTags.length === 0,
    review,
  };
}

/** Score related-tags against known synth families (or co-occurrence sanity). */
function evaluateRelatedTags(docs, tagStats) {
  const df = tagStats.df;
  const candidates = [...df.entries()]
    .filter(([t, n]) => n >= 3 && t !== 'todo' && t !== 'misc' && t !== 'untagged')
    .map(([t]) => t);

  let seeds = 0;
  let hitAt1 = 0;
  let hitAt3 = 0;
  const samples = [];

  for (const tag of candidates) {
    const expected = expectedRelatedTags(tag);
    // If tag not in a family, expected = other tags that co-occur most in ground truth synth:
    // fall back: any returned tag with df>=2 counts as weak pass only for listing
    const rel = tagStats.relatedTags(tag, 5);
    if (!rel.length) continue;
    seeds++;
    const top = rel.map((r) => r.tag);
    const exp = expected.size
      ? expected
      : new Set(
          // fallback expected: tags that co-occur at least twice with this tag in docs
          (() => {
            const c = new Map();
            for (const d of docs) {
              if (!d.tags.includes(tag)) continue;
              for (const o of d.tags) if (o !== tag) c.set(o, (c.get(o) ?? 0) + 1);
            }
            return [...c.entries()].filter(([, n]) => n >= 2).map(([t]) => t);
          })(),
        );
    if (exp.has(top[0])) hitAt1++;
    if (top.slice(0, 3).some((t) => exp.has(t))) hitAt3++;
    if (samples.length < 10) {
      samples.push({
        tag,
        df: df.get(tag),
        top: rel.slice(0, 3).map((r) => `${r.tag}(${r.cooccur})`),
        expected: [...exp].slice(0, 6),
      });
    }
  }

  return {
    seeds,
    precisionAt1: seeds ? hitAt1 / seeds : null,
    hitAt3: seeds ? hitAt3 / seeds : null,
    samples,
  };
}

function printSeed(docs, idx, bm25, tagStats) {
  const seed = docs[idx];
  console.log('--- seed', seed.id, '---');
  console.log(`text: ${seed.text.slice(0, 140).replace(/\s+/g, ' ')}`);
  console.log(`tags: [${seed.tags.join(', ')}]  url: ${seed.url}`);
  console.log('related highlights:');
  for (const r of relatedHighlights(docs, idx, bm25, tagStats)) {
    console.log(
      `  ${r.score.toFixed(3)}  ${String(r.id).padEnd(8)}  [${r.tags.join(', ')}]  ${r.reasons}\n           ${r.textPreview}`,
    );
  }
  if (seed.tags[0]) {
    const rel = tagStats.relatedTags(seed.tags[0]);
    console.log(`related tags for "${seed.tags[0]}":`);
    if (!rel.length) console.log('  (none — need co-occurrence)');
    for (const t of rel) console.log(`  ${t.score.toFixed(4)}  ${t.tag}  (${t.reason})`);
  }
  console.log('');
}

// --- main ---
const docs = loadHighlights(inputPath);
if (docs.length < 3) {
  console.error('Need at least 3 highlights in', inputPath);
  process.exit(1);
}

const bm25 = buildBm25(docs);
const tagStats = buildTagStats(docs);
const tagCount = docs.filter((d) => d.tags.length > 0).length;
const avgTags = docs.reduce((s, d) => s + d.tags.length, 0) / docs.length;
const avgText = docs.reduce((s, d) => s + d.text.length, 0) / docs.length;

console.log('=== Relatedness POC ===');
console.log(
  `source: ${inputPath}${SPARSE ? ' (SPARSE)' : ''}${GATE ? ' (GATE)' : ''}${NO_AUTOTAG ? ' (no-autotag)' : ''}${SYNTH_TAGS ? ' (SYNTH-TAGS)' : ''}`,
);
console.log(
  `highlights: ${docs.length} | with tags: ${tagCount} | avg tags/hl: ${avgTags.toFixed(2)} | avg text len: ${avgText.toFixed(0)}`,
);
console.log(`weights: tag=${W_TAG} text=${W_TEXT} url=${W_URL} domain=${W_DOMAIN}`);
console.log('');

if (GATE) {
  const g = evaluateRealGate(docs, bm25, tagStats);
  console.log('=== REAL GATE (structural) ===');
  console.log(`unique urls: ${g.uniqueUrls} | urls with 2+ highlights: ${g.urlsWithSiblings}`);
  console.log(`cluster seeds (have same-URL sibling): ${g.clusterSeeds}`);
  console.log(`non-empty related list rate: ${(g.nonEmptyRate * 100).toFixed(1)}%`);
  console.log(
    `siblingHit@3 (≥1 same-URL in top3): ${g.siblingHitAt3 == null ? 'n/a' : `${(g.siblingHitAt3 * 100).toFixed(1)}%`}`,
  );
  console.log(
    `siblingRecall@5 (same-URL siblings recovered): ${g.siblingRecallAt5 == null ? 'n/a' : `${(g.siblingRecallAt5 * 100).toFixed(1)}%`}`,
  );
  console.log(
    `mean same-URL purity@3: ${g.meanSameUrlPurityAt3 == null ? 'n/a' : `${(g.meanSameUrlPurityAt3 * 100).toFixed(1)}%`}`,
  );
  console.log(`tags present: ${g.withTags}/${g.n} | multi-tag: ${g.multiTag} | realish tags (df>=2): ${g.realishTagCount}`);
  console.log(
    `related-tags feature viable on this library: ${g.relatedTagsViable ? 'YES' : 'NO'}${g.junkTagNote ? ' (only junk/singleton tags)' : ''}`,
  );

  let tagEval = null;
  if (SYNTH_TAGS || g.relatedTagsViable) {
    tagEval = evaluateRelatedTags(docs, tagStats);
    console.log('');
    console.log('=== RELATED TAGS EVAL ===');
    console.log(`tag seeds (df>=3): ${tagEval.seeds}`);
    console.log(
      `relatedTag P@1 (family/cooccur): ${tagEval.precisionAt1 == null ? 'n/a' : `${(tagEval.precisionAt1 * 100).toFixed(1)}%`}`,
    );
    console.log(
      `relatedTag hit@3: ${tagEval.hitAt3 == null ? 'n/a' : `${(tagEval.hitAt3 * 100).toFixed(1)}%`}`,
    );
    for (const s of tagEval.samples) {
      console.log(`  ${s.tag} df=${s.df} -> ${s.top.join(', ')}  | expected~ [${s.expected.join(', ')}]`);
    }
  }

  console.log('');
  console.log('--- sample cluster reviews (for eyeballing) ---');
  for (const r of g.review) {
    console.log(`\nseed ${r.id} (siblings=${r.siblingCount})`);
    console.log(`  ${r.text}`);
    console.log(`  ${r.url}`);
    for (const t of r.top) {
      console.log(
        `  -> ${t.score.toFixed(3)} ${t.sameUrl ? 'SAME-URL' : 'other   '} ${t.reasons}\n     ${t.text}`,
      );
    }
  }

  // Thresholds for sparse-tag real libraries: text+url must still surface page siblings
  const PASS_HIT = 0.7;
  const PASS_RECALL = 0.4;
  const PASS_NONEMPTY = 0.95;
  const PASS_TAG_H3 = 0.7;
  const hitOk = g.siblingHitAt3 != null && g.siblingHitAt3 >= PASS_HIT;
  const recallOk = g.siblingRecallAt5 != null && g.siblingRecallAt5 >= PASS_RECALL;
  const emptyOk = g.nonEmptyRate >= PASS_NONEMPTY;
  const hlPass = hitOk && recallOk && emptyOk;

  let tagsPass = !SYNTH_TAGS; // only required when validating synth/real tags
  if (SYNTH_TAGS) {
    const minTagSeeds = docs.length >= 100 ? 5 : 3;
    tagsPass =
      tagEval &&
      tagEval.seeds >= minTagSeeds &&
      tagEval.hitAt3 != null &&
      tagEval.hitAt3 >= PASS_TAG_H3;
  } else if (!g.relatedTagsViable) {
    tagsPass = false;
  }

  const pass = hlPass && (SYNTH_TAGS ? tagsPass : true);

  console.log('');
  console.log('=== GATE VERDICT ===');
  console.log(`siblingHit@3 >= ${PASS_HIT}: ${hitOk ? 'PASS' : 'FAIL'} (${g.siblingHitAt3 == null ? 'n/a' : g.siblingHitAt3.toFixed(3)})`);
  console.log(
    `siblingRecall@5 >= ${PASS_RECALL}: ${recallOk ? 'PASS' : 'FAIL'} (${g.siblingRecallAt5 == null ? 'n/a' : g.siblingRecallAt5.toFixed(3)})`,
  );
  console.log(`nonEmpty >= ${PASS_NONEMPTY}: ${emptyOk ? 'PASS' : 'FAIL'} (${g.nonEmptyRate.toFixed(3)})`);
  if (SYNTH_TAGS) {
    console.log(
      `relatedTags hit@3 >= ${PASS_TAG_H3}: ${tagsPass ? 'PASS' : 'FAIL'} (${tagEval?.hitAt3 == null ? 'n/a' : tagEval.hitAt3.toFixed(3)}; seeds=${tagEval?.seeds ?? 0})`,
    );
  } else if (!g.relatedTagsViable) {
    console.log('related-tags: BLOCKED on this corpus — need real multi-highlight tagging (or --synth-tags).');
  }
  console.log(
    hlPass
      ? 'related-highlights: PASS'
      : 'related-highlights: FAIL — not reliable enough with current weights/signals.',
  );
  if (SYNTH_TAGS) {
    console.log(tagsPass ? 'related-tags (synth): PASS' : 'related-tags (synth): FAIL');
  }
  console.log(
    pass
      ? `OVERALL: PASS${SYNTH_TAGS ? ' (highlights + synth related-tags)' : ' (highlights backbone)'}.`
      : 'OVERALL: FAIL',
  );
  if (hlPass && !SYNTH_TAGS && !g.relatedTagsViable) {
    console.log('NOTE: ship related-highlights first; re-run with --synth-tags to validate related-tags algorithm.');
  }
  process.exit(pass ? 0 : 1);
}

// Non-gate demo mode
const demoIds = ['c4', 'c9', 'c16', 'c21', 'c26', docs[0].id];
const seen = new Set();
for (const id of demoIds) {
  const idx = docs.findIndex((d) => d.id === id);
  if (idx < 0 || seen.has(id)) continue;
  seen.add(id);
  printSeed(docs, idx, bm25, tagStats);
}

// If not fixture-like, still print a few long seeds
if (![...seen].some((id) => id.startsWith('c'))) {
  const longs = docs
    .map((d, i) => ({ i, len: d.text.length }))
    .filter((x) => x.len >= 60)
    .slice(0, 5);
  for (const { i } of longs) printSeed(docs, i, bm25, tagStats);
}

const ev = evaluateFixture(docs, bm25, tagStats);
if (ev.seeds >= 5) {
  console.log('=== Auto eval (topic proxy) ===');
  console.log(`seeds with known topic: ${ev.seeds}`);
  console.log(`P@1: ${(ev.precisionAt1 * 100).toFixed(1)}% | hit@3: ${(ev.recallProxyAt3 * 100).toFixed(1)}%`);
  const pass = ev.precisionAt1 >= 0.5 && ev.recallProxyAt3 >= 0.7;
  console.log(pass ? 'PASS (fixture proxy)' : 'FAIL (fixture proxy)');
  process.exit(pass ? 0 : 1);
}

console.log('No fixture topic labels — re-run with --gate on real exports.');
console.log('  node scripts/poc-relatedness.mjs path/to/export.md --gate');
process.exit(0);
