import { describe, it, expect } from 'vitest';

import {
  MessageSchema,
  MessageTargetSchema,
  MessageResponseSchema,
  validateMessage,
  validateMessageTarget,
  createSuccessResponse,
  createErrorResponse,
} from '@/shared/schemas/message-schemas';

describe('Message Schemas', () => {
  describe('MessageTargetSchema', () => {
    it('should validate "background" as valid target', () => {
      const result = MessageTargetSchema.safeParse('background');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('background');
      }
    });

    it('should validate "content" as valid target', () => {
      const result = MessageTargetSchema.safeParse('content');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('content');
      }
    });

    it('should validate "popup" as valid target', () => {
      const result = MessageTargetSchema.safeParse('popup');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('popup');
      }
    });

    it('should reject invalid target', () => {
      const result = MessageTargetSchema.safeParse('invalid');
      expect(result.success).toBe(false);
    });
  });

  describe('MessageSchema', () => {
    it('should validate complete valid message', () => {
      const message = {
        type: 'GET_HIGHLIGHTS',
        payload: { url: 'https://example.com' },
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: Date.now(),
      };

      const result = MessageSchema.safeParse(message);
      expect(result.success).toBe(true);
    });

    it('should validate message without optional requestId', () => {
      const message = {
        type: 'MODE_CHANGE',
        payload: { mode: 'vault' },
        timestamp: Date.now(),
      };

      const result = MessageSchema.safeParse(message);
      expect(result.success).toBe(true);
    });

    it('should reject message with empty type', () => {
      const message = {
        type: '',
        payload: {},
        timestamp: Date.now(),
      };

      const result = MessageSchema.safeParse(message);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]!.message).toContain('cannot be empty');
      }
    });

    it('should reject message with missing type', () => {
      const message = {
        payload: {},
        timestamp: Date.now(),
      };

      const result = MessageSchema.safeParse(message);
      expect(result.success).toBe(false);
    });

    it('should reject message with invalid UUID', () => {
      const message = {
        type: 'TEST',
        payload: {},
        requestId: 'not-a-uuid',
        timestamp: Date.now(),
      };

      const result = MessageSchema.safeParse(message);
      expect(result.success).toBe(false);
    });

    it('should reject message with negative timestamp', () => {
      const message = {
        type: 'TEST',
        payload: {},
        timestamp: -1,
      };

      const result = MessageSchema.safeParse(message);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]!.message).toContain('positive');
      }
    });

    it('should reject message with zero timestamp', () => {
      const message = {
        type: 'TEST',
        payload: {},
        timestamp: 0,
      };

      const result = MessageSchema.safeParse(message);
      expect(result.success).toBe(false);
    });

    it('should accept any payload type (unknown)', () => {
      const messages = [
        { type: 'A', payload: 'string', timestamp: 1 },
        { type: 'B', payload: 123, timestamp: 1 },
        { type: 'C', payload: { nested: 'object' }, timestamp: 1 },
        { type: 'D', payload: [1, 2, 3], timestamp: 1 },
        { type: 'E', payload: null, timestamp: 1 },
      ];

      messages.forEach((msg) => {
        const result = MessageSchema.safeParse(msg);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('MessageResponseSchema', () => {
    it('should validate success response with data', () => {
      const response = {
        success: true,
        data: { count: 5 },
      };

      const result = MessageResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should validate error response with message', () => {
      const response = {
        success: false,
        error: 'Not found',
      };

      const result = MessageResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should validate error response with code', () => {
      const response = {
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
      };

      const result = MessageResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should reject response without success field', () => {
      const response = {
        data: {},
      };

      const result = MessageResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });

    it('should accept success response with undefined data (Zod unknown allows it)', () => {
      const response = {
        success: true,
      };

      const result = MessageResponseSchema.safeParse(response);
      // Note: Zod z.unknown() accepts undefined, this is valid
      expect(result.success).toBe(true);
    });

    it('should reject error response without error message', () => {
      const response = {
        success: false,
      };

      const result = MessageResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });
  });

  describe('Helper Functions', () => {
    describe('validateMessage', () => {
      it('should return typed message for valid input', () => {
        const input = {
          type: 'TEST',
          payload: { data: 'value' },
          timestamp: Date.now(),
        };

        const result = validateMessage(input);
        expect(result.type).toBe('TEST');
        expect(result.payload).toEqual({ data: 'value' });
      });

      it('should throw ZodError for invalid message', () => {
        const input = {
          type: '',
          payload: {},
          timestamp: -1,
        };

        expect(() => validateMessage(input)).toThrow();
      });
    });

    describe('validateMessageTarget', () => {
      it('should return typed target for valid input', () => {
        const result = validateMessageTarget('background');
        expect(result).toBe('background');
      });

      it('should throw ZodError for invalid target', () => {
        expect(() => validateMessageTarget('invalid')).toThrow();
      });
    });

    describe('createSuccessResponse', () => {
      it('should create success response with data', () => {
        const response = createSuccessResponse({ count: 10 });
        expect(response.success).toBe(true);
        if (response.success) {
          expect(response.data).toEqual({ count: 10 });
        }
      });
    });

    describe('createErrorResponse', () => {
      it('should create error response without code', () => {
        const response = createErrorResponse('Something failed');
        expect(response.success).toBe(false);
        if (!response.success) {
          expect(response.error).toBe('Something failed');
          expect(response.code).toBeUndefined();
        }
      });

      it('should create error response with code', () => {
        const response = createErrorResponse('Validation error', 'VAL_001');
        expect(response.success).toBe(false);
        if (!response.success) {
          expect(response.error).toBe('Validation error');
          expect(response.code).toBe('VAL_001');
        }
      });
    });
  });
});
