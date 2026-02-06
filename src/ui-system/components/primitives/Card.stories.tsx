import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './Card';

/**
 * MD3 Card Component
 * 
 * **Design Reference**: `/docs/07-design/Collections/2-d /2-d-image.png`  
 * **MD3 Specifications**: `docs/material_design_reference/elevation.md`
 * 
 * ## MD3 Elevation
 * - **Default**: shadow-elevation-1 (subtle)
 * - **Interactive hover**: shadow-elevation-2 (lifted)
 * - **Surface**: Uses `surface-container` color token
 */
const meta = {
    title: 'UI/Primitives/Card',
    component: Card,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        interactive: {
            control: 'boolean',
            description: 'Makes card clickable with hover effects',
        },
        elevated: {
            control: 'boolean',
            description: 'Adds MD3 elevation shadow',
        },
    },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default card matching Collections view design
 */
export const Default: Story = {
    render: () => (
        <Card className="w-[320px]" elevated>
            <CardHeader>
                <CardTitle>dribbble.com</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-body-medium text-on-surface-variant">3 underscores</p>
                <p className="text-body-small text-on-surface-variant mt-1">Design Inspiration</p>
            </CardContent>
        </Card>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Card from Collections view - shadow-elevation-1 by default',
            },
        },
    },
};

/**
 * Interactive card with hover elevation change
 */
export const Interactive: Story = {
    render: () => (
        <Card
            interactive
            elevated
            className="w-[320px]"
            onClick={() => console.log('Card clicked')}
        >
            <CardHeader>
                <CardTitle>github.com</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-body-medium text-on-surface-variant">8 underscores</p>
                <p className="text-body-small text-on-surface-variant mt-1">Code Repository</p>
            </CardContent>
        </Card>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Hover to see elevation change (shadow-elevation-1 → shadow-elevation-2)',
            },
        },
    },
};

/**
 * Card with all sections (header, content, footer)
 */
export const WithFooter: Story = {
    render: () => (
        <Card className="w-[320px]" elevated>
            <CardHeader>
                <CardTitle>medium.com</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-body-medium text-on-surface-variant">12 underscores</p>
                <p className="text-body-small text-on-surface-variant mt-1">Articles & Essays</p>
            </CardContent>
            <CardFooter className="flex justify-between items-center">
                <button className="text-label-large text-primary">Export</button>
                <button className="text-label-large text-error">Clear All</button>
            </CardFooter>
        </Card>
    ),
};

/**
 * Multiple cards showing Collections grid layout
 */
export const CollectionsGrid: Story = {
    render: () => (
        <div className="grid grid-cols-2 gap-4 p-4">
            <Card interactive elevated className="w-full">
                <CardHeader>
                    <CardTitle>dribbble.com</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-body-medium text-on-surface-variant">3 underscores</p>
                </CardContent>
            </Card>

            <Card interactive elevated className="w-full">
                <CardHeader>
                    <CardTitle>github.com</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-body-medium text-on-surface-variant">8 underscores</p>
                </CardContent>
            </Card>

            <Card interactive elevated className="w-full">
                <CardHeader>
                    <CardTitle>medium.com</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-body-medium text-on-surface-variant">12 underscores</p>
                </CardContent>
            </Card>

            <Card interactive elevated className="w-full">
                <CardHeader>
                    <CardTitle>stackoverflow.com</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-body-medium text-on-surface-variant">5 underscores</p>
                </CardContent>
            </Card>
        </div>
    ),
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                story: 'Matches Collections view 2-d grid layout from design mockup',
            },
        },
    },
};
