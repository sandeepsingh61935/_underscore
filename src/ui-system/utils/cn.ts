import { type ClassValue, clsx } from 'clsx';

/** Join class names (no Tailwind merging: conflicting classes resolve by CSS cascade order). */
export function cn(...inputs: ClassValue[]) {
  return clsx(...inputs);
}
