import React from 'react';

import { resolveTypography, type TypographyTokens } from '@/shared/constants/type-presets';

const PREVIEW_QUOTE = 'A good prompt is one you could hand to a thoughtful colleague.';

function parsePx(value: string, fallback: number): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

export interface TypeSpecimenProps {
  tokens: TypographyTokens;
}

export function TypeSpecimen({ tokens }: TypeSpecimenProps): React.ReactElement {
  const resolved = resolveTypography({ kind: 'custom', preset: tokens });
  const serifFamily = resolved.serif;
  const sansFamily = resolved.sans;
  const displaySize = parsePx(tokens.scale['step-3'], 22);
  const domainSize = parsePx(tokens.scale['step-2'], 18);
  const sectionSize = parsePx(tokens.scale['step-0'], 13);
  const bodySize = parsePx(tokens.scale['step-1'], 15);

  return (
    <div
      style={{
        padding: tokens.margins.specimenPadding,
        border: '1px solid var(--rule-soft)',
        background: 'var(--paper)',
      }}
    >
      <div
        style={{
          fontFamily: serifFamily,
          fontSize: displaySize,
          lineHeight: tokens.spacing.displayLh,
          letterSpacing: tokens.spacing.displayTrack,
        }}
      >
        Library
      </div>
      <div
        style={{
          fontFamily: serifFamily,
          fontSize: domainSize,
          fontStyle: 'italic',
          letterSpacing: '-0.015em',
          marginTop: 6,
        }}
      >
        anthropic.com
      </div>
      <div
        style={{
          fontFamily: sansFamily,
          fontSize: sectionSize,
          fontWeight: 600,
          letterSpacing: tokens.spacing.sectionTrack,
          textTransform: 'uppercase',
          marginTop: 8,
        }}
      >
        Academy
      </div>
      <div
        style={{
          fontFamily: serifFamily,
          fontSize: bodySize,
          lineHeight: tokens.spacing.bodyLh,
          marginTop: 8,
        }}
      >
        {PREVIEW_QUOTE}
      </div>
      <div
        className="u-mono"
        style={{
          fontSize: 'var(--step--2)',
          color: 'var(--ink-3)',
          marginTop: 10,
          letterSpacing: '0.04em',
        }}
      >
        {tokens.fonts.serif} · {tokens.fonts.sans} · {tokens.fonts.mono}
      </div>
    </div>
  );
}
