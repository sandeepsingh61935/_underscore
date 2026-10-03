/**
 * @file group-membership.ts
 * @description Page Groups membership helpers (PRD Concepts + ADR-032 §1).
 *
 * Domain items are live hostname rules: exact match by default, optional
 * subdomain matching via the `tldts` hostname suffix. Membership resolution
 * backs the Home "This page" chip ("In: X +1", "via github.com").
 */

import { parse } from 'tldts';

import type { PageGroup, PageGroupItem } from '@/shared/types/page-group';
import { normalizePageUrl } from '@/shared/utils/normalize-page-url';

export interface DomainRuleInput {
  hostname: string;
  includeSubdomains: boolean;
}

export interface KnownGroupPage {
  urlNormalized: string;
  title?: string | null;
  faviconUrl?: string | null;
}

export interface ResolvedGroupPage {
  urlNormalized: string;
  title: string | null;
  faviconUrl: string | null;
  /** `explicit` for page items, `via:<hostname>` for domain-rule matches. */
  source: string;
}

export interface UrlMembership {
  group: PageGroup;
  /** Rule hostname when membership comes from a domain rule, else null. */
  viaHostname: string | null;
}

function hostnameOf(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'file:') return null;
    const hostname = parsed.hostname.toLowerCase();
    return hostname || null;
  } catch {
    return null;
  }
}

function cleanHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.+$/, '');
}

/**
 * Whether a page URL is covered by a domain rule item.
 * `file:` URLs never match. Subdomain matching requires
 * `includeSubdomains` and a true hostname suffix (`docs.github.com`
 * matches `github.com`; `notgithub.com` does not).
 */
export function matchesDomainRule(url: string, rule: DomainRuleInput): boolean {
  const host = hostnameOf(url);
  const ruleHost = cleanHostname(rule.hostname);
  if (!host || !ruleHost) return false;
  if (host === ruleHost) return true;
  if (!rule.includeSubdomains) return false;
  if (!host.endsWith(`.${ruleHost}`)) return false;
  const hostDomain = parse(host).domain;
  const ruleDomain = parse(ruleHost).domain;
  if (hostDomain && ruleDomain) {
    return hostDomain === ruleDomain;
  }
  return true;
}

/**
 * Expand a group's items to deduped pages. Explicit page items win over
 * domain-rule matches for the same normalized URL. Tombstoned items are
 * skipped.
 */
export function resolveGroupPages(
  items: PageGroupItem[],
  knownPages: KnownGroupPage[],
): ResolvedGroupPage[] {
  const live = items.filter((item) => item.deletedAt === null);
  const byUrl = new Map<string, ResolvedGroupPage>();

  for (const item of live) {
    if (item.kind !== 'page') continue;
    const key = normalizePageUrl(item.urlNormalized);
    if (!byUrl.has(key)) {
      byUrl.set(key, {
        urlNormalized: key,
        title: item.title,
        faviconUrl: item.faviconUrl,
        source: 'explicit',
      });
    }
  }

  for (const item of live) {
    if (item.kind !== 'domain') continue;
    for (const known of knownPages) {
      const key = normalizePageUrl(known.urlNormalized);
      if (byUrl.has(key)) continue;
      if (!matchesDomainRule(key, item)) continue;
      byUrl.set(key, {
        urlNormalized: key,
        title: known.title ?? null,
        faviconUrl: known.faviconUrl ?? null,
        source: `via:${cleanHostname(item.hostname)}`,
      });
    }
  }

  return [...byUrl.values()];
}

/**
 * List the groups a page URL belongs to, in the given group order.
 * Within a group an explicit page item beats a domain-rule match.
 */
export function membershipsForUrl(
  url: string,
  groups: PageGroup[],
  items: PageGroupItem[],
): UrlMembership[] {
  const key = normalizePageUrl(url);
  const liveGroups = groups.filter((group) => group.deletedAt === null);
  const liveItems = items.filter((item) => item.deletedAt === null);
  const memberships: UrlMembership[] = [];

  for (const group of liveGroups) {
    const groupItems = liveItems.filter((item) => item.groupId === group.id);
    const explicit = groupItems.some(
      (item) =>
        item.kind === 'page' && normalizePageUrl(item.urlNormalized) === key,
    );
    if (explicit) {
      memberships.push({ group, viaHostname: null });
      continue;
    }
    const via = groupItems.find(
      (item) => item.kind === 'domain' && matchesDomainRule(key, item),
    );
    if (via && via.kind === 'domain') {
      memberships.push({ group, viaHostname: cleanHostname(via.hostname) });
    }
  }

  return memberships;
}
