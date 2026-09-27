import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Switch } from './Switch';
import { PlanPill } from './PlanPill';
import { ModePill } from './ModePill';

describe('Switch (Editorial contract)', () => {
  it('renders role=switch with aria-checked', () => {
    render(<Switch />);
    const el = screen.getByRole('switch');
    expect(el.getAttribute('aria-checked')).toBe('false');
    expect(el.className).toMatch(/\bswitch\b/);
  });

  it('controlled checked adds .is-on', () => {
    const { rerender } = render(<Switch checked={false} />);
    const el = screen.getByRole('switch');
    expect(el.className).not.toMatch(/\bis-on\b/);
    rerender(<Switch checked />);
    expect(el.className).toMatch(/\bis-on\b/);
  });

  it('uncontrolled toggles and calls onCheckedChange', () => {
    const onCheckedChange = vi.fn();
    render(<Switch defaultChecked={false} onCheckedChange={onCheckedChange} />);
    const el = screen.getByRole('switch');
    fireEvent.click(el);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(el.getAttribute('aria-checked')).toBe('true');
  });
});

describe('PlanPill (Editorial contract)', () => {
  it('renders status text with .plan-pill + dot', () => {
    const { container } = render(<PlanPill status="free" />);
    expect(container.textContent).toContain('Free');
    expect(container.firstElementChild?.className).toMatch(/\bplan-pill\b/);
    expect(
      container.querySelector('.plan-dot')
    ).not.toBeNull();
  });

  it('paid adds .is-paid, past-due adds .is-past-due', () => {
    const { container: a } = render(<PlanPill status="paid" />);
    const { container: b } = render(<PlanPill status="past-due" />);
    expect(a.firstElementChild?.className).toMatch(/\bis-paid\b/);
    expect(b.firstElementChild?.className).toMatch(/\bis-past-due\b/);
    expect(b.textContent).toContain('Past due');
  });
});

describe('ModePill (Editorial contract)', () => {
  it('renders glyph + label for the mode', () => {
    render(<ModePill mode="pro" />);
    const btn = screen.getByRole('button', { name: /starter/i });
    expect(btn.className).toMatch(/\bmode-pill\b/);
  });

  it('defaults to Guest', () => {
    render(<ModePill />);
    expect(screen.getByRole('button', { name: /guest/i })).toBeTruthy();
  });
});
