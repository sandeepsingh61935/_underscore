/**
 * Pure Home presentation helpers shared by popup (and optionally web).
 */

export type HomeEmptyKind = 'first_run' | null;

export type HomeActivePage = {
  domain: string;
  path: string;
  lastActive: number;
  count: number;
};

export type HomeHighlightLike = {
  id: string;
  domain: string;
  path?: string | null;
  savedAt: number;
};

export type HomeCurrentPageRef = {
  domain: string;
  path: string;
} | null;

export type PopupHomeModelInput = {
  isAuthenticated: boolean;
  /** Display name or email local-part (status only; not title). */
  displayName: string | null;
  totalHighlights: number;
  totalDomains: number;
  thisWeekCount: number;
  todayCount: number;
  /** Tab context domain when available (popup). */
  tabDomain: string | null;
  tabPath: string | null;
  currentPageHighlightCount: number;
  recentCount: number;
  nowMs?: number;
};

export type PopupHomeStats = {
  highlightCount: number;
  domainCount: number;
  thisWeekCount: number;
  todayCount: number;
};

export type PopupHomeModel = {
  isGuest: boolean;
  emptyKind: HomeEmptyKind;
  /** Primary title: Local library | Library (no greeting theater). */
  title: string;
  /** Mono status under title. */
  statusLine: string;
  planKicker: string;
  showCurrentPage: boolean;
  currentPageEmpty: boolean;
  stats: PopupHomeStats;
};

/** @deprecated Greeting theater removed from product Home — kept for any residual callers. */
export function homeGreeting(input: {
  name: string | null;
  hour: number;
}): string {
  const when =
    input.hour < 12
      ? 'Good morning'
      : input.hour < 18
        ? 'Good afternoon'
        : 'Good evening';
  return input.name ? `${when}, ${input.name}` : when;
}

export function buildActivePages(
  highlights: readonly HomeHighlightLike[],
  currentPage: HomeCurrentPageRef,
  opts?: { excludeCurrent?: boolean; cap?: number },
): HomeActivePage[] {
  const excludeCurrent = opts?.excludeCurrent ?? true;
  const cap = opts?.cap ?? 8;
  const map = new Map<string, HomeActivePage>();

  for (const h of highlights) {
    const path = h.path || '/';
    const key = `${h.domain}\0${path}`;
    const prev = map.get(key);
    if (!prev || h.savedAt > prev.lastActive) {
      map.set(key, {
        domain: h.domain,
        path,
        lastActive: h.savedAt,
        count: (prev?.count ?? 0) + 1,
      });
    } else {
      prev.count += 1;
    }
  }

  let list = [...map.values()].sort(
    (a, b) => b.lastActive - a.lastActive || a.domain.localeCompare(b.domain),
  );
  if (excludeCurrent && currentPage) {
    list = list.filter(
      (p) => !(p.domain === currentPage.domain && p.path === currentPage.path),
    );
  }
  return list.slice(0, cap);
}

export function buildPopupHomeModel(input: PopupHomeModelInput): PopupHomeModel {
  const isGuest = !input.isAuthenticated;
  const emptyKind: HomeEmptyKind =
    input.totalHighlights === 0 && input.recentCount === 0 ? 'first_run' : null;
  const title = isGuest ? 'Local library' : 'Library';
  const planKicker = isGuest ? 'Local only' : 'Account';
  const statusLine = `${planKicker} · ${input.totalHighlights} highlights · ${input.totalDomains} domains`;

  return {
    isGuest,
    emptyKind,
    title,
    statusLine,
    planKicker,
    showCurrentPage: emptyKind === null,
    currentPageEmpty: !input.tabDomain,
    stats: {
      highlightCount: input.totalHighlights,
      domainCount: input.totalDomains,
      thisWeekCount: input.thisWeekCount,
      todayCount: input.todayCount,
    },
  };
}
