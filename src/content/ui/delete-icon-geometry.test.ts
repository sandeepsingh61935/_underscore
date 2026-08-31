import { describe, expect, it } from 'vitest';

import { DELETE_ICON_SAFE_PAD_PX, isPointNearDeleteIcon } from './delete-icon-geometry';

describe('isPointNearDeleteIcon', () => {
  const icon = { left: 100, top: 50, right: 132, bottom: 82 };

  it('hits inside icon', () => {
    expect(isPointNearDeleteIcon(110, 60, [icon])).toBe(true);
  });

  it('hits within safe pad outside icon', () => {
    expect(
      isPointNearDeleteIcon(icon.right + DELETE_ICON_SAFE_PAD_PX - 1, 66, [icon])
    ).toBe(true);
    expect(
      isPointNearDeleteIcon(icon.left - DELETE_ICON_SAFE_PAD_PX + 1, 66, [icon])
    ).toBe(true);
  });

  it('misses beyond pad', () => {
    expect(
      isPointNearDeleteIcon(icon.right + DELETE_ICON_SAFE_PAD_PX + 5, 66, [icon])
    ).toBe(false);
  });
});
