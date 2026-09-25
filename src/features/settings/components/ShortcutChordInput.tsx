import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';

import type { Chord, ShortcutPlatform } from '@/shared/keyboard/shortcut-chord';
import { validateChord } from '@/shared/keyboard/shortcut-conflicts';
import { ShortcutBadge } from './ShortcutBadge';

export interface ShortcutChordInputProps {
  id: string;
  action: string;
  shortcut: string;
  currentChord?: Chord;
  customizable?: boolean;
  isOverridden?: boolean;
  allChords: Record<string, Chord>;
  platform: ShortcutPlatform;
  onSave: (id: string, chord: Chord) => Promise<void>;
  onReset: (id: string) => Promise<void>;
}

export function ShortcutChordInput({
  id,
  action,
  shortcut,
  customizable = false,
  isOverridden = false,
  allChords,
  platform,
  onSave,
  onReset,
}: ShortcutChordInputProps): React.ReactElement {
  const [isRecording, setIsRecording] = useState(false);
  const [previewChord, setPreviewChord] = useState<Partial<Chord> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isRecording) {
      setPreviewChord(null);
      setErrorMessage(null);
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      event.preventDefault();
      event.stopPropagation();

      // Escape cancels recording
      if (event.key === 'Escape') {
        setIsRecording(false);
        setErrorMessage(null);
        return;
      }

      const isModifierOnly =
        event.key === 'Control' ||
        event.key === 'Shift' ||
        event.key === 'Alt' ||
        event.key === 'Meta';

      const hasMod = event.ctrlKey || event.metaKey;

      if (isModifierOnly) {
        setPreviewChord({
          ctrlOrMeta: hasMod,
          shift: event.shiftKey,
          alt: event.altKey,
          key: '',
        });
        return;
      }

      // Candidate key pressed
      const candidate: Chord = {
        key: event.key.toLowerCase(),
        ...(hasMod ? { ctrlOrMeta: true } : {}),
        ...(event.shiftKey ? { shift: true } : {}),
        ...(event.altKey ? { alt: true } : {}),
      };

      const validation = validateChord(id, candidate, allChords, platform);
      if (!validation.valid) {
        setErrorMessage(validation.error ?? 'Invalid shortcut');
        setPreviewChord(candidate);
        return;
      }

      // Valid chord
      setErrorMessage(null);
      setIsRecording(false);
      void onSave(id, candidate);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isRecording, id, allChords, platform, onSave]);

  if (!customizable) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <ShortcutBadge shortcut={shortcut} />
      </div>
    );
  }

  if (isRecording) {
    let previewText = 'Press keys…';
    if (previewChord) {
      const parts: string[] = [];
      const isMac = platform === 'mac';
      if (previewChord.ctrlOrMeta) parts.push(isMac ? '⌘' : 'Ctrl');
      if (previewChord.alt) parts.push(isMac ? '⌥' : 'Alt');
      if (previewChord.shift) parts.push('Shift');
      if (previewChord.key) parts.push(previewChord.key.toUpperCase());
      if (parts.length > 0) {
        previewText = parts.join('+');
      }
    }

    return (
      <div
        ref={containerRef}
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 4,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 8px',
            background: 'var(--paper)',
            border: '1px solid var(--accent)',
            borderRadius: 4,
          }}
        >
          <span
            className="u-mono"
            style={{
              fontSize: 'var(--step--2)',
              color: 'var(--accent)',
              letterSpacing: '0.04em',
            }}
          >
            {previewText}
          </span>
          <button
            type="button"
            className="u-mono"
            onClick={(e) => {
              e.stopPropagation();
              setIsRecording(false);
            }}
            style={{
              all: 'unset',
              cursor: 'pointer',
              fontSize: 'var(--step--3, 10px)',
              color: 'var(--ink-4)',
              padding: '1px 4px',
              border: '1px solid var(--rule-soft)',
              borderRadius: 3,
            }}
          >
            Esc
          </button>
        </div>

        {errorMessage ? (
          <span
            role="alert"
            className="u-mono"
            style={{
              fontSize: 'var(--step--3, 11px)',
              color: 'var(--accent)',
              letterSpacing: '0.02em',
              maxWidth: 220,
              textAlign: 'right',
            }}
          >
            {errorMessage}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <button
        type="button"
        aria-label={`Change shortcut for ${action}. Current: ${shortcut}`}
        title="Click to edit shortcut"
        data-testid={`shortcut-edit-btn-${id}`}
        onClick={() => setIsRecording(true)}
        style={{
          all: 'unset',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          borderRadius: 4,
          padding: '2px 0',
        }}
      >
        <ShortcutBadge shortcut={shortcut} isOverridden={isOverridden} />
      </button>

      {isOverridden ? (
        <button
          type="button"
          aria-label={`Reset ${action} to default shortcut`}
          data-testid={`shortcut-reset-btn-${id}`}
          onClick={(e) => {
            e.stopPropagation();
            void onReset(id);
          }}
          title="Reset to default"
          style={{
            all: 'unset',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            borderRadius: 4,
            color: 'var(--ink-3)',
          }}
        >
          <RotateCcw size={12} />
        </button>
      ) : null}
    </div>
  );
}
