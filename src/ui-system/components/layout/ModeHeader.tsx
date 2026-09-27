import React from 'react';

export interface ModeHeaderProps {
  /** @deprecated unused; ModeHeader is back-only chrome */
  modeId?: string;
  /** @deprecated unused; ModeHeader is back-only chrome */
  compact?: boolean;
  /** @deprecated Switch removed from ModeHeader */
  onSwitch?: () => void;
  backLabel?: string;
  onBack?: () => void;
}

/**
 * Back-only chrome row for nested popup views.
 * Returns null when there is no onBack (root tabs must not waste header space).
 * Styles: `.mode-header` / `.mode-header-back` in src/ui-system/theme/global.css.
 */
export function ModeHeader({
  backLabel,
  onBack,
}: ModeHeaderProps): React.ReactElement | null {
  if (!onBack) {
    return null;
  }

  return (
    <div className="mode-header">
      <button
        type="button"
        onClick={onBack}
        className="mode-header-back"
      >
        ← {backLabel || 'Back'}
      </button>
    </div>
  );
}
