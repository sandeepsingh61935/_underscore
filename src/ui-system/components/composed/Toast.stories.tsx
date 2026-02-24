import type { Meta, StoryObj } from '@storybook/react';
import { ToastProvider, useToast, useToastActions } from './Toast';
import React from 'react';

const meta: Meta = {
    title: 'UI System/Composed/Toast',
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    decorators: [
        (Story) => (
            <ToastProvider>
                <div className="p-8">
                    <Story />
                </div>
            </ToastProvider>
        ),
    ],
};

export default meta;
type Story = StoryObj;

function ToastDemo() {
    const { success, error, warning, info } = useToastActions();

    return (
        <div className="flex flex-col gap-3 w-[300px]">
            <button
                onClick={() => success('Success!', 'Your changes have been saved.')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
                Show Success Toast
            </button>
            <button
                onClick={() => error('Error', 'Something went wrong. Please try again.')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
                Show Error Toast
            </button>
            <button
                onClick={() => warning('Warning', 'Your session is about to expire.')}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
                Show Warning Toast
            </button>
            <button
                onClick={() => info('Info', 'New features are available.')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
                Show Info Toast
            </button>
        </div>
    );
}

export const Default: Story = {
    render: () => <ToastDemo />,
};

function ToastWithActionDemo() {
    const { addToast } = useToast();

    return (
        <button
            onClick={() => addToast({
                title: 'Highlight deleted',
                description: 'This action can be undone.',
                variant: 'info',
                action: {
                    label: 'Undo',
                    onClick: () => alert('Undo clicked!'),
                },
            })}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
            Delete with Undo
        </button>
    );
}

export const WithAction: Story = {
    render: () => <ToastWithActionDemo />,
};

function MultipleToastsDemo() {
    const { success, error, info } = useToastActions();
    const [count, setCount] = React.useState(0);

    const handleClick = () => {
        const index = count % 3;
        const messages = ['Toast one', 'Toast two', 'Toast three'] as const;
        const description = `Message #${count + 1}`;

        if (index === 0) {
            success(messages[0], description);
        } else if (index === 1) {
            error(messages[1], description);
        } else {
            info(messages[2], description);
        }
        setCount(c => c + 1);
    };

    return (
        <button
            onClick={handleClick}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
            Add Toast (max 3 visible)
        </button>
    );
}

export const Multiple: Story = {
    render: () => <MultipleToastsDemo />,
};
