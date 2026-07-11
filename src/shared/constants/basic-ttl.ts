/**
 * @file basic-ttl.ts
 * @description Configurable TTL setting for Basic mode (Layer 3 of the mode
 * architecture — separate from the mode identity itself).
 *
 * Supports presets, a custom value (minutes / hours / days), or forever.
 */

export const BASIC_TTL_STORAGE_KEY = 'underscore-basic-ttl';

export type BasicTtlUnit = 'minutes' | 'hours' | 'days';

export type BasicTtlPresetId = '24h' | '2d' | '7d' | '30d';

/** @deprecated Legacy string preset — parsed into BasicTtlConfig on read. */
export type BasicTtlOption = BasicTtlPresetId | 'forever';

export type BasicTtlConfig =
  | { kind: 'forever' }
  | { kind: 'preset'; preset: BasicTtlPresetId }
  | { kind: 'custom'; amount: number; unit: BasicTtlUnit };

export const BASIC_TTL_DEFAULT: BasicTtlConfig = { kind: 'preset', preset: '24h' };

export const BASIC_TTL_PRESETS: ReadonlyArray<{
  preset: BasicTtlPresetId;
  label: string;
  ms: number;
}> = [
  { preset: '24h', label: '24 hours', ms: 24 * 60 * 60 * 1000 },
  { preset: '2d', label: '2 days', ms: 2 * 24 * 60 * 60 * 1000 },
  { preset: '7d', label: '7 days', ms: 7 * 24 * 60 * 60 * 1000 },
  { preset: '30d', label: '30 days', ms: 30 * 24 * 60 * 60 * 1000 },
];

export const BASIC_TTL_UNITS: ReadonlyArray<{ id: BasicTtlUnit; label: string }> = [
  { id: 'minutes', label: 'Minutes' },
  { id: 'hours', label: 'Hours' },
  { id: 'days', label: 'Days' },
];

const MIN_TTL_MS = 60_000;
const MAX_TTL_MS = 3650 * 24 * 60 * 60 * 1000; // 10 years

const LEGACY_STRING_TO_CONFIG: Record<BasicTtlOption, BasicTtlConfig> = {
  '24h': { kind: 'preset', preset: '24h' },
  '2d': { kind: 'preset', preset: '2d' },
  '7d': { kind: 'preset', preset: '7d' },
  '30d': { kind: 'preset', preset: '30d' },
  forever: { kind: 'forever' },
};

function unitToMs(amount: number, unit: BasicTtlUnit): number {
  switch (unit) {
    case 'minutes':
      return amount * 60_000;
    case 'hours':
      return amount * 60 * 60 * 1000;
    case 'days':
      return amount * 24 * 60 * 60 * 1000;
  }
}

function pluralUnit(unit: BasicTtlUnit, amount: number): string {
  const labels: Record<BasicTtlUnit, [string, string]> = {
    minutes: ['minute', 'minutes'],
    hours: ['hour', 'hours'],
    days: ['day', 'days'],
  };
  const [singular, plural] = labels[unit];
  return amount === 1 ? singular : plural;
}

export function isBasicTtlPresetId(value: unknown): value is BasicTtlPresetId {
  return typeof value === 'string' && BASIC_TTL_PRESETS.some((p) => p.preset === value);
}

/** @deprecated Use isBasicTtlConfig */
export function isBasicTtlOption(value: unknown): value is BasicTtlOption {
  return typeof value === 'string' && value in LEGACY_STRING_TO_CONFIG;
}

export function isBasicTtlConfig(value: unknown): value is BasicTtlConfig {
  if (!value || typeof value !== 'object') return false;
  const v = value as BasicTtlConfig;
  if (v.kind === 'forever') return true;
  if (v.kind === 'preset' && isBasicTtlPresetId(v.preset)) return true;
  if (
    v.kind === 'custom' &&
    typeof v.amount === 'number' &&
    Number.isInteger(v.amount) &&
    v.amount > 0 &&
    BASIC_TTL_UNITS.some((u) => u.id === v.unit)
  ) {
    const ms = unitToMs(v.amount, v.unit);
    return ms >= MIN_TTL_MS && ms <= MAX_TTL_MS;
  }
  return false;
}

export function parseBasicTtlStorage(raw: unknown): BasicTtlConfig {
  if (isBasicTtlConfig(raw)) return raw;
  if (isBasicTtlOption(raw)) return LEGACY_STRING_TO_CONFIG[raw];
  return BASIC_TTL_DEFAULT;
}

export function basicTtlConfigToMs(config: BasicTtlConfig): number | null {
  if (config.kind === 'forever') return null;
  if (config.kind === 'preset') {
    const preset = BASIC_TTL_PRESETS.find((p) => p.preset === config.preset);
    return preset?.ms ?? 24 * 60 * 60 * 1000;
  }
  return unitToMs(config.amount, config.unit);
}

/** @deprecated Use basicTtlConfigToMs */
export function basicTtlOptionToMs(option: BasicTtlOption): number | null {
  return basicTtlConfigToMs(parseBasicTtlStorage(option));
}

export function formatBasicTtlConfig(config: BasicTtlConfig): string {
  if (config.kind === 'forever') return 'Forever';
  if (config.kind === 'preset') {
    return BASIC_TTL_PRESETS.find((p) => p.preset === config.preset)?.label ?? '24 hours';
  }
  return `${config.amount} ${pluralUnit(config.unit, config.amount)}`;
}

export function validateCustomTtl(
  amount: number,
  unit: BasicTtlUnit
): { valid: true } | { valid: false; error: string } {
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < 1) {
    return { valid: false, error: 'Enter a whole number of at least 1' };
  }
  const ms = unitToMs(amount, unit);
  if (ms < MIN_TTL_MS) {
    return { valid: false, error: 'Minimum is 1 minute' };
  }
  if (ms > MAX_TTL_MS) {
    return { valid: false, error: 'Maximum is 10 years' };
  }
  return { valid: true };
}

export function configsEqual(a: BasicTtlConfig, b: BasicTtlConfig): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'forever' && b.kind === 'forever') return true;
  if (a.kind === 'preset' && b.kind === 'preset') return a.preset === b.preset;
  if (a.kind === 'custom' && b.kind === 'custom') {
    return a.amount === b.amount && a.unit === b.unit;
  }
  return false;
}

export async function getBasicTtlConfig(): Promise<BasicTtlConfig> {
  try {
    const data = await chrome.storage.local.get(BASIC_TTL_STORAGE_KEY);
    return parseBasicTtlStorage(data[BASIC_TTL_STORAGE_KEY]);
  } catch {
    return BASIC_TTL_DEFAULT;
  }
}

/** @deprecated Use getBasicTtlConfig */
export async function getBasicTtlOption(): Promise<BasicTtlOption> {
  const config = await getBasicTtlConfig();
  if (config.kind === 'forever') return 'forever';
  if (config.kind === 'preset') return config.preset;
  return '24h';
}

export async function getBasicTtlMs(): Promise<number | null> {
  const config = await getBasicTtlConfig();
  return basicTtlConfigToMs(config);
}

export async function setBasicTtlConfig(config: BasicTtlConfig): Promise<void> {
  if (!isBasicTtlConfig(config)) {
    throw new Error('Invalid Basic TTL configuration');
  }
  await chrome.storage.local.set({ [BASIC_TTL_STORAGE_KEY]: config });
}

/** @deprecated Use setBasicTtlConfig */
export async function setBasicTtlOption(option: BasicTtlOption): Promise<void> {
  await setBasicTtlConfig(parseBasicTtlStorage(option));
}

/** Preset + forever options for quick-pick UI (legacy list shape). */
export const BASIC_TTL_OPTIONS: ReadonlyArray<{
  id: BasicTtlOption;
  label: string;
  ms: number | null;
}> = [
  ...BASIC_TTL_PRESETS.map((p) => ({ id: p.preset, label: p.label, ms: p.ms })),
  { id: 'forever', label: 'Forever', ms: null },
];
