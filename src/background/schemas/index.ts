/**
 * @file index.ts
 * @description Schema registry - central export point for all schemas
 */

// Highlight schemas
export {
  HighlightDataSchemaV2,
  HighlightDataSchema,
  HighlightEventSchema,
  SerializedRangeSchema,
  ColorRoleSchema,
  type HighlightDataV2,
  type HighlightData,
  type HighlightEvent,
  type SerializedRange,
  type ColorRole,
} from './highlight-schema';

// Validation utilities
export {
  validate,
  validateSafe,
  validateArray,
  isValid,
  ValidationError,
} from '../utils/validation';
