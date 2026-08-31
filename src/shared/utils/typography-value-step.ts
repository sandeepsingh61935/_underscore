export type TypographyValueKind =
  'px-scale' | 'px-row' | 'px-margin' | 'line-height' | 'em-tracking';

export interface TypographyValueSpec {
  min: number;
  max: number;
  step: number;
  unit: '' | 'px' | 'em';
  decimals: number;
}

export const TYPOGRAPHY_VALUE_SPECS: Record<TypographyValueKind, TypographyValueSpec> = {
  'px-scale': { min: 8, max: 72, step: 1, unit: 'px', decimals: 0 },
  'px-row': { min: 32, max: 64, step: 1, unit: 'px', decimals: 0 },
  'px-margin': { min: 4, max: 40, step: 1, unit: 'px', decimals: 0 },
  'line-height': { min: 0.8, max: 3.0, step: 0.01, unit: '', decimals: 2 },
  'em-tracking': { min: -0.5, max: 0.5, step: 0.01, unit: 'em', decimals: 3 },
};

function parseUnitValue(value: string, unit: '' | 'px' | 'em'): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (unit === '') {
    const n = Number.parseFloat(trimmed);
    return Number.isFinite(n) ? n : null;
  }

  const match = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*(px|em|pt)$/i);
  if (!match) return null;

  const parsedUnit = match[2]!.toLowerCase();
  if (unit === 'px' && parsedUnit !== 'px' && parsedUnit !== 'pt') return null;
  if (unit === 'em' && parsedUnit !== 'em') return null;

  const n = Number.parseFloat(match[1]!);
  return Number.isFinite(n) ? n : null;
}

export function parseTypographyNumeric(
  value: string,
  kind: TypographyValueKind
): number | null {
  return parseUnitValue(value, TYPOGRAPHY_VALUE_SPECS[kind].unit);
}

export function formatTypographyValue(value: number, kind: TypographyValueKind): string {
  const spec = TYPOGRAPHY_VALUE_SPECS[kind];
  const clamped = Math.min(spec.max, Math.max(spec.min, value));
  const rounded = Number(clamped.toFixed(spec.decimals));
  if (spec.unit === '') return `${rounded}`;
  return `${rounded}${spec.unit}`;
}

export function stepTypographyValue(
  value: string,
  kind: TypographyValueKind,
  direction: 1 | -1
): string {
  const spec = TYPOGRAPHY_VALUE_SPECS[kind];
  const current = parseTypographyNumeric(value, kind);
  const base = current ?? spec.min;
  const next = base + direction * spec.step;
  return formatTypographyValue(next, kind);
}

export function typographyWheelCount(kind: TypographyValueKind): number {
  const spec = TYPOGRAPHY_VALUE_SPECS[kind];
  return Math.round((spec.max - spec.min) / spec.step) + 1;
}

export function typographyValueToIndex(value: string, kind: TypographyValueKind): number {
  const spec = TYPOGRAPHY_VALUE_SPECS[kind];
  const current = parseTypographyNumeric(value, kind) ?? spec.min;
  const index = Math.round((current - spec.min) / spec.step);
  const maxIndex = typographyWheelCount(kind) - 1;
  return Math.min(maxIndex, Math.max(0, index));
}

export function indexToTypographyValue(index: number, kind: TypographyValueKind): string {
  const spec = TYPOGRAPHY_VALUE_SPECS[kind];
  const maxIndex = typographyWheelCount(kind) - 1;
  const clamped = Math.min(maxIndex, Math.max(0, index));
  return formatTypographyValue(spec.min + clamped * spec.step, kind);
}

export function buildTypographyWheelItems(
  kind: TypographyValueKind
): Array<{ id: string; label: string }> {
  const count = typographyWheelCount(kind);
  return Array.from({ length: count }, (_, index) => {
    const label = indexToTypographyValue(index, kind);
    return { id: `${kind}-${index}`, label };
  });
}
