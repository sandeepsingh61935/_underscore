/**
 * @file page-group.ts
 * @description Page Groups domain types (spec PRD Concepts + Platform §1, ADR-032 §2).
 *
 * Page Groups mirror Chrome tab-group semantics (name + color) for pages and
 * domains. Rows are soft-deletable and ordered via fractional-index positions.
 */

export const GROUP_COLORS = [
  'grey',
  'blue',
  'red',
  'yellow',
  'green',
  'pink',
  'purple',
  'cyan',
  'orange',
] as const;

export type GroupColor = (typeof GROUP_COLORS)[number];

export interface PageGroup {
  id: string;
  name: string;
  color: GroupColor;
  position: string;
  boundDeviceId: string | null;
  boundDeviceLabel: string | null;
  boundBrowser: 'chrome' | 'firefox' | 'edge' | null;
  boundAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  ownerId?: string | null;
}

export type PageGroupItem = (
  | {
      kind: 'page';
      urlNormalized: string;
      title: string | null;
      faviconUrl: string | null;
    }
  | { kind: 'domain'; hostname: string; includeSubdomains: boolean }
) & {
  id: string;
  groupId: string;
  position: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export const GROUP_CAPS = { groupsPerUser: 200, itemsPerGroup: 500 } as const;

export interface TabGroupBinding {
  appGroupId: string;
  browserGroupId: number;
  windowId: number;
  title: string;
  color: GroupColor;
  urls: string[]; // normalized URLs
  lastSeenAt: string; // ISO 8601
}

export interface LiveBrowserGroupCandidate {
  browserGroupId: number;
  windowId: number;
  title: string;
  color: GroupColor;
  urls: string[]; // normalized URLs
}

export interface RebindMatch {
  binding: TabGroupBinding;
  candidate: LiveBrowserGroupCandidate;
  score: number;
  jaccardOverlap: number;
}

export interface RebindResult {
  matches: RebindMatch[];
  unmatchedBindings: TabGroupBinding[];
  unmatchedCandidates: LiveBrowserGroupCandidate[];
}
