import { describe, it, expect } from 'vitest';

import {
  MessageSchema,
  MessageTargetSchema,
  MessageResponseSchema,
  validateMessage,
  validateMessageTarget,
  createSuccessResponse,
  createErrorResponse,
  GROUPS_LIST,
  GROUP_GET,
  GROUP_MEMBERSHIP_FOR_URL,
  GROUP_MUTATE,
  GROUP_OPEN_IN_BROWSER,
  EXTENSION_GET_BROWSER_TAB_GROUPS,
  EXTENSION_FOCUS_TAB_GROUP,
  BrowserTabGroupSummarySchema,
  ExtensionGetBrowserTabGroupsPayloadSchema,
  ExtensionGetBrowserTabGroupsResponseSchema,
  ExtensionFocusTabGroupPayloadSchema,
  ExtensionFocusTabGroupResponseSchema,
  GroupsListPayloadSchema,
  GroupGetPayloadSchema,
  GroupMembershipForUrlPayloadSchema,
  GroupMutatePayloadSchema,
  GroupOpenInBrowserPayloadSchema,
  GroupCapErrorInfoSchema,
  GroupsListResponseSchema,
  GroupGetResponseSchema,
  GroupMembershipResponseSchema,
  GroupMutateResponseSchema,
  GroupOpenInBrowserResponseSchema,
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
        payload: { mode: 'cloud' },
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

    it('should reject message with missing payload', () => {
      const message = {
        type: 'LOGOUT',
        timestamp: Date.now(),
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

    it('should preserve GroupCapError scope/limit on the error variant', () => {
      const response = {
        success: false,
        error: 'Group limit reached (200 groups per user)',
        code: 'GROUP_CAP_EXCEEDED',
        scope: 'groups',
        limit: 200,
      };

      const result = MessageResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
      if (result.success && !result.data.success) {
        expect(result.data.scope).toBe('groups');
        expect(result.data.limit).toBe(200);
      }
    });

    it('should reject out-of-union scope on the error variant', () => {
      const response = {
        success: false,
        error: 'Group limit reached',
        code: 'GROUP_CAP_EXCEEDED',
        scope: 'other',
        limit: 1,
      };

      expect(MessageResponseSchema.safeParse(response).success).toBe(false);
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

  describe('Group IPC channels', () => {
    it('should expose the four group message types', () => {
      expect(GROUPS_LIST).toBe('GROUPS_LIST');
      expect(GROUP_GET).toBe('GROUP_GET');
      expect(GROUP_MEMBERSHIP_FOR_URL).toBe('GROUP_MEMBERSHIP_FOR_URL');
      expect(GROUP_MUTATE).toBe('GROUP_MUTATE');
    });

    it('should validate list/get/membership payloads', () => {
      expect(GroupsListPayloadSchema.safeParse({}).success).toBe(true);
      expect(GroupGetPayloadSchema.safeParse({ id: 'g-1' }).success).toBe(true);
      expect(GroupGetPayloadSchema.safeParse({}).success).toBe(false);
      expect(GroupGetPayloadSchema.safeParse({ id: '' }).success).toBe(false);
      expect(
        GroupMembershipForUrlPayloadSchema.safeParse({ url: 'https://example.com/a' })
          .success
      ).toBe(true);
      expect(GroupMembershipForUrlPayloadSchema.safeParse({}).success).toBe(false);
    });

    it('should validate every GroupService command in the discriminated payload', () => {
      const valid = [
        { command: 'createGroup', name: 'Reading' },
        { command: 'createGroup', name: 'Reading', color: 'blue' },
        { command: 'renameGroup', id: 'g-1', name: 'New' },
        { command: 'recolorGroup', id: 'g-1', color: 'red' },
        { command: 'deleteGroup', id: 'g-1' },
        { command: 'restoreGroup', id: 'g-1' },
        { command: 'moveGroup', id: 'g-1', to: 'top' },
        { command: 'addPage', groupId: 'g-1', url: 'https://example.com/a' },
        {
          command: 'addPage',
          groupId: 'g-1',
          url: 'https://example.com/a',
          title: 'A',
          faviconUrl: null,
        },
        { command: 'addDomain', groupId: 'g-1', hostname: 'example.com' },
        {
          command: 'addDomain',
          groupId: 'g-1',
          hostname: 'example.com',
          includeSubdomains: true,
        },
        { command: 'removeItem', groupId: 'g-1', itemId: 'i-1' },
        { command: 'restoreItem', groupId: 'g-1', itemId: 'i-1' },
        { command: 'moveItem', groupId: 'g-1', itemId: 'i-1', to: 'down' },
      ];
      for (const payload of valid) {
        expect(
          GroupMutatePayloadSchema.safeParse(payload).success,
          JSON.stringify(payload)
        ).toBe(true);
      }
    });

    it('should reject unknown commands and bad enums', () => {
      expect(GroupMutatePayloadSchema.safeParse({ command: 'nope' }).success).toBe(
        false
      );
      expect(
        GroupMutatePayloadSchema.safeParse({
          command: 'moveGroup',
          id: 'g-1',
          to: 'sideways',
        }).success
      ).toBe(false);
      expect(
        GroupMutatePayloadSchema.safeParse({
          command: 'recolorGroup',
          id: 'g-1',
          color: 'magenta',
        }).success
      ).toBe(false);
      expect(
        GroupMutatePayloadSchema.safeParse({ command: 'deleteGroup' }).success
      ).toBe(false);
    });

    it('should validate cap error info and response envelopes', () => {
      expect(
        GroupCapErrorInfoSchema.safeParse({ scope: 'groups', limit: 200 }).success
      ).toBe(true);
      expect(
        GroupCapErrorInfoSchema.safeParse({ scope: 'items', limit: 500 }).success
      ).toBe(true);
      expect(
        GroupCapErrorInfoSchema.safeParse({ scope: 'other', limit: 1 }).success
      ).toBe(false);
      expect(GroupsListResponseSchema.safeParse({ groups: [], items: [] }).success).toBe(
        true
      );
      expect(GroupGetResponseSchema.safeParse({ group: undefined }).success).toBe(false);
      expect(
        GroupMembershipResponseSchema.safeParse({ memberships: [] }).success
      ).toBe(true);
      expect(GroupMutateResponseSchema.safeParse({}).success).toBe(true);
    });

    it('should carry group payloads in the { type, payload, timestamp } envelope', () => {
      const message = {
        type: GROUP_MUTATE,
        payload: { command: 'createGroup', name: 'Reading' },
        timestamp: Date.now(),
      };
      const result = MessageSchema.safeParse(message);
      expect(result.success).toBe(true);
      if (result.success) {
        const inner = GroupMutatePayloadSchema.safeParse(result.data.payload);
        expect(inner.success).toBe(true);
      }
    });

    it('should validate GROUP_OPEN_IN_BROWSER payload and response schemas', () => {
      expect(GROUP_OPEN_IN_BROWSER).toBe('GROUP_OPEN_IN_BROWSER');
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      expect(
        GroupOpenInBrowserPayloadSchema.safeParse({ groupId: validUuid }).success
      ).toBe(true);
      expect(
        GroupOpenInBrowserPayloadSchema.safeParse({ groupId: validUuid, force: true }).success
      ).toBe(true);
      expect(
        GroupOpenInBrowserPayloadSchema.safeParse({ groupId: 'not-a-uuid' }).success
      ).toBe(false);

      expect(
        GroupOpenInBrowserResponseSchema.safeParse({
          ok: true,
          browserGroupId: 12,
          tabCount: 5,
        }).success
      ).toBe(true);
      expect(
        GroupOpenInBrowserResponseSchema.safeParse({
          ok: false,
          needsConfirm: true,
          tabCount: 18,
        }).success
      ).toBe(true);
      expect(
        GroupOpenInBrowserResponseSchema.safeParse({
          ok: false,
          error: 'Group not found',
        }).success
      ).toBe(true);
      expect(
        GroupOpenInBrowserResponseSchema.safeParse({}).success
      ).toBe(false);
    });

    it('should validate EXTENSION_GET_BROWSER_TAB_GROUPS and EXTENSION_FOCUS_TAB_GROUP schemas', () => {
      expect(EXTENSION_GET_BROWSER_TAB_GROUPS).toBe('EXTENSION_GET_BROWSER_TAB_GROUPS');
      expect(EXTENSION_FOCUS_TAB_GROUP).toBe('EXTENSION_FOCUS_TAB_GROUP');

      const validSummary = {
        id: 101,
        title: 'Work Project',
        color: 'blue' as const,
        tabCount: 3,
        validUrls: ['https://example.com/1', 'https://example.com/2'],
        skippedCount: 1,
      };
      expect(BrowserTabGroupSummarySchema.safeParse(validSummary).success).toBe(true);
      expect(
        BrowserTabGroupSummarySchema.safeParse({ ...validSummary, color: 'invalid-color' }).success
      ).toBe(false);

      expect(ExtensionGetBrowserTabGroupsPayloadSchema.safeParse({}).success).toBe(true);
      expect(
        ExtensionGetBrowserTabGroupsResponseSchema.safeParse({
          ok: true,
          groups: [validSummary],
        }).success
      ).toBe(true);

      expect(
        ExtensionFocusTabGroupPayloadSchema.safeParse({ browserGroupId: 101 }).success
      ).toBe(true);
      expect(
        ExtensionFocusTabGroupPayloadSchema.safeParse({ browserGroupId: 'not-a-number' }).success
      ).toBe(false);

      expect(
        ExtensionFocusTabGroupResponseSchema.safeParse({ ok: true }).success
      ).toBe(true);
      expect(
        ExtensionFocusTabGroupResponseSchema.safeParse({ ok: false, error: 'Group not found' }).success
      ).toBe(true);
    });
  });
});
