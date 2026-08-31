import { describe, expect, it } from 'vitest';

import {
  buildTypographyWheelItems,
  formatTypographyValue,
  indexToTypographyValue,
  parseTypographyNumeric,
  stepTypographyValue,
  typographyValueToIndex,
  TYPOGRAPHY_VALUE_SPECS,
} from '@/shared/utils/typography-value-step';

describe('typography-value-step', () => {
  it('steps px scale values by 1 within bounds', () => {
    expect(stepTypographyValue('22px', 'px-scale', 1)).toBe('23px');
    expect(stepTypographyValue('22px', 'px-scale', -1)).toBe('21px');
    expect(stepTypographyValue('8px', 'px-scale', -1)).toBe('8px');
    expect(stepTypographyValue('72px', 'px-scale', 1)).toBe('72px');
  });

  it('accepts pt as px-scale input', () => {
    expect(stepTypographyValue('18pt', 'px-scale', 1)).toBe('19px');
  });

  it('steps line-height values by 0.01', () => {
    expect(stepTypographyValue('1.45', 'line-height', 1)).toBe('1.46');
    expect(stepTypographyValue('1.45', 'line-height', -1)).toBe('1.44');
    expect(stepTypographyValue('0.8', 'line-height', -1)).toBe('0.8');
    expect(stepTypographyValue('3', 'line-height', 1)).toBe('3');
  });

  it('steps em tracking values by 0.01em', () => {
    expect(stepTypographyValue('0.16em', 'em-tracking', 1)).toBe('0.17em');
    expect(stepTypographyValue('-0.025em', 'em-tracking', 1)).toBe('-0.015em');
    expect(stepTypographyValue('-0.5em', 'em-tracking', -1)).toBe('-0.5em');
  });

  it('steps margin px values with row and gap limits', () => {
    expect(stepTypographyValue('44px', 'px-row', 1)).toBe('45px');
    expect(stepTypographyValue('32px', 'px-row', -1)).toBe('32px');
    expect(stepTypographyValue('12px', 'px-margin', 1)).toBe('13px');
    expect(stepTypographyValue('40px', 'px-margin', 1)).toBe('40px');
  });

  it('builds wheel items for each value kind', () => {
    expect(buildTypographyWheelItems('px-scale')).toHaveLength(65);
    expect(buildTypographyWheelItems('px-scale')[0]?.label).toBe('8px');
    expect(buildTypographyWheelItems('line-height')[0]?.label).toBe('0.8');
    expect(typographyValueToIndex('22px', 'px-scale')).toBe(14);
    expect(indexToTypographyValue(14, 'px-scale')).toBe('22px');
  });

  it('parses and formats using spec decimals', () => {
    for (const kind of Object.keys(TYPOGRAPHY_VALUE_SPECS) as Array<
      keyof typeof TYPOGRAPHY_VALUE_SPECS
    >) {
      const spec = TYPOGRAPHY_VALUE_SPECS[kind];
      const sample = spec.unit === 'px' ? '16px' : spec.unit === 'em' ? '0.12em' : '1.2';
      const parsed = parseTypographyNumeric(sample, kind);
      expect(parsed).not.toBeNull();
      expect(formatTypographyValue(parsed!, kind)).toContain(spec.unit);
    }
  });
});
