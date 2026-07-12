/**
 * Typography preset system — uniform across modes.
 * Built-in presets load Google Fonts; custom presets accept Google Font family names
 * or imported local fonts (via font-import-store).
 */

export const TYPE_PRESET_STORAGE_KEY = 'underscore-type-preset';
export const TYPE_PRESET_LINK_ID = 'type-preset-link';
export const TYPE_PRESET_FACES_ID = 'type-preset-faces';

export type ScaleStepId = 'step-3' | 'step-2' | 'step-0' | 'step-1' | 'step--2';
export type SpacingKey = 'displayLh' | 'bodyLh' | 'sectionTrack' | 'displayTrack';
export type MarginKey = 'rowHeight' | 'sectionGap' | 'insetPadding' | 'specimenPadding';
export type FontRole = 'serif' | 'sans' | 'mono';

export type BuiltinTypePresetId =
  | 'editorial'
  | 'classic'
  | 'modern'
  | 'humanist'
  | 'inter-system'
  | 'dm-super'
  | 'ibm-plex'
  | 'merriweather'
  | 'montserrat-geo'
  | 'poppins-friendly'
  | 'roboto-android'
  | 'space-tech'
  | 'outfit-clean'
  | 'manrope-utility'
  | 'bitter-editorial'
  | 'libre-baskerville'
  | 'crimson-pro'
  | 'sora-digital'
  | 'urbanist-minimal'
  | 'epilogue-quirky';

export interface TypographyFonts {
  serif: string;
  sans: string;
  mono: string;
}

export interface TypographyTokens {
  fonts: TypographyFonts;
  scale: Record<ScaleStepId, string>;
  spacing: Record<SpacingKey, string>;
  margins: Record<MarginKey, string>;
}

export interface ImportedFontRefs {
  serif?: string;
  sans?: string;
  mono?: string;
}

export interface ImportedFontFace {
  role: FontRole;
  familyName: string;
  blobUrl: string;
  format: 'woff2' | 'truetype';
}

export interface ResolvedTypeFonts {
  serif: string;
  sans: string;
  mono: string;
  google: string;
}

export interface ResolvedTypography extends ResolvedTypeFonts {
  scale: Record<ScaleStepId, string>;
  spacing: Record<SpacingKey, string>;
  margins: Record<MarginKey, string>;
}

export interface BuiltinTypePreset extends ResolvedTypography {
  name: string;
  fonts: TypographyFonts;
}

/** @deprecated Use TypographyFonts */
export interface CustomTypePreset extends TypographyFonts {}

export type TypePresetSelection =
  | { kind: 'builtin'; id: BuiltinTypePresetId }
  | { kind: 'custom'; preset: TypographyTokens; importedFonts?: ImportedFontRefs };

export const TYPE_PRESET_DEFAULT: TypePresetSelection = { kind: 'builtin', id: 'editorial' };

export const DEFAULT_SCALE: Record<ScaleStepId, string> = {
  'step-3': '22px',
  'step-2': '18px',
  'step-0': '13px',
  'step-1': '15px',
  'step--2': '10px',
};

export const DEFAULT_SPACING: Record<SpacingKey, string> = {
  displayLh: '1.0',
  bodyLh: '1.45',
  sectionTrack: '0.16em',
  displayTrack: '-0.025em',
};

export const DEFAULT_MARGINS: Record<MarginKey, string> = {
  rowHeight: '44px',
  sectionGap: '12px',
  insetPadding: '16px',
  specimenPadding: '14px',
};

export const TYPE_FONT_CATALOG = {
  serif: [
    'Source Serif 4',
    'Playfair Display',
    'Lora',
    'Merriweather',
    'Libre Baskerville',
    'Fraunces',
    'IBM Plex Serif',
    'DM Serif Display',
    'Bitter',
    'Crimson Pro',
    'Baskervville',
    'Gloock',
    'Alegreya',
    'PT Serif',
    'Cormorant Garamond',
    'Spectral',
    'Newsreader',
    'Cardo',
    'Vollkorn',
    'EB Garamond',
  ] as const,
  sans: [
    'Inter',
    'Roboto',
    'Open Sans',
    'Lato',
    'Montserrat',
    'Poppins',
    'Work Sans',
    'DM Sans',
    'Manrope',
    'Source Sans 3',
    'Nunito',
    'Raleway',
    'Space Grotesk',
    'Outfit',
    'Urbanist',
    'Sora',
    'Mulish',
    'Archivo',
    'Figtree',
    'Plus Jakarta Sans',
  ] as const,
  mono: [
    'JetBrains Mono',
    'IBM Plex Mono',
    'Roboto Mono',
    'Fira Code',
    'Space Mono',
    'Geist Mono',
    'DM Mono',
    'Source Code Pro',
    'Ubuntu Mono',
    'Inconsolata',
    'Red Hat Mono',
    'Anonymous Pro',
    'Courier Prime',
    'PT Mono',
    'Oxygen Mono',
    'Azeret Mono',
    'Kode Mono',
    'Martian Mono',
    'Share Tech Mono',
    'Overpass Mono',
  ] as const,
};

const SERIF_FALLBACK = 'Georgia, serif';
const SANS_FALLBACK = '-apple-system, Arial, sans-serif';
const MONO_FALLBACK = 'ui-monospace, monospace';

const GOOGLE_FONT_NAME_RE = /^[\w\s.'-]+$/;

const SCALE_STEPS: ScaleStepId[] = ['step-3', 'step-2', 'step-0', 'step-1', 'step--2'];
const SPACING_KEYS: SpacingKey[] = ['displayLh', 'bodyLh', 'sectionTrack', 'displayTrack'];
const MARGIN_KEYS: MarginKey[] = ['rowHeight', 'sectionGap', 'insetPadding', 'specimenPadding'];

function googleWeightBundle(...names: string[]): string {
  return names
    .map((name) => `${toGoogleFamilyParam(name)}:wght@400;500;600`)
    .join('&family=');
}

function makeTokens(
  serif: string,
  sans: string,
  mono: string,
  tuning?: {
    scale?: Partial<Record<ScaleStepId, number>>;
    spacing?: Partial<Record<SpacingKey, string>>;
    margins?: Partial<Record<MarginKey, string>>;
  }
): TypographyTokens {
  const scale = { ...DEFAULT_SCALE };
  if (tuning?.scale) {
    for (const [key, px] of Object.entries(tuning.scale)) {
      scale[key as ScaleStepId] = `${px}px`;
    }
  }
  return {
    fonts: { serif, sans, mono },
    scale,
    spacing: { ...DEFAULT_SPACING, ...(tuning?.spacing ?? {}) },
    margins: { ...DEFAULT_MARGINS, ...(tuning?.margins ?? {}) },
  };
}

function resolveFontStacks(fonts: TypographyFonts): Pick<ResolvedTypeFonts, 'serif' | 'sans' | 'mono'> {
  return {
    serif: toFontFamilyCss(fonts.serif, SERIF_FALLBACK),
    sans: toFontFamilyCss(fonts.sans, SANS_FALLBACK),
    mono: toFontFamilyCss(fonts.mono, MONO_FALLBACK),
  };
}

function buildBuiltinPreset(
  name: string,
  google: string,
  tokens: TypographyTokens
): BuiltinTypePreset {
  const stacks = resolveFontStacks(tokens.fonts);
  return {
    name,
    google,
    fonts: tokens.fonts,
    scale: tokens.scale,
    spacing: tokens.spacing,
    margins: tokens.margins,
    ...stacks,
  };
}

export const BUILTIN_TYPE_PRESETS: Record<BuiltinTypePresetId, BuiltinTypePreset> = {
  editorial: buildBuiltinPreset(
    'Editorial',
    'Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;0,8..60,600;1,8..60,400;1,8..60,500&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500',
    makeTokens('Source Serif 4', 'Inter', 'JetBrains Mono')
  ),
  classic: buildBuiltinPreset(
    'Classic',
    'Playfair+Display:ital,wght@0,500;0,600;1,500&family=Source+Sans+3:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500',
    makeTokens('Playfair Display', 'Source Sans 3', 'IBM Plex Mono')
  ),
  modern: buildBuiltinPreset(
    'Modern',
    'Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=Manrope:wght@400;500;600&family=Geist+Mono:wght@400;500',
    makeTokens('Fraunces', 'Manrope', 'Geist Mono')
  ),
  humanist: buildBuiltinPreset(
    'Humanist',
    'Lora:ital,wght@0,400;0,500;0,600;1,400&family=Work+Sans:wght@400;500;600&family=Roboto+Mono:wght@400;500',
    makeTokens('Lora', 'Work Sans', 'Roboto Mono')
  ),
  'inter-system': buildBuiltinPreset(
    'Inter System',
    googleWeightBundle('Inter', 'Inter', 'JetBrains Mono'),
    makeTokens('Inter', 'Inter', 'JetBrains Mono')
  ),
  'dm-super': buildBuiltinPreset(
    'DM Superfamily',
    googleWeightBundle('DM Serif Display', 'DM Sans', 'DM Mono'),
    makeTokens('DM Serif Display', 'DM Sans', 'DM Mono')
  ),
  'ibm-plex': buildBuiltinPreset(
    'IBM Plex',
    googleWeightBundle('IBM Plex Serif', 'IBM Plex Sans', 'IBM Plex Mono'),
    makeTokens('IBM Plex Serif', 'IBM Plex Sans', 'IBM Plex Mono')
  ),
  merriweather: buildBuiltinPreset(
    'Merriweather',
    googleWeightBundle('Merriweather', 'Open Sans', 'Roboto Mono'),
    makeTokens('Merriweather', 'Open Sans', 'Roboto Mono')
  ),
  'montserrat-geo': buildBuiltinPreset(
    'Montserrat',
    googleWeightBundle('Montserrat', 'Source Sans 3', 'Space Mono'),
    makeTokens('Montserrat', 'Source Sans 3', 'Space Mono', {
      scale: { 'step-3': 24, 'step-2': 19 },
    })
  ),
  'poppins-friendly': buildBuiltinPreset(
    'Poppins',
    googleWeightBundle('Poppins', 'Montserrat', 'JetBrains Mono'),
    makeTokens('Poppins', 'Montserrat', 'JetBrains Mono', {
      spacing: { bodyLh: '1.5' },
    })
  ),
  'roboto-android': buildBuiltinPreset(
    'Roboto',
    googleWeightBundle('Roboto', 'Roboto', 'Roboto Mono'),
    makeTokens('Roboto', 'Roboto', 'Roboto Mono')
  ),
  'space-tech': buildBuiltinPreset(
    'Space Tech',
    googleWeightBundle('Space Grotesk', 'Inter', 'Space Mono'),
    makeTokens('Space Grotesk', 'Inter', 'Space Mono', {
      scale: { 'step-3': 20, 'step-1': 14 },
      margins: { sectionGap: '10px' },
    })
  ),
  'outfit-clean': buildBuiltinPreset(
    'Outfit',
    googleWeightBundle('Outfit', 'Work Sans', 'IBM Plex Mono'),
    makeTokens('Outfit', 'Work Sans', 'IBM Plex Mono')
  ),
  'manrope-utility': buildBuiltinPreset(
    'Manrope',
    googleWeightBundle('Manrope', 'DM Sans', 'Geist Mono'),
    makeTokens('Manrope', 'DM Sans', 'Geist Mono', {
      scale: { 'step-0': 12 },
    })
  ),
  'bitter-editorial': buildBuiltinPreset(
    'Bitter',
    googleWeightBundle('Bitter', 'Source Sans 3', 'IBM Plex Mono'),
    makeTokens('Bitter', 'Source Sans 3', 'IBM Plex Mono', {
      spacing: { bodyLh: '1.55' },
    })
  ),
  'libre-baskerville': buildBuiltinPreset(
    'Libre Baskerville',
    googleWeightBundle('Libre Baskerville', 'Lato', 'Roboto Mono'),
    makeTokens('Libre Baskerville', 'Lato', 'Roboto Mono')
  ),
  'crimson-pro': buildBuiltinPreset(
    'Crimson Pro',
    googleWeightBundle('Crimson Pro', 'Mulish', 'Fira Code'),
    makeTokens('Crimson Pro', 'Mulish', 'Fira Code', {
      spacing: { bodyLh: '1.6' },
    })
  ),
  'sora-digital': buildBuiltinPreset(
    'Sora',
    googleWeightBundle('Sora', 'Inter', 'Space Mono'),
    makeTokens('Sora', 'Inter', 'Space Mono')
  ),
  'urbanist-minimal': buildBuiltinPreset(
    'Urbanist',
    googleWeightBundle('Urbanist', 'Open Sans', 'JetBrains Mono'),
    makeTokens('Urbanist', 'Open Sans', 'JetBrains Mono', {
      margins: { insetPadding: '18px' },
    })
  ),
  'epilogue-quirky': buildBuiltinPreset(
    'Epilogue',
    googleWeightBundle('Epilogue', 'Baskervville', 'IBM Plex Mono'),
    makeTokens('Epilogue', 'Baskervville', 'IBM Plex Mono', {
      scale: { 'step-3': 23 },
      spacing: { displayTrack: '-0.03em' },
    })
  ),
};

const BUILTIN_IDS = Object.keys(BUILTIN_TYPE_PRESETS) as BuiltinTypePresetId[];

export const BUILTIN_TYPE_PRESET_LIST: BuiltinTypePresetId[] = BUILTIN_IDS;

let activeBlobUrls: string[] = [];

export function isBuiltinTypePresetId(value: unknown): value is BuiltinTypePresetId {
  return typeof value === 'string' && BUILTIN_IDS.includes(value as BuiltinTypePresetId);
}

function isTypographyFonts(value: unknown): value is TypographyFonts {
  if (!value || typeof value !== 'object') return false;
  const v = value as TypographyFonts;
  return (
    typeof v.serif === 'string' &&
    typeof v.sans === 'string' &&
    typeof v.mono === 'string'
  );
}

function isTypographyTokens(value: unknown): value is TypographyTokens {
  if (!value || typeof value !== 'object') return false;
  const v = value as TypographyTokens;
  if (!isTypographyFonts(v.fonts)) return false;
  if (!v.scale || !v.spacing || !v.margins) return false;
  return true;
}

/** @deprecated */
export function isCustomTypePreset(value: unknown): value is CustomTypePreset {
  return isTypographyFonts(value);
}

export function isTypePresetSelection(value: unknown): value is TypePresetSelection {
  if (!value || typeof value !== 'object') return false;
  const v = value as TypePresetSelection;
  if (v.kind === 'builtin') return isBuiltinTypePresetId(v.id);
  if (v.kind === 'custom') return isTypographyTokens(v.preset);
  return false;
}

function migrateLegacyCustomPreset(raw: unknown): TypographyTokens | null {
  if (!raw || typeof raw !== 'object') return null;
  const v = raw as { serif?: string; sans?: string; mono?: string; fonts?: TypographyFonts };
  if (v.fonts && isTypographyFonts(v.fonts)) {
    return {
      fonts: v.fonts,
      scale: { ...DEFAULT_SCALE },
      spacing: { ...DEFAULT_SPACING },
      margins: { ...DEFAULT_MARGINS },
    };
  }
  if (typeof v.serif === 'string' && typeof v.sans === 'string' && typeof v.mono === 'string') {
    return makeTokens(v.serif, v.sans, v.mono);
  }
  return null;
}

function parseLegacySelection(raw: unknown): TypePresetSelection | null {
  if (!raw || typeof raw !== 'object') return null;
  const v = raw as { id?: unknown; kind?: unknown; preset?: unknown; importedFonts?: ImportedFontRefs };
  if (v.kind === undefined && isBuiltinTypePresetId(v.id)) {
    return { kind: 'builtin', id: v.id };
  }
  if (v.kind === 'custom' && v.preset) {
    const migrated = migrateLegacyCustomPreset(v.preset);
    if (migrated) {
      return { kind: 'custom', preset: migrated, importedFonts: v.importedFonts };
    }
  }
  return null;
}

export function parseTypePresetStorage(raw: unknown): TypePresetSelection {
  if (isTypePresetSelection(raw)) {
    if (raw.kind === 'builtin' && !isBuiltinTypePresetId(raw.id)) {
      return TYPE_PRESET_DEFAULT;
    }
    return raw;
  }
  const legacy = parseLegacySelection(raw);
  if (legacy) return legacy;
  return TYPE_PRESET_DEFAULT;
}

export function getPresetDisplayName(selection: TypePresetSelection): string {
  if (selection.kind === 'builtin') {
    return BUILTIN_TYPE_PRESETS[selection.id]?.name ?? 'Editorial';
  }
  return 'Custom';
}

export function resolveBuiltinTokens(id: BuiltinTypePresetId): TypographyTokens {
  const preset = BUILTIN_TYPE_PRESETS[id] ?? BUILTIN_TYPE_PRESETS.editorial;
  return {
    fonts: { ...preset.fonts },
    scale: { ...preset.scale },
    spacing: { ...preset.spacing },
    margins: { ...preset.margins },
  };
}

export function resolveTypographyTokens(selection: TypePresetSelection): TypographyTokens {
  if (selection.kind === 'builtin') {
    return resolveBuiltinTokens(selection.id);
  }
  return {
    fonts: { ...selection.preset.fonts },
    scale: { ...selection.preset.scale },
    spacing: { ...selection.preset.spacing },
    margins: { ...selection.preset.margins },
  };
}

export function validateGoogleFontName(name: string): { valid: true } | { valid: false; error: string } {
  const trimmed = name.trim();
  if (!trimmed) return { valid: false, error: 'Required' };
  if (trimmed.length > 60) return { valid: false, error: 'Too long' };
  if (!GOOGLE_FONT_NAME_RE.test(trimmed)) {
    return { valid: false, error: 'Use letters, numbers, spaces, or hyphens' };
  }
  return { valid: true };
}

export function validateTypographyTokens(
  tokens: TypographyTokens
): { valid: true } | { valid: false; error: string } {
  const serif = validateGoogleFontName(tokens.fonts.serif);
  if (!serif.valid) return { valid: false, error: `Serif: ${serif.error}` };
  const sans = validateGoogleFontName(tokens.fonts.sans);
  if (!sans.valid) return { valid: false, error: `Sans: ${sans.error}` };
  const mono = validateGoogleFontName(tokens.fonts.mono);
  if (!mono.valid) return { valid: false, error: `Mono: ${mono.error}` };
  return { valid: true };
}

/** @deprecated Use validateTypographyTokens */
export function validateCustomTypePreset(
  preset: CustomTypePreset
): { valid: true } | { valid: false; error: string } {
  return validateTypographyTokens({
    fonts: preset,
    scale: DEFAULT_SCALE,
    spacing: DEFAULT_SPACING,
    margins: DEFAULT_MARGINS,
  });
}

export function toGoogleFamilyParam(name: string): string {
  return encodeURIComponent(name.trim()).replace(/%20/g, '+');
}

export function toFontFamilyCss(name: string, fallback: string): string {
  const trimmed = name.trim();
  if (!trimmed) return fallback;
  return `"${trimmed}", ${fallback}`;
}

export function buildCustomGoogleParam(
  serif: string,
  sans: string,
  mono: string,
  excludeRoles?: Partial<Record<FontRole, boolean>>
): string {
  const roles: Array<{ role: FontRole; name: string }> = [
    { role: 'serif', name: serif },
    { role: 'sans', name: sans },
    { role: 'mono', name: mono },
  ];
  const families = roles
    .filter(({ role, name }) => name.trim() && !excludeRoles?.[role])
    .map(({ name }) => `${toGoogleFamilyParam(name)}:wght@400;500;600`);
  return families.join('&family=');
}

export function buildCustomGoogleFontsUrl(
  serif: string,
  sans: string,
  mono: string,
  excludeRoles?: Partial<Record<FontRole, boolean>>
): string {
  const param = buildCustomGoogleParam(serif, sans, mono, excludeRoles);
  if (!param) return '';
  return `https://fonts.googleapis.com/css2?family=${param}&display=swap`;
}

export function resolveCustomTypeFonts(preset: TypographyFonts): ResolvedTypeFonts {
  return {
    ...resolveFontStacks(preset),
    google: [preset.serif, preset.sans, preset.mono]
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => toGoogleFamilyParam(name))
      .join('&family='),
  };
}

export function resolveTypeFonts(selection: TypePresetSelection): ResolvedTypeFonts {
  const resolved = resolveTypography(selection);
  return {
    serif: resolved.serif,
    sans: resolved.sans,
    mono: resolved.mono,
    google: resolved.google,
  };
}

export function resolveTypography(
  selection: TypePresetSelection,
  importedFaces?: ImportedFontFace[]
): ResolvedTypography {
  const tokens = resolveTypographyTokens(selection);
  const importedByRole = new Map<FontRole, ImportedFontFace>();
  for (const face of importedFaces ?? []) {
    importedByRole.set(face.role, face);
  }

  const serifName = importedByRole.get('serif')?.familyName ?? tokens.fonts.serif;
  const sansName = importedByRole.get('sans')?.familyName ?? tokens.fonts.sans;
  const monoName = importedByRole.get('mono')?.familyName ?? tokens.fonts.mono;

  let google = '';
  if (selection.kind === 'builtin') {
    const preset = BUILTIN_TYPE_PRESETS[selection.id] ?? BUILTIN_TYPE_PRESETS.editorial;
    google = preset.google;
  } else {
    google = buildCustomGoogleParam(
      tokens.fonts.serif,
      tokens.fonts.sans,
      tokens.fonts.mono,
      {
        serif: importedByRole.has('serif'),
        sans: importedByRole.has('sans'),
        mono: importedByRole.has('mono'),
      }
    );
  }

  return {
    serif: toFontFamilyCss(serifName, SERIF_FALLBACK),
    sans: toFontFamilyCss(sansName, SANS_FALLBACK),
    mono: toFontFamilyCss(monoName, MONO_FALLBACK),
    google,
    scale: { ...tokens.scale },
    spacing: { ...tokens.spacing },
    margins: { ...tokens.margins },
  };
}

export function buildGoogleFontsStylesheetUrl(google: string): string {
  if (!google) return '';
  if (google.includes('://')) return google;
  return `https://fonts.googleapis.com/css2?family=${google}&display=swap`;
}

function revokeActiveBlobUrls(): void {
  for (const url of activeBlobUrls) {
    URL.revokeObjectURL(url);
  }
  activeBlobUrls = [];
}

function injectFontFaces(faces: ImportedFontFace[]): void {
  if (typeof document === 'undefined') return;

  revokeActiveBlobUrls();
  activeBlobUrls = faces.map((f) => f.blobUrl);

  let style = document.getElementById(TYPE_PRESET_FACES_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = TYPE_PRESET_FACES_ID;
    document.head.appendChild(style);
  }

  if (faces.length === 0) {
    style.textContent = '';
    return;
  }

  const rules = faces.map(
    (face) =>
      `@font-face{font-family:"${face.familyName}";src:url("${face.blobUrl}") format("${face.format === 'woff2' ? 'woff2' : 'truetype'}");font-weight:400 600;font-style:normal;font-display:swap;}`
  );
  style.textContent = rules.join('\n');
}

export function applyTypeTypography(
  resolved: ResolvedTypography,
  importedFaces?: ImportedFontFace[]
): void {
  if (typeof document === 'undefined') return;

  injectFontFaces(importedFaces ?? []);

  if (resolved.google) {
    let link = document.getElementById(TYPE_PRESET_LINK_ID) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.id = TYPE_PRESET_LINK_ID;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    const href = buildGoogleFontsStylesheetUrl(resolved.google);
    if (href && link.href !== href) {
      link.href = href;
    }
  } else {
    const link = document.getElementById(TYPE_PRESET_LINK_ID);
    link?.remove();
  }

  const root = document.documentElement;
  root.style.setProperty('--serif', resolved.serif);
  root.style.setProperty('--sans', resolved.sans);
  root.style.setProperty('--mono', resolved.mono);

  for (const step of SCALE_STEPS) {
    root.style.setProperty(`--${step}`, resolved.scale[step]);
  }
  root.style.setProperty('--type-display-lh', resolved.spacing.displayLh);
  root.style.setProperty('--type-body-lh', resolved.spacing.bodyLh);
  root.style.setProperty('--type-section-track', resolved.spacing.sectionTrack);
  root.style.setProperty('--type-display-track', resolved.spacing.displayTrack);
  root.style.setProperty('--type-row-height', resolved.margins.rowHeight);
  root.style.setProperty('--type-section-gap', resolved.margins.sectionGap);
  root.style.setProperty('--type-inset-padding', resolved.margins.insetPadding);
  root.style.setProperty('--type-specimen-padding', resolved.margins.specimenPadding);
}

/** @deprecated Use applyTypeTypography */
export function applyTypeFonts(fonts: ResolvedTypeFonts): void {
  applyTypeTypography({
    ...fonts,
    scale: DEFAULT_SCALE,
    spacing: DEFAULT_SPACING,
    margins: DEFAULT_MARGINS,
  });
}

export function applyTypePresetSelection(
  selection: TypePresetSelection,
  importedFaces?: ImportedFontFace[]
): void {
  const resolved = resolveTypography(selection, importedFaces);
  applyTypeTypography(resolved, importedFaces);
}

export function tokensEqual(a: TypographyTokens, b: TypographyTokens): boolean {
  return (
    a.fonts.serif === b.fonts.serif &&
    a.fonts.sans === b.fonts.sans &&
    a.fonts.mono === b.fonts.mono &&
    SCALE_STEPS.every((s) => a.scale[s] === b.scale[s]) &&
    SPACING_KEYS.every((k) => a.spacing[k] === b.spacing[k]) &&
    MARGIN_KEYS.every((k) => a.margins[k] === b.margins[k])
  );
}

export function selectionsEqual(a: TypePresetSelection, b: TypePresetSelection): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'builtin' && b.kind === 'builtin') return a.id === b.id;
  if (a.kind === 'custom' && b.kind === 'custom') {
    const fontsEqual = tokensEqual(a.preset, b.preset);
    const refsEqual =
      JSON.stringify(a.importedFonts ?? {}) === JSON.stringify(b.importedFonts ?? {});
    return fontsEqual && refsEqual;
  }
  return false;
}

async function readStorageRaw(): Promise<unknown> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    const data = await chrome.storage.local.get(TYPE_PRESET_STORAGE_KEY);
    return data[TYPE_PRESET_STORAGE_KEY];
  }
  if (typeof localStorage !== 'undefined') {
    const raw = localStorage.getItem(TYPE_PRESET_STORAGE_KEY);
    if (raw) {
      try {
        return JSON.parse(raw) as unknown;
      } catch {
        return null;
      }
    }
  }
  return null;
}

async function writeStorageRaw(value: TypePresetSelection): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ [TYPE_PRESET_STORAGE_KEY]: value });
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(TYPE_PRESET_STORAGE_KEY, JSON.stringify(value));
  }
}

export async function getTypePresetSelection(): Promise<TypePresetSelection> {
  try {
    const raw = await readStorageRaw();
    return parseTypePresetStorage(raw);
  } catch {
    return TYPE_PRESET_DEFAULT;
  }
}

export async function setTypePresetSelection(
  selection: TypePresetSelection,
  importedFaces?: ImportedFontFace[]
): Promise<void> {
  if (!isTypePresetSelection(selection)) {
    throw new Error('Invalid type preset selection');
  }
  if (selection.kind === 'custom') {
    const result = validateTypographyTokens(selection.preset);
    if (!result.valid) throw new Error(result.error);
  }
  await writeStorageRaw(selection);
  applyTypePresetSelection(selection, importedFaces);
}
