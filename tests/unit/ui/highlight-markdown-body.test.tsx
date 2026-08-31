/**
 * @file highlight-markdown-body.test.tsx
 * @description Restricted markdown renderer + clamp for highlight quotes.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HighlightMarkdownBody } from '@/ui-system/components/primitives/HighlightMarkdownBody';

describe('HighlightMarkdownBody', () => {
  it('renders plain paragraphs from blank-line breaks', () => {
    render(<HighlightMarkdownBody source={'First paragraph.\n\nSecond paragraph.'} />);
    expect(screen.getByText('First paragraph.')).toBeTruthy();
    expect(screen.getByText('Second paragraph.')).toBeTruthy();
  });

  it('renders bold, italic, and inline code', () => {
    const { container } = render(
      <HighlightMarkdownBody source={'**bold** and *italic* and `code`'} />
    );
    expect(container.querySelector('strong')?.textContent).toBe('bold');
    expect(container.querySelector('em')?.textContent).toBe('italic');
    expect(container.querySelector('code')?.textContent).toBe('code');
  });

  it('renders fenced code in a chrome panel with Copy', () => {
    const source = '```\nint a = 0;\n```';
    const { container } = render(<HighlightMarkdownBody source={source} />);
    expect(container.querySelector('[data-testid="highlight-code-chrome"]')).toBeTruthy();
    expect(container.textContent).toContain('int a = 0;');
    expect(screen.getByRole('button', { name: /Copy code block/i })).toBeTruthy();
    expect(container.textContent).toMatch(/code/i);
  });

  it('shows language label when fence has a language tag', () => {
    const source = '```cpp\nint a = 0;\n```';
    render(<HighlightMarkdownBody source={source} />);
    expect(screen.getByText('cpp')).toBeTruthy();
  });

  it('copies inner code only when Copy is clicked', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    const source = '```\nint a = 0;\n```';
    render(<HighlightMarkdownBody source={source} />);
    fireEvent.click(screen.getByRole('button', { name: /Copy code block/i }));
    await vi.waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('int a = 0;');
    });
  });

  it('renders unordered lists', () => {
    const { container } = render(<HighlightMarkdownBody source={'- one\n- two'} />);
    const items = container.querySelectorAll('li');
    expect(items.length).toBe(2);
    expect(items[0]?.textContent).toContain('one');
  });

  it('only allows https links as anchors', () => {
    const { container } = render(
      <HighlightMarkdownBody
        source={'[safe](https://example.com) and [bad](javascript:alert(1))'}
      />
    );
    const anchors = container.querySelectorAll('a');
    expect(anchors.length).toBe(1);
    expect(anchors[0]?.getAttribute('href')).toBe('https://example.com');
    expect(anchors[0]?.getAttribute('rel')).toContain('noopener');
    expect(container.textContent).toContain('bad');
  });

  it('does not render headings as heading elements', () => {
    const { container } = render(<HighlightMarkdownBody source={'# Not a heading'} />);
    expect(container.querySelector('h1')).toBeNull();
    expect(container.textContent).toContain('Not a heading');
  });

  it('shows Show more when clamp overflows long content', () => {
    const long = Array.from(
      { length: 20 },
      (_, i) => `Line ${i + 1} of a long quote.`
    ).join('\n\n');
    render(<HighlightMarkdownBody source={long} clamp />);
    const toggle = screen.getByRole('button', { name: /Show more/i });
    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: /Show less/i })).toBeTruthy();
  });
});
