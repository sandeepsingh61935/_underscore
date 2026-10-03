/**
 * @file page-group-schema.ts
 * @description Zod schemas for Page Groups rows + caps (spec PRD Concepts + Platform §1, ADR-032 §2).
 */

import { z } from 'zod';

import { GROUP_CAPS, GROUP_COLORS } from '@/shared/types/page-group';

// ============================================
// PRIMITIVE SCHEMAS
// ============================================

/** Chrome tab-group color palette. */
export const GroupColorSchema = z.enum(GROUP_COLORS);

export type GroupColorParsed = z.infer<typeof GroupColorSchema>;

/** Group display name: 1..80 chars after trimming. */
export const GroupNameSchema = z.string().trim().min(1).max(80);

/**
 * Favicon URL: http(s) only (no data:), max 2048 chars.
 * Nullable at row level; null means "no favicon".
 */
export const FaviconUrlSchema = z
  .string()
  .max(2048, 'faviconUrl too long (max 2048 chars)')
  .refine((value) => /^https?:\/\//i.test(value), {
    message: 'faviconUrl must be an http(s) URL',
  });

/** Browser a group binding belongs to. */
export const BoundBrowserSchema = z.enum(['chrome', 'firefox', 'edge']);

/** Fractional-index position string. */
export const GroupPositionSchema = z.string().min(1);

/** ISO-8601 timestamp string. */
export const IsoTimestampSchema = z.string().min(1);

// ============================================
// ROW SCHEMAS
// ============================================

export const PageGroupSchema = z.object({
  id: z.string().min(1),
  name: GroupNameSchema,
  color: GroupColorSchema,
  position: GroupPositionSchema,
  boundDeviceId: z.string().min(1).nullable(),
  boundDeviceLabel: z.string().max(120).nullable(),
  boundBrowser: BoundBrowserSchema.nullable(),
  boundAt: IsoTimestampSchema.nullable(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
  deletedAt: IsoTimestampSchema.nullable(),
  ownerId: z.string().nullable().optional(),
});

export type PageGroupParsed = z.infer<typeof PageGroupSchema>;

const PageGroupItemBaseSchema = z.object({
  id: z.string().min(1),
  groupId: z.string().min(1),
  position: GroupPositionSchema,
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
  deletedAt: IsoTimestampSchema.nullable(),
});

const PageItemSchema = z.object({
  kind: z.literal('page'),
  urlNormalized: z.string().min(1).max(2048),
  title: z.string().max(500).nullable(),
  faviconUrl: FaviconUrlSchema.nullable(),
});

const DomainItemSchema = z.object({
  kind: z.literal('domain'),
  hostname: z.string().min(1).max(255),
  includeSubdomains: z.boolean(),
});

export const PageGroupItemSchema = z.discriminatedUnion('kind', [
  PageItemSchema.merge(PageGroupItemBaseSchema),
  DomainItemSchema.merge(PageGroupItemBaseSchema),
]);

export type PageGroupItemParsed = z.infer<typeof PageGroupItemSchema>;

// ============================================
// CAPS SCHEMA
// ============================================

export const GroupCapsSchema = z.object({
  groupsPerUser: z.literal(GROUP_CAPS.groupsPerUser),
  itemsPerGroup: z.literal(GROUP_CAPS.itemsPerGroup),
});

export type GroupCapsParsed = z.infer<typeof GroupCapsSchema>;
