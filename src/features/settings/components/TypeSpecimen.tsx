import React from 'react';

import { resolveTypography, type TypographyTokens } from '@/shared/constants/type-presets';

const PREVIEW_QUOTE = 'Cascading resolves conflicts when multiple CSS rules apply.';

function parsePx(value: string, fallback: number): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

export interface TypeSpecimenProps {
  tokens: TypographyTokens;
}

/**
 * Live hierarchy preview for Settings → Typography.
 * Roles: Display · Domain · Section · Body · Meta (font stack footer).
 */
export function TypeSpecimen({ tokens }: TypeSpecimenProps): React.ReactElement {
  const resolved = resolveTypography({ kind: 'custom', preset: tokens });
  const serifFamily = resolved.serif;
  const sansFamily = resolved.sans;
  const monoFamily = resolved.mono;
  const displaySize = parsePx(tokens.scale['step-3'], 22);
  const domainSize = parsePx(tokens.scale['step-2'], 18);
  const sectionSize = parsePx(tokens.scale['step-0'], 13);
  const bodySize = parsePx(tokens.scale['step-1'], 15);
  const metaSize = parsePx(tokens.scale['step--2'], 11);

  return (
    <div
      data-testid="type-specimen"
      style={{
        padding: tokens.margins.specimenPadding,
        border: '1px solid var(--rule-soft)',
        background: 'var(--paper)',
      }}
    >
      <div
        data-testid="type-specimen-display"
        style={{
          fontFamily: serifFamily,
          fontSize: displaySize,
          lineHeight: tokens.spacing.displayLh,
          letterSpacing: tokens.spacing.displayTrack,
          color: 'var(--ink)',
        }}
      >
        Library
      </div>
      <div
        data-testid="type-specimen-domain"
        style={{
          fontFamily: serifFamily,
          fontSize: domainSize,
          fontStyle: 'italic',
          letterSpacing: '-0.015em',
          marginTop: 6,
          color: 'var(--ink)',
        }}
      >
        anthropic.com
      </div>
      <div
        data-testid="type-specimen-section"
        style={{
          fontFamily: sansFamily,
          fontSize: sectionSize,
          fontWeight: 600,
          letterSpacing: tokens.spacing.sectionTrack,
          textTransform: 'uppercase',
          marginTop: 8,
          color: 'var(--ink)',
        }}
      >
        Academy
      </div>
      <div
        data-testid="type-specimen-body"
        style={{
          fontFamily: serifFamily,
          fontSize: bodySize,
          lineHeight: tokens.spacing.bodyLh,
          marginTop: 8,
          color: 'var(--ink-2)',
        }}
      >
        {PREVIEW_QUOTE}
      </div>
      <div
        data-testid="type-specimen-meta"
        style={{
          fontFamily: monoFamily,
          fontSize: metaSize,
          color: 'var(--ink-3)',
          marginTop: 10,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        {tokens.fonts.serif} · {tokens.fonts.sans} · {tokens.fonts.mono}
      </div>
    </div>
  );
}
