// @ts-nocheck — fixture for the check-legacy-ds.sh harness (never compiled)
// Fixture for category 14: MD3 deps
// Expected violation: material-color-utilities
import { themeFromSourceColor } from '@material/material-color-utilities';
export interface MD3Color {
  main: string;
}
export class DynamicColorService {}
export const x = themeFromSourceColor;
