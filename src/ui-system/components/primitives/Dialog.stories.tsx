import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Dialog } from './Dialog';
import { Button } from './Button';

/**
 * MD3 Dialog Component
 * 
 * **MD3 Spec**: `elevation.md` - Dialog uses elevation-4 (8dp)
 */
const meta = {
    title: 'UI/Primitives/Dialog',
    component: Dialog,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    render: () => {
        const [open, setOpen] = React.useState(false);

        return (
            <>
                <Button onClick={() => setOpen(true)}>Open Dialog</Button>
                <Dialog
                    open={open}
                    onClose={() => setOpen(false)}
                    title="Confirm Action"
                    description="Are you sure you want to proceed with this action?"
                >
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="text" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button variant="filled" onClick={() => setOpen(false)}>Confirm</Button>
                    </div>
                </Dialog>
            </>
        );
    },
};

export const WithLongContent: Story = {
    render: () => {
        const [open, setOpen] = React.useState(false);

        return (
            <>
                <Button onClick={() => setOpen(true)}>Open Dialog</Button>
                <Dialog
                    open={open}
                    onClose={() => setOpen(false)}
                    title="Terms and Conditions"
                    description="Please read the following terms carefully."
                >
                    <div className="max-h-[300px] overflow-y-auto">
                        <p className="text-body-medium text-on-surface mb-4">
                            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                        </p>
                        <p className="text-body-medium text-on-surface mb-4">
                            Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                        </p>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="text" onClick={() => setOpen(false)}>Decline</Button>
                        <Button variant="filled" onClick={() => setOpen(false)}>Accept</Button>
                    </div>
                </Dialog>
            </>
        );
    },
};
