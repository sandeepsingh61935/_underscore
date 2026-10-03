/**
 * Design contract: src/ui-system/theme/global.css (Page-group ColorSwatch section)
 *   - Color always comes from var(--group-<color>); no hex in this file.
 *   - Geometry/borders/interaction live in .group-swatch* classes.
 *   - Picker options are 44px touch targets with native radio semantics.
 */

import type { CSSProperties } from 'react';
import React from 'react';

import { GROUP_COLORS, type GroupColor } from '../../../shared/types/page-group';

export type ColorSwatchSize = 'sm' | 'md';
export type ColorSwatchVariant = 'solid' | 'hollow';

export interface ColorSwatchProps {
  color: GroupColor;
  size?: ColorSwatchSize;
  variant?: ColorSwatchVariant;
  'aria-hidden'?: boolean | 'true' | 'false';
  className?: string;
  style?: CSSProperties;
}

function tokenFor(color: GroupColor): string {
  return `var(--group-${color})`;
}

export function ColorSwatch({
  color,
  size = 'md',
  variant = 'solid',
  'aria-hidden': ariaHidden = true,
  className,
  style,
}: ColorSwatchProps) {
  const token = tokenFor(color);
  return (
    <span
      aria-hidden={ariaHidden}
      className={
        ['group-swatch', `group-swatch-${size}`, `group-swatch-${variant}`, className]
          .filter(Boolean)
          .join(' ')
      }
      style={
        variant === 'solid'
          ? { backgroundColor: token, ...style }
          : { borderColor: token, ...style }
      }
    />
  );
}

export interface ColorSwatchPickerProps {
  value: GroupColor;
  onChange: (color: GroupColor) => void;
  name?: string;
  label?: string;
}

export function ColorSwatchPicker({
  value,
  onChange,
  name = 'group-color',
  label = 'Group color',
}: ColorSwatchPickerProps) {
  return (
    <div className="group-swatch-picker" role="radiogroup" aria-label={label}>
      {GROUP_COLORS.map((color) => (
        <label key={color} className="group-swatch-option" title={color}>
          <input
            className="group-swatch-radio-input"
            type="radio"
            name={name}
            value={color}
            checked={value === color}
            onChange={() => onChange(color)}
            aria-label={color}
          />
          <ColorSwatch color={color} size="md" variant="solid" aria-hidden={true} />
        </label>
      ))}
    </div>
  );
}
