import React from 'react';

export interface ShortcutBadgeProps {
  shortcut: string;
  isOverridden?: boolean;
}

function Keycap({
  children,
  isOverridden,
}: {
  children: React.ReactNode;
  isOverridden?: boolean;
}): React.ReactElement {
  return (
    <kbd
      className="u-mono"
      data-overridden={isOverridden ? 'true' : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 20,
        height: 20,
        padding: '0 5px',
        fontSize: 'var(--step--2)',
        letterSpacing: '0.02em',
        background: isOverridden ? 'var(--accent-tint-08)' : 'var(--paper)',
        color: isOverridden ? 'var(--accent)' : 'var(--ink)',
        border: `1px solid ${isOverridden ? 'var(--accent)' : 'var(--rule)'}`,
        borderBottom: `2px solid ${isOverridden ? 'var(--accent)' : 'var(--rule)'}`,
        borderRadius: 3,
        lineHeight: 1,
        userSelect: 'none',
        boxSizing: 'border-box',
        verticalAlign: 'middle',
      }}
    >
      {children}
    </kbd>
  );
}

function GestureText({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <span
      className="u-sans"
      style={{
        fontSize: 'var(--step--2)',
        color: 'var(--ink-2)',
        letterSpacing: '0.01em',
        userSelect: 'none',
        verticalAlign: 'middle',
        lineHeight: 1.2,
      }}
    >
      {children}
    </span>
  );
}

function isMouseGesture(s: string): boolean {
  return s.toLowerCase().includes('click');
}

function SingleChord({
  chord,
  isOverridden,
}: {
  chord: string;
  isOverridden?: boolean;
}): React.ReactElement {
  if (chord.includes('+')) {
    const segments = chord.split('+');
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          whiteSpace: 'nowrap',
        }}
      >
        {segments.map((seg, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && (
              <span
                style={{
                  color: 'var(--ink-4)',
                  fontSize: 10,
                  lineHeight: 1,
                  userSelect: 'none',
                  margin: '0 1px',
                }}
              >
                +
              </span>
            )}
            {isMouseGesture(seg) ? (
              <GestureText>{idx > 0 ? seg.toLowerCase() : seg}</GestureText>
            ) : (
              <Keycap isOverridden={isOverridden}>{seg}</Keycap>
            )}
          </React.Fragment>
        ))}
      </span>
    );
  }

  if (isMouseGesture(chord)) {
    return <GestureText>{chord}</GestureText>;
  }

  return <Keycap isOverridden={isOverridden}>{chord}</Keycap>;
}

export function ShortcutBadge({
  shortcut,
  isOverridden,
}: ShortcutBadgeProps): React.ReactElement {
  // If multiple chords / variants (e.g. "Ctrl+Shift+Z · Ctrl+Y" or "Esc · Click outside"), split by ' · '
  if (shortcut.includes(' · ')) {
    const parts = shortcut.split(' · ');
    return (
      <span
        style={{
          display: 'inline-flex',
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {parts.map((p, idx) => (
          <span
            key={idx}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              whiteSpace: 'nowrap',
            }}
          >
            {idx > 0 && (
              <span
                className="u-sans"
                style={{
                  fontSize: 10,
                  color: 'var(--ink-4)',
                  letterSpacing: '0.02em',
                  marginRight: 2,
                  userSelect: 'none',
                }}
              >
                or
              </span>
            )}
            <SingleChord chord={p} isOverridden={isOverridden} />
          </span>
        ))}
      </span>
    );
  }

  return <SingleChord chord={shortcut} isOverridden={isOverridden} />;
}
