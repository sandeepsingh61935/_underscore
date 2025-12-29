/**
 * @file annotation.ts
 * @description Type definitions for text annotations (underscore, highlight, box)
 */

import type { SerializedRange } from '@/shared/schemas/highlight-schema';

/**
 * Annotation display modes
 */
export type AnnotationType = 'underscore' | 'highlight' | 'box';

/**
 * Base annotation structure
 */
export interface Annotation {
  id: string;
  type: AnnotationType;
  text: string;
  color: string;
  range: SerializedRange;
  element: HTMLElement;
  createdAt: Date;
}

/**
 * Annotation with range for commands/storage
 */
export interface AnnotationWithRange extends Annotation {
  range: SerializedRange;
}

/**
 * Material Design 3 color with contrast
 */
export interface MD3Color {
  main: string; // Primary color
  on: string; // Text color on primary
  rgb: string; // RGB values for opacity
}

/**
 * Material Design 3 color palette
 */
export const MD3_COLORS: Record<string, MD3Color> = {
  yellow: {
    main: '#FDD835',
    on: '#1A1A1A',
    rgb: '253, 216, 53',
  },
  blue: {
    main: '#42A5F5',
    on: '#001D35',
    rgb: '66, 165, 245',
  },
  green: {
    main: '#66BB6A',
    on: '#00390A',
    rgb: '102, 187, 106',
  },
  pink: {
    main: '#EC407A',
    on: '#3D001C',
    rgb: '236, 64, 122',
  },
  orange: {
    main: '#FFA726',
    on: '#2D1600',
    rgb: '255, 167, 38',
  },
  purple: {
    main: '#AB47BC',
    on: '#2A0038',
    rgb: '171, 71, 188',
  },
};
