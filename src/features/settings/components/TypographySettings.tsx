import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  BUILTIN_TYPE_PRESET_LIST,
  BUILTIN_TYPE_PRESETS,
  TYPE_FONT_CATALOG,
  resolveBuiltinTokens,
  type BuiltinTypePresetId,
  type FontRole,
  type MarginKey,
  type ScaleStepId,
  type SpacingKey,
  type TypographyTokens,
  type TypePresetSelection,
} from '@/shared/constants/type-presets';
import {
  deleteFontFile,
  getFontFile,
  storeFontFile,
} from '@/shared/services/font-import-store';
import { TypeSpecimen } from '@/features/settings/components/TypeSpecimen';
import {
  abbreviateLabel,
  CollapsibleSection,
  EditableControlRow,
  SectionValueColumns,
} from '@/ui-system/components/composed/TypographyControls';
import { WheelPicker } from '@/ui-system/components/composed/WheelPicker';
import { useTypePreset } from '@/ui-system/hooks/useTypePreset';

const SCALE_META: Array<{ id: ScaleStepId; label: string; hint: string }> = [
  { id: 'step-3', label: 'Display', hint: 'Library title' },
  { id: 'step-2', label: 'Domain', hint: 'Domain name' },
  { id: 'step-0', label: 'Section', hint: 'Sub-domain caps' },
  { id: 'step-1', label: 'Body', hint: 'Highlight quote' },
  { id: 'step--2', label: 'Meta', hint: 'Labels and timestamps' },
];

const SPACING_META: Array<{ key: SpacingKey; label: string }> = [
  { key: 'displayLh', label: 'Display line height' },
  { key: 'bodyLh', label: 'Body line height' },
  { key: 'sectionTrack', label: 'Section tracking' },
  { key: 'displayTrack', label: 'Display tracking' },
];

const MARGIN_META: Array<{ key: MarginKey; label: string }> = [
  { key: 'rowHeight', label: 'Row height' },
  { key: 'sectionGap', label: 'Section gap' },
  { key: 'insetPadding', label: 'Inset padding' },
  { key: 'specimenPadding', label: 'Specimen padding' },
];

interface FontUploadZoneProps {
  fileName: string | null;
  activeRole: FontRole;
  onUpload: (file: File, role: FontRole) => Promise<void>;
  onRemove: (role: FontRole) => Promise<void>;
  error: string | null;
}

function FontUploadZone({
  fileName,
  activeRole,
  onUpload,
  onRemove,
  error,
}: FontUploadZoneProps): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (files: FileList | null): void => {
    const file = files?.[0];
    if (!file) return;
    void onUpload(file, activeRole);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      style={{
        padding: '16px',
        border: `1px dashed ${dragOver ? 'var(--accent)' : 'var(--rule)'}`,
        background: 'var(--paper-2)',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 'var(--step--1)', fontWeight: 500, color: 'var(--ink)' }}>
        {fileName ?? 'Drop .woff2 or .ttf'}
      </div>
      <div className="u-mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 4 }}>
        Assigns to {activeRole} role
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="u-mono"
          style={{
            all: 'unset',
            cursor: 'pointer',
            padding: '8px 14px',
            border: '1px solid var(--rule)',
            background: 'var(--paper)',
            fontSize: 'var(--step--2)',
            color: 'var(--ink)',
            minHeight: 36,
          }}
        >
          Upload font
        </button>
        {fileName ? (
          <button
            type="button"
            onClick={() => void onRemove(activeRole)}
            className="u-mono"
            style={{
              all: 'unset',
              cursor: 'pointer',
              padding: '8px 14px',
              border: '1px solid var(--rule-soft)',
              fontSize: 'var(--step--2)',
              color: 'var(--ink-3)',
              minHeight: 36,
            }}
          >
            Remove
          </button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".woff2,.ttf,font/woff2,font/ttf"
        style={{ display: 'none' }}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
      {error ? (
        <div className="u-mono" style={{ fontSize: 10, color: 'var(--ttl-low)', marginTop: 8 }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}

export interface TypographySettingsProps {
  expanded: boolean;
  onToggle: () => void;
}

export function TypographySettings({ expanded, onToggle }: TypographySettingsProps): React.ReactElement {
  const { selection, displayName, setSelection, resetToDefault } = useTypePreset();

  const [draft, setDraft] = useState<TypographyTokens>(() => resolveBuiltinTokens('editorial'));
  const [isCustom, setIsCustom] = useState(false);
  const [fontRole, setFontRole] = useState<FontRole>('serif');
  const [importError, setImportError] = useState<string | null>(null);
  const [importedNames, setImportedNames] = useState<Partial<Record<FontRole, string>>>({});

  const syncFromSelection = useCallback(async (sel: TypePresetSelection): Promise<void> => {
    if (sel.kind === 'builtin') {
      setDraft(resolveBuiltinTokens(sel.id));
      setIsCustom(false);
    } else {
      setDraft({
        fonts: { ...sel.preset.fonts },
        scale: { ...sel.preset.scale },
        spacing: { ...sel.preset.spacing },
        margins: { ...sel.preset.margins },
      });
      setIsCustom(true);
    }

    const names: Partial<Record<FontRole, string>> = {};
    if (sel.kind === 'custom' && sel.importedFonts) {
      for (const role of ['serif', 'sans', 'mono'] as const) {
        const id = sel.importedFonts[role];
        if (!id) continue;
        const stored = await getFontFile(id);
        if (stored) names[role] = stored.fileName;
      }
    }
    setImportedNames(names);
  }, []);

  useEffect(() => {
    void syncFromSelection(selection);
  }, [selection, syncFromSelection]);

  const presetItems = useMemo(
    () => BUILTIN_TYPE_PRESET_LIST.map((id) => ({ id, label: BUILTIN_TYPE_PRESETS[id].name })),
    []
  );

  const presetIndex = useMemo(() => {
    if (isCustom || selection.kind !== 'builtin') return 0;
    const idx = BUILTIN_TYPE_PRESET_LIST.indexOf(selection.id);
    return idx >= 0 ? idx : 0;
  }, [isCustom, selection]);

  const activePresetName = isCustom ? 'Custom' : displayName;

  const fontHeaderValues = [
    abbreviateLabel(draft.fonts.serif),
    abbreviateLabel(draft.fonts.sans),
    abbreviateLabel(draft.fonts.mono),
  ];
  const scaleHeaderValues = SCALE_META.map((s) => draft.scale[s.id]);
  const spacingHeaderValues = SPACING_META.map((s) => draft.spacing[s.key]);
  const marginHeaderValues = MARGIN_META.map((m) => draft.margins[m.key]);
  const importSummary = importedNames.serif ?? importedNames.sans ?? importedNames.mono ?? 'None';

  const applyBuiltin = (id: BuiltinTypePresetId): void => {
    const tokens = resolveBuiltinTokens(id);
    setDraft(tokens);
    setIsCustom(false);
    void setSelection({ kind: 'builtin', id });
  };

  const markCustom = (next: TypographyTokens): void => {
    setDraft(next);
    setIsCustom(true);
  };

  const handleApply = (): void => {
    if (!isCustom && selection.kind === 'builtin') {
      applyBuiltin(selection.id);
      return;
    }
    const importedFonts = selection.kind === 'custom' ? selection.importedFonts : undefined;
    void setSelection({ kind: 'custom', preset: draft, importedFonts });
  };

  const handleFontChange = (role: FontRole, name: string): void => {
    const next: TypographyTokens = {
      ...draft,
      fonts: { ...draft.fonts, [role]: name },
    };
    markCustom(next);
  };

  const handleUpload = async (file: File, role: FontRole): Promise<void> => {
    setImportError(null);
    try {
      const stored = await storeFontFile(file);
      const importedFonts = {
        ...(selection.kind === 'custom' ? selection.importedFonts : {}),
        [role]: stored.id,
      };
      const next: TypographyTokens = {
        ...draft,
        fonts: { ...draft.fonts, [role]: stored.familyName },
      };
      setDraft(next);
      setIsCustom(true);
      setImportedNames((prev) => ({ ...prev, [role]: stored.fileName }));
      await setSelection({ kind: 'custom', preset: next, importedFonts });
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const handleRemoveImport = async (role: FontRole): Promise<void> => {
    if (selection.kind !== 'custom' || !selection.importedFonts?.[role]) return;
    const id = selection.importedFonts[role];
    if (id) await deleteFontFile(id);
    const importedFonts = { ...selection.importedFonts };
    delete importedFonts[role];
    setImportedNames((prev) => {
      const next = { ...prev };
      delete next[role];
      return next;
    });
    await setSelection({
      kind: 'custom',
      preset: draft,
      importedFonts: Object.keys(importedFonts).length > 0 ? importedFonts : undefined,
    });
  };

  const roleFonts: readonly string[] = TYPE_FONT_CATALOG[fontRole];
  const fontWheelItems = roleFonts.map((name) => ({ id: name, label: name }));
  const fontSelectedIndex = Math.max(0, roleFonts.indexOf(draft.fonts[fontRole]));

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className="u-sans"
        aria-expanded={expanded}
        style={{
          all: 'unset',
          cursor: 'pointer',
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: 10,
          alignItems: 'center',
          width: '100%',
          boxSizing: 'border-box',
          padding: '12px 16px',
          borderBottom: '1px solid var(--rule-soft)',
          background: expanded ? 'var(--paper-2)' : 'transparent',
          textAlign: 'left',
          minHeight: 44,
        }}
      >
        <div>
          <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>Typography</div>
          <div className="u-mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>
            {activePresetName}
          </div>
        </div>
        <span
          className="u-mono"
          style={{
            fontSize: 10,
            color: expanded ? 'var(--accent)' : 'var(--ink-3)',
          }}
          aria-hidden
        >
          {expanded ? '▾' : '▸'}
        </span>
      </button>

      {expanded ? (
        <div style={{ borderBottom: '1px solid var(--rule-soft)', background: 'var(--paper-2)' }}>
          <div style={{ padding: '12px 16px 0' }}>
            <TypeSpecimen tokens={draft} />
          </div>

          <div style={{ padding: '12px 16px 16px' }}>
            <CollapsibleSection
              title="Presets"
              defaultOpen
              trailing={<SectionValueColumns values={[activePresetName]} />}
            >
              <WheelPicker
                items={presetItems}
                selectedIndex={presetIndex}
                onSelectIndex={(index) => {
                  const id = BUILTIN_TYPE_PRESET_LIST[index];
                  if (id) applyBuiltin(id);
                }}
              />
              {isCustom ? (
                <div className="u-mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 8 }}>
                  Custom — fonts or scale edited manually
                </div>
              ) : null}
            </CollapsibleSection>

            <CollapsibleSection
              title="Fonts"
              defaultOpen
              trailing={<SectionValueColumns values={fontHeaderValues} />}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 8,
                  marginBottom: 10,
                  width: '100%',
                }}
              >
                {(['serif', 'sans', 'mono'] as const).map((role) => {
                  const active = fontRole === role;
                  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
                  const roleValue = draft.fonts[role];
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setFontRole(role)}
                      style={{
                        all: 'unset',
                        cursor: 'pointer',
                        padding: '8px 6px',
                        border: `1px solid ${active ? 'var(--accent)' : 'var(--rule-soft)'}`,
                        background: active ? 'var(--paper)' : 'transparent',
                        textAlign: 'center',
                        minWidth: 0,
                        boxSizing: 'border-box',
                      }}
                    >
                      <span
                        className="u-mono"
                        style={{
                          display: 'block',
                          fontSize: 10,
                          color: active ? 'var(--accent)' : 'var(--ink-2)',
                          textTransform: 'capitalize',
                        }}
                      >
                        {roleLabel}
                      </span>
                      <span
                        className="u-mono"
                        title={roleValue}
                        style={{
                          display: 'block',
                          marginTop: 3,
                          fontSize: 10,
                          color: active ? 'var(--ink-2)' : 'var(--ink-3)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {abbreviateLabel(roleValue, 10)}
                      </span>
                    </button>
                  );
                })}
              </div>
              <WheelPicker
                items={fontWheelItems}
                selectedIndex={fontSelectedIndex >= 0 ? fontSelectedIndex : 0}
                onSelectIndex={(index) => {
                  const name = roleFonts[index];
                  if (name) handleFontChange(fontRole, name);
                }}
                aria-label={`${fontRole} font picker`}
              />
            </CollapsibleSection>

            <CollapsibleSection title="Scale" trailing={<SectionValueColumns values={scaleHeaderValues} />}>
              {SCALE_META.map((s) => (
                <EditableControlRow
                  key={s.id}
                  label={s.label}
                  value={draft.scale[s.id]}
                  hint={s.hint}
                  inputWidth={64}
                  onChange={(v) =>
                    markCustom({
                      ...draft,
                      scale: { ...draft.scale, [s.id]: v },
                    })
                  }
                />
              ))}
            </CollapsibleSection>

            <CollapsibleSection title="Spacing" trailing={<SectionValueColumns values={spacingHeaderValues} />}>
              {SPACING_META.map((s) => (
                <EditableControlRow
                  key={s.key}
                  label={s.label}
                  value={draft.spacing[s.key]}
                  inputWidth={80}
                  onChange={(v) =>
                    markCustom({
                      ...draft,
                      spacing: { ...draft.spacing, [s.key]: v },
                    })
                  }
                />
              ))}
            </CollapsibleSection>

            <CollapsibleSection title="Margins" trailing={<SectionValueColumns values={marginHeaderValues} />}>
              {MARGIN_META.map((m) => (
                <EditableControlRow
                  key={m.key}
                  label={m.label}
                  value={draft.margins[m.key]}
                  inputWidth={64}
                  onChange={(v) =>
                    markCustom({
                      ...draft,
                      margins: { ...draft.margins, [m.key]: v },
                    })
                  }
                />
              ))}
            </CollapsibleSection>

            <CollapsibleSection title="Import" trailing={<SectionValueColumns values={[abbreviateLabel(importSummary, 14)]} />}>
              <FontUploadZone
                fileName={importedNames[fontRole] ?? null}
                activeRole={fontRole}
                onUpload={handleUpload}
                onRemove={handleRemoveImport}
                error={importError}
              />
            </CollapsibleSection>

            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button
                type="button"
                onClick={handleApply}
                className="u-mono"
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  flex: 1,
                  textAlign: 'center',
                  padding: '10px 14px',
                  border: '1px solid var(--accent)',
                  background: 'var(--accent)',
                  color: 'var(--accent-ink)',
                  fontSize: 'var(--step--1)',
                  minHeight: 44,
                }}
              >
                Apply
              </button>
              <button
                type="button"
                onClick={() => void resetToDefault()}
                className="u-mono"
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  padding: '10px 14px',
                  border: '1px solid var(--rule)',
                  background: 'var(--paper)',
                  color: 'var(--ink-2)',
                  fontSize: 'var(--step--1)',
                  minHeight: 44,
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
