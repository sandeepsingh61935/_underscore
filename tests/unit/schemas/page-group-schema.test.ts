import { describe, expect, it } from 'vitest';

import {
  GroupColorSchema,
  PageGroupItemSchema,
  PageGroupSchema,
} from '@/shared/schemas/page-group-schema';

const baseGroup = {
  id: 'group-1',
  name: 'Research',
  color: 'blue',
  position: 'a0',
  boundDeviceId: null,
  boundDeviceLabel: null,
  boundBrowser: null,
  boundAt: null,
  createdAt: '2026-09-28T00:00:00.000Z',
  updatedAt: '2026-09-28T00:00:00.000Z',
  deletedAt: null,
};

const basePageItem = {
  id: 'item-1',
  groupId: 'group-1',
  position: 'a0',
  kind: 'page',
  urlNormalized: 'https://example.com/article',
  title: 'Example',
  faviconUrl: 'https://example.com/favicon.ico',
  createdAt: '2026-09-28T00:00:00.000Z',
  updatedAt: '2026-09-28T00:00:00.000Z',
  deletedAt: null,
};

describe('page-group-schema', () => {
  describe('GroupColorSchema', () => {
    it.each(['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'])(
      'accepts chrome tab-group color %s',
      (color) => {
        expect(GroupColorSchema.safeParse(color).success).toBe(true);
      }
    );

    it('rejects unknown colors', () => {
      expect(GroupColorSchema.safeParse('teal').success).toBe(false);
      expect(GroupColorSchema.safeParse('').success).toBe(false);
    });
  });

  describe('PageGroupSchema name', () => {
    it('accepts a 1..80 char name', () => {
      expect(PageGroupSchema.safeParse(baseGroup).success).toBe(true);
      expect(
        PageGroupSchema.safeParse({ ...baseGroup, name: 'x'.repeat(80) }).success
      ).toBe(true);
    });

    it('rejects empty, blank, and >80 char names', () => {
      expect(PageGroupSchema.safeParse({ ...baseGroup, name: '' }).success).toBe(false);
      expect(PageGroupSchema.safeParse({ ...baseGroup, name: '   ' }).success).toBe(false);
      expect(
        PageGroupSchema.safeParse({ ...baseGroup, name: 'x'.repeat(81) }).success
      ).toBe(false);
    });

    it('trims surrounding whitespace', () => {
      const result = PageGroupSchema.safeParse({ ...baseGroup, name: '  Research  ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Research');
      }
    });
  });

  describe('faviconUrl', () => {
    it('accepts http(s) favicon URLs', () => {
      expect(PageGroupItemSchema.safeParse(basePageItem).success).toBe(true);
      expect(
        PageGroupItemSchema.safeParse({ ...basePageItem, faviconUrl: null }).success
      ).toBe(true);
    });

    it('rejects data: URLs', () => {
      const result = PageGroupItemSchema.safeParse({
        ...basePageItem,
        faviconUrl: 'data:image/png;base64,AAAA',
      });
      expect(result.success).toBe(false);
    });

    it('rejects non-http schemes and >2048 chars', () => {
      expect(
        PageGroupItemSchema.safeParse({
          ...basePageItem,
          faviconUrl: 'ftp://example.com/favicon.ico',
        }).success
      ).toBe(false);
      expect(
        PageGroupItemSchema.safeParse({
          ...basePageItem,
          faviconUrl: `https://example.com/${'x'.repeat(2048)}`,
        }).success
      ).toBe(false);
    });
  });

  describe('PageGroupItemSchema kinds', () => {
    it('accepts a domain item', () => {
      const domainItem = {
        id: 'item-2',
        groupId: 'group-1',
        position: 'a1',
        kind: 'domain',
        hostname: 'example.com',
        includeSubdomains: true,
        createdAt: '2026-09-28T00:00:00.000Z',
        updatedAt: '2026-09-28T00:00:00.000Z',
        deletedAt: null,
      };
      expect(PageGroupItemSchema.safeParse(domainItem).success).toBe(true);
    });

    it('rejects unknown kinds', () => {
      expect(
        PageGroupItemSchema.safeParse({ ...basePageItem, kind: 'tab' }).success
      ).toBe(false);
    });
  });
});
