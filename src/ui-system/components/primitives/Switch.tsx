/**
 * Design contract: src/ui-system/theme/global.css (Switch section)
 * Track 44x24, knob 18px, var(--control-h) hit area. Off: --paper-2 +
 * --rule-soft border. On: --accent fill. Focus: --accent ring.
 */
import React, { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '../../utils/cn';

export interface SwitchProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'value'> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      className,
      checked,
      defaultChecked,
      onCheckedChange,
      onClick,
      disabled,
      style,
      ...props
    },
    ref
  ) => {
    const [uncontrolled, setUncontrolled] = React.useState(defaultChecked ?? false);
    const isControlled = checked !== undefined;
    const isOn = isControlled ? checked : uncontrolled;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>): void => {
      if (disabled) return;
      onClick?.(e);
      if (!isControlled) setUncontrolled(!isOn);
      onCheckedChange?.(!isOn);
    };

    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={isOn}
        disabled={disabled}
        onClick={handleClick}
        className={cn('switch', isOn && 'is-on', className)}
        style={style}
        {...props}
      >
        <span className="switch-track" aria-hidden="true">
          <span className="switch-knob" />
        </span>
      </button>
    );
  }
);

Switch.displayName = 'Switch';

export { Switch };
