import { describe, expect, it } from 'vitest';

import { planAnnotationBarOpen } from '@/content/ui/annotation-bar-target';

describe('planAnnotationBarOpen', () => {
  it('opens for a new highlight id', () => {
    expect(planAnnotationBarOpen({ overlappingCount: 0, createdId: 'hl-1' })).toBe(
      'hl-1'
    );
  });

  it('does not open when the selection only overlaps existing highlights', () => {
    expect(planAnnotationBarOpen({ overlappingCount: 2, createdId: 'hl-1' })).toBeNull();
  });

  it('does not open when create produced no id', () => {
    expect(planAnnotationBarOpen({ overlappingCount: 0, createdId: null })).toBeNull();
  });
});
