/**
 * @file text-quote-finder.ts
 * @description Re-export canonical TextQuoteFinder from shared utils.
 * This file exists for backwards compatibility with `src/services/cloud-mode-service.ts`
 * and `src/content/utils/range-converter.ts` imports.
 */

export {
  TextQuoteFinder,
  findTextQuoteSelector,
} from '@/shared/utils/text-quote-finder';
