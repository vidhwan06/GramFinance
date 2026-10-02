import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * The Stitch type scale (`text-label-sm`, `text-body-md`, `text-headline-xl` …)
 * would otherwise fall into tailwind-merge's catch-all `text-color` group, so
 * `cn('text-body-md', 'text-on-surface')` would silently drop the font size.
 * Registering them under `font-size` keeps both halves of the merge.
 */
const STITCH_TEXT_SIZES = [
  'label-sm',
  'label-md',
  'label-lg',
  'body-sm',
  'body-md',
  'body-lg',
  'title-md',
  'title-lg',
  'headline-sm',
  'headline-md',
  'headline-lg',
  'headline-lg-mobile',
  'headline-xl',
  'headline-xl-mobile',
] as const;

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: [...STITCH_TEXT_SIZES] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
