import React, { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export interface WheelPickerItem {
  id: string;
  label: string;
}

export interface WheelPickerProps {
  items: WheelPickerItem[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  renderItem?: (label: string, slot: 'prev' | 'current' | 'next') => ReactNode;
  compact?: boolean;
  'aria-label'?: string;
}

function opacityForDistance(distance: number): number {
  if (distance === 0) return 1;
  return Math.max(0.2, 0.55 - distance * 0.12);
}

interface LoopedWheelRow {
  key: string;
  label: string;
  sourceIndex: number;
}

function buildLoopedRows(items: WheelPickerItem[]): LoopedWheelRow[] {
  if (items.length <= 1) {
    return items.map((item, index) => ({
      key: item.id,
      label: item.label,
      sourceIndex: index,
    }));
  }

  const last = items[items.length - 1]!;
  const first = items[0]!;

  return [
    { key: `${last.id}__wrap-before`, label: last.label, sourceIndex: items.length - 1 },
    ...items.map((item, index) => ({
      key: item.id,
      label: item.label,
      sourceIndex: index,
    })),
    { key: `${first.id}__wrap-after`, label: first.label, sourceIndex: 0 },
  ];
}

function isCircularWrap(prevIndex: number, nextIndex: number, len: number): boolean {
  if (len <= 1) return false;
  return (prevIndex === 0 && nextIndex === len - 1) || (prevIndex === len - 1 && nextIndex === 0);
}

export function WheelPicker({
  items,
  selectedIndex,
  onSelectIndex,
  renderItem,
  compact = false,
  'aria-label': ariaLabel = 'Scrollable option picker. Click to enable wheel scrolling.',
}: WheelPickerProps): React.ReactElement {
  const len = items.length;
  const rowHeight = compact ? 32 : 36;
  const visibleRows = 3;
  const viewportHeight = rowHeight * visibleRows;
  const [reduceMotion, setReduceMotion] = useState(false);
  const [wheelArmed, setWheelArmed] = useState(false);
  const wheelLock = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedIndexRef = useRef(selectedIndex);
  const prevSelectedIndexRef = useRef(selectedIndex);
  const onSelectIndexRef = useRef(onSelectIndex);
  const reduceMotionRef = useRef(false);

  selectedIndexRef.current = selectedIndex;
  onSelectIndexRef.current = onSelectIndex;

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = (): void => {
      reduceMotionRef.current = mq.matches;
      setReduceMotion(mq.matches);
    };
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!wheelArmed) return;
    const handlePointerDown = (event: PointerEvent): void => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setWheelArmed(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [wheelArmed]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !wheelArmed || len === 0) return;

    const handleWheel = (event: WheelEvent): void => {
      event.preventDefault();
      event.stopPropagation();
      if (wheelLock.current) return;
      wheelLock.current = true;
      const delta = event.deltaY > 0 ? 1 : -1;
      const next = (selectedIndexRef.current + delta + len) % len;
      onSelectIndexRef.current(next);
      window.setTimeout(() => {
        wheelLock.current = false;
      }, reduceMotionRef.current ? 0 : 180);
    };

    el.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    return () => el.removeEventListener('wheel', handleWheel, { capture: true });
  }, [wheelArmed, len]);

  const loopedRows = useMemo(() => buildLoopedRows(items), [items]);
  const listIndex = len <= 1 ? selectedIndex : selectedIndex + 1;
  const translateY = useMemo(() => rowHeight - listIndex * rowHeight, [listIndex, rowHeight]);
  const skipTransition =
    reduceMotion || isCircularWrap(prevSelectedIndexRef.current, selectedIndex, len);
  prevSelectedIndexRef.current = selectedIndex;

  const armWheel = (): void => {
    setWheelArmed(true);
  };

  const defaultRender = (label: string, slot: 'prev' | 'current' | 'next'): ReactNode => (
    <span
      style={{
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        width: '100%',
        fontSize: slot === 'current' ? 'var(--step-0)' : 'var(--step--1)',
        color: slot === 'current' ? 'var(--ink)' : 'var(--ink-3)',
        fontWeight: slot === 'current' ? 500 : 400,
      }}
    >
      {label}
    </span>
  );

  const render = renderItem ?? defaultRender;

  if (len === 0) {
    return (
      <div
        style={{
          padding: '12px',
          textAlign: 'center',
          color: 'var(--ink-3)',
          fontSize: 'var(--step--1)',
          border: '1px solid var(--rule-soft)',
        }}
      >
        No options
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onPointerDown={armWheel}
      onFocus={armWheel}
      onBlur={(event: React.FocusEvent<HTMLDivElement>) => {
        if (!containerRef.current?.contains(event.relatedTarget as Node | null)) {
          setWheelArmed(false);
        }
      }}
      onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
        if (len === 0) return;
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          armWheel();
          const next = (selectedIndex - 1 + len) % len;
          onSelectIndex(next);
        } else if (event.key === 'ArrowDown') {
          event.preventDefault();
          armWheel();
          const next = (selectedIndex + 1) % len;
          onSelectIndex(next);
        }
      }}
      style={{
        position: 'relative',
        height: viewportHeight,
        overflow: 'hidden',
        border: `1px solid ${wheelArmed ? 'var(--accent)' : 'var(--rule-soft)'}`,
        background: 'var(--paper)',
        minWidth: 0,
        width: '100%',
        outline: 'none',
        overscrollBehavior: 'contain',
        touchAction: wheelArmed ? 'none' : 'auto',
      }}
      aria-label={ariaLabel}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: rowHeight,
          left: 0,
          right: 0,
          height: rowHeight,
          border: '1px solid var(--accent)',
          background: 'var(--paper-2)',
          opacity: 0.55,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      <div
        style={{
          transform: reduceMotion ? undefined : `translateY(${translateY}px)`,
          transition: skipTransition ? undefined : 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
          willChange: reduceMotion ? undefined : 'transform',
        }}
      >
        {loopedRows.map((row, index) => {
          const isSelected = row.sourceIndex === selectedIndex;
          const distance = Math.abs(index - listIndex);
          const slot: 'prev' | 'current' | 'next' = isSelected ? 'current' : 'prev';
          return (
            <button
              key={row.key}
              type="button"
              onClick={() => {
                armWheel();
                onSelectIndex(row.sourceIndex);
              }}
              style={{
                all: 'unset',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: rowHeight,
                boxSizing: 'border-box',
                padding: '0 10px',
                opacity: opacityForDistance(distance),
                textAlign: 'center',
                minWidth: 0,
                transition: reduceMotion ? undefined : 'opacity 180ms ease',
              }}
            >
              {render(row.label, slot)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
