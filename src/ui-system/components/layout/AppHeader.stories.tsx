import { Settings, User } from 'lucide-react';
import type { Meta, StoryObj } from '@storybook/react';

import { AppHeader } from './AppHeader';

const meta: Meta<typeof AppHeader> = {
  title: 'Layout/AppHeader',
  component: AppHeader,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Single shared sticky header primitive. Three variants: `primary` (logo left, action right), `sub` (back · logo · spacer), `standalone` (logo centred). Logo is always a non-interactive brand mark.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'sub', 'standalone'],
    },
    compact: { control: 'boolean' },
    backLabel: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof AppHeader>;

// ─── primary ────────────────────────────────────────────────────────────────

export const PrimaryDefault: Story = {
  name: 'primary — with settings action',
  args: {
    variant: 'primary',
    action: (
      <button
        type="button"
        aria-label="Open settings"
        className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest text-outline shadow-elevation-1 transition-all duration-short ease-standard hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <Settings size={17} />
      </button>
    ),
  },
};

export const PrimaryWithAvatar: Story = {
  name: 'primary — with user avatar',
  args: {
    variant: 'primary',
    action: (
      <div
        className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-on-primary text-title-small font-semibold"
        aria-hidden="true"
      >
        S
      </div>
    ),
  },
};

export const PrimaryNoAction: Story = {
  name: 'primary — no action',
  args: { variant: 'primary' },
};

export const PrimaryCompact: Story = {
  name: 'primary compact (popup)',
  args: {
    variant: 'primary',
    compact: true,
    action: (
      <button
        type="button"
        aria-label="Open settings"
        className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest text-outline shadow-elevation-1 transition-all duration-short ease-standard hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <Settings size={17} />
      </button>
    ),
  },
};

// ─── sub ─────────────────────────────────────────────────────────────────────

export const SubWithBack: Story = {
  name: 'sub — with back label',
  args: {
    variant: 'sub',
    backLabel: 'Collections',
    onBack: () => {},
  },
};

export const SubCompact: Story = {
  name: 'sub compact (popup)',
  args: {
    variant: 'sub',
    compact: true,
    backLabel: 'Back',
    onBack: () => {},
  },
};

export const SubNoLabel: Story = {
  name: 'sub — no label (icon only)',
  args: {
    variant: 'sub',
    onBack: () => {},
  },
};

// ─── standalone ──────────────────────────────────────────────────────────────

export const StandaloneDefault: Story = {
  name: 'standalone — default (web)',
  args: { variant: 'standalone' },
};

export const StandaloneCompact: Story = {
  name: 'standalone compact (popup / auth)',
  args: { variant: 'standalone', compact: true },
};

// ─── showcase ────────────────────────────────────────────────────────────────

export const AllVariants: Story = {
  name: 'all variants showcase',
  render: () => (
    <div className="flex flex-col gap-0 bg-surface">
      <div className="px-4 py-2 text-label-small text-outline uppercase tracking-[0.15em]">primary (web)</div>
      <AppHeader
        variant="primary"
        action={
          <button
            type="button"
            aria-label="Open settings"
            className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest text-outline shadow-elevation-1"
          >
            <Settings size={17} />
          </button>
        }
      />
      <div className="px-4 py-2 text-label-small text-outline uppercase tracking-[0.15em]">primary compact (popup)</div>
      <AppHeader
        variant="primary"
        compact
        action={
          <button
            type="button"
            aria-label="Open settings"
            className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest text-outline shadow-elevation-1"
          >
            <Settings size={17} />
          </button>
        }
      />
      <div className="px-4 py-2 text-label-small text-outline uppercase tracking-[0.15em]">sub (web)</div>
      <AppHeader variant="sub" backLabel="Collections" onBack={() => {}} />
      <div className="px-4 py-2 text-label-small text-outline uppercase tracking-[0.15em]">sub compact (popup)</div>
      <AppHeader variant="sub" compact backLabel="Back" onBack={() => {}} />
      <div className="px-4 py-2 text-label-small text-outline uppercase tracking-[0.15em]">standalone (web)</div>
      <AppHeader variant="standalone" />
      <div className="px-4 py-2 text-label-small text-outline uppercase tracking-[0.15em]">standalone compact (popup / auth)</div>
      <AppHeader variant="standalone" compact />
    </div>
  ),
};
