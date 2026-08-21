/**
 * Shared highlight card contract (popup + web).
 * Hosts inject persistence; presentation should converge on one component over time.
 */
import type { HighlightPresentation } from '@/shared/utils/highlight-presentation';

export type SharedHighlightCardFields = {
  id: string;
  text: string;
  domain: string;
  path?: string;
  notes?: string;
  tags?: string[];
  sourceKind?: 'code';
  language?: string;
  presentation?: HighlightPresentation | null;
  matchBadge?: string | null;
};

export type SharedHighlightCardCallbacks = {
  onCopy?: () => void;
  onDelete?: () => void | Promise<void>;
  onSaveQuote?: (text: string) => Promise<boolean>;
  onSaveNotes?: (notes: string) => Promise<boolean>;
  onSaveTags?: (tags: string[]) => Promise<boolean>;
  onTagClick?: (tag: string) => void;
  onOpenLocation?: () => void;
};

export type SharedHighlightCardMode = {
  /** Guest / capability-locked metadata. */
  readOnly?: boolean;
  /** Show notes/tags editors when allowed. */
  allowMarginalia?: boolean;
  /** Compact Home stream vs full library tile. */
  density?: 'compact' | 'comfortable';
  expanded?: boolean;
  onToggleExpand?: () => void;
};
