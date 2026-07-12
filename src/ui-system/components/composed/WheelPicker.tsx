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

  const translateY = useMemo(() => rowHeight - selectedIndex * rowHeight, [rowHeight, selectedIndex]);

  const armWheel = (): void => {
    setWheelArmed(true);
  };

  const defaultRender = (label: string, slot: 'prev' | 'current' | 'next'): ReactNode => (
    <span
      style={{
        display: 'block',
        height: rowHeight,
        lineHeight: `${rowHeight}px`,
        textAlign: 'center',
        fontSize: slot === 'current' ? 'var(--step-0)' : 'var(--step--1)',
        color: slot === 'current' ? 'var(--ink)' : 'var(--ink-3)',
        fontWeight: slot === 'current' ? 500 : 400,
        opacity: slot === 'current' ? 1 : 0.45,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        padding: '0 8px',
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

  const prevIndex = (selectedIndex - 1 + len) % len;
  const nextIndex = (selectedIndex + 1) % len;

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
        style={{
          transform: reduceMotion ? undefined : `translateY(${translateY}px)`,
          transition: reduceMotion ? undefined : 'transform 180ms ease',
        }}
      >
        {render(items[prevIndex]?.label ?? '', 'prev')}
        {render(items[selectedIndex]?.label ?? '', 'current')}
        {render(items[nextIndex]?.label ?? '', 'next')}
      </div>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: rowHeight,
          height: rowHeight,
          borderTop: '1px solid var(--rule-soft)',
          borderBottom: '1px solid var(--rule-soft)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
