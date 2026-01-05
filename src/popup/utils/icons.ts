/**
 * @file icons.ts
 * @description Minimalist SVG icons for Auth UI (Lucide style)
 * Using inline SVG for minimal bundle size
 */

export interface IconProps {
    size?: number;
    strokeWidth?: number;
    className?: string;
}

const DEFAULT_SIZE = 20;
const DEFAULT_STROKE = 2;

/**
 * Creates SVG element with common attributes
 */
function createSVG(
    pathData: string,
    { size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE, className = '' }: IconProps = {}
): string {
    return `
    <svg 
      width="${size}" 
      height="${size}" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      stroke-width="${strokeWidth}" 
      stroke-linecap="round" 
      stroke-linejoin="round"
      class="${className}"
      xmlns="http://www.w3.org/2000/svg"
    >
      ${pathData}
    </svg>
  `.trim();
}

/**
 * Theme Icons
 */
export const SunIcon = (props?: IconProps): string =>
    createSVG(
        `<circle cx="12" cy="12" r="5"/>
     <line x1="12" y1="1" x2="12" y2="3"/>
     <line x1="12" y1="21" x2="12" y2="23"/>
     <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
     <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
     <line x1="1" y1="12" x2="3" y2="12"/>
     <line x1="21" y1="12" x2="23" y2="12"/>
     <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
     <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`,
        props
    );

export const MoonIcon = (props?: IconProps): string =>
    createSVG(
        `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`,
        props
    );

export const MonitorIcon = (props?: IconProps): string =>
    createSVG(
        `<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
     <line x1="8" y1="21" x2="16" y2="21"/>
     <line x1="12" y1="17" x2="12" y2="21"/>`,
        props
    );

/**
 * Provider Icons (Minimalist, no brand colors)
 */
export const GoogleIcon = (props?: IconProps): string =>
    createSVG(
        `<circle cx="12" cy="12" r="10"/>
     <path d="M12 6v6l4 2"/>`,
        props
    );

export const AppleIcon = (props?: IconProps): string =>
    createSVG(
        `<path d="M12 2.69l-1.63 2.58A3.5 3.5 0 0 0 12 12a3.5 3.5 0 0 0 1.63-6.73L12 2.69z"/>
     <path d="M15.5 8.5C15.5 11.5 13 14 10 16c-3 2-5.5 4.5-5.5 6 0 1.5 1.5 2 3 2h10c1.5 0 3-.5 3-2 0-1.5-2.5-4-5.5-6-3-2-5.5-4.5-5.5-7.5"/>`,
        props
    );

export const XIcon = (props?: IconProps): string =>
    createSVG(
        `<line x1="18" y1="6" x2="6" y2="18"/>
     <line x1="6" y1="6" x2="18" y2="18"/>`,
        props
    );

export const FacebookIcon = (props?: IconProps): string =>
    createSVG(
        `<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>`,
        props
    );

/**
 * Helper to inject icon into DOM element
 */
export function setIcon(element: HTMLElement, iconSVG: string): void {
    element.innerHTML = iconSVG;
}
