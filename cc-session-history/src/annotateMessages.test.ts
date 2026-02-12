import { describe, it, expect } from 'vitest';
import { annotateMessages } from './annotateMessages.ts';
import type { ChatMessage } from './types.ts';

describe('annotateMessages', () => {
  describe('internalMessageType annotation', () => {
    it('should annotate PreToolUse hook messages', () => {
      const messages: ChatMessage[] = [
        {
          type: 'system',
          message: {
            role: 'user',
            content: 'PreToolUse:Read - System hook activated',
          },
          uuid: 'test-uuid-1',
          timestamp: '2025-01-15T10:00:00.000Z',
          sessionId: 'test-session',
          parentUuid: null,
          isSidechain: false,
          userType: 'external',
          cwd: '/test',
          version: '2.0.0',
        },
      ];

      annotateMessages(messages);

      expect(messages[0].internalMessageType).toBe('hook');
    });

    it('should annotate different PreToolUse patterns', () => {
      const testCases = [
        'PreToolUse:Edit',
        'PreToolUse:Write',
        'PreToolUse:Bash',
        'PreToolUse:Read - with additional text',
      ];

      testCases.forEach(content => {
        const messages: ChatMessage[] = [
          {
            type: 'system',
            message: {
              role: 'user',
              content,
            },
            uuid: 'test-uuid',
            timestamp: '2025-01-15T10:00:00.000Z',
            sessionId: 'test-session',
            parentUuid: null,
            isSidechain: false,
            userType: 'external',
            cwd: '/test',
            version: '2.0.0',
          },
        ];

        annotateMessages(messages);

        expect(messages[0].internalMessageType).toBe('hook');
      });
    });

    it('should annotate /clear command messages', () => {
      const messages: ChatMessage[] = [
        {
          type: 'system',
          message: {
            role: 'user',
            content: '<command-name>/clear</command-name><local-command-stdout>Cleared</local-command-stdout>',
          },
          uuid: 'test-uuid-1',
          timestamp: '2025-01-15T10:00:00.000Z',
          sessionId: 'test-session',
          parentUuid: null,
          isSidechain: false,
          userType: 'external',
          cwd: '/test',
          version: '2.0.0',
        },
      ];

      annotateMessages(messages);

      expect(messages[0].internalMessageType).toBe('terminal_control');
    });

    it('should annotate command stdout messages', () => {
      const messages: ChatMessage[] = [
        {
          type: 'system',
          message: {
            role: 'user',
            content: '<local-command-stdout>Command output here</local-command-stdout>',
          },
          uuid: 'test-uuid-1',
          timestamp: '2025-01-15T10:00:00.000Z',
          sessionId: 'test-session',
          parentUuid: null,
          isSidechain: false,
          userType: 'external',
          cwd: '/test',
          version: '2.0.0',
        },
      ];

      annotateMessages(messages);

      expect(messages[0].internalMessageType).toBe('terminal_control');
    });

    it('should not annotate regular user messages', () => {
      const messages: ChatMessage[] = [
        {
          type: 'user',
          message: {
            role: 'user',
            content: 'This is a regular user message',
          },
          uuid: 'test-uuid-1',
          timestamp: '2025-01-15T10:00:00.000Z',
          sessionId: 'test-session',
          parentUuid: null,
          isSidechain: false,
          userType: 'external',
          cwd: '/test',
          version: '2.0.0',
        },
      ];

      annotateMessages(messages);

      expect(messages[0].internalMessageType).toBeUndefined();
    });

    it('should not annotate assistant messages', () => {
      const messages: ChatMessage[] = [
        {
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: 'This is an assistant response' }],
          },
          uuid: 'test-uuid-1',
          timestamp: '2025-01-15T10:00:00.000Z',
          sessionId: 'test-session',
          parentUuid: null,
          isSidechain: false,
          userType: 'external',
          cwd: '/test',
          version: '2.0.0',
        },
      ];

      annotateMessages(messages);

      expect(messages[0].internalMessageType).toBeUndefined();
    });

    it('should handle messages with non-string content', () => {
      const messages: ChatMessage[] = [
        {
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [
              { type: 'text', text: 'Some text' },
              { type: 'tool_use', id: 'tool-1', name: 'Read', input: {} },
            ],
          },
          uuid: 'test-uuid-1',
          timestamp: '2025-01-15T10:00:00.000Z',
          sessionId: 'test-session',
          parentUuid: null,
          isSidechain: false,
          userType: 'external',
          cwd: '/test',
          version: '2.0.0',
        },
      ];

      // Should not throw error
      expect(() => annotateMessages(messages)).not.toThrow();
      expect(messages[0].internalMessageType).toBeUndefined();
    });

    it('should handle messages without message property', () => {
      const messages: ChatMessage[] = [
        {
          type: 'user',
          uuid: 'test-uuid-1',
          timestamp: '2025-01-15T10:00:00.000Z',
          sessionId: 'test-session',
          parentUuid: null,
          isSidechain: false,
          userType: 'external',
          cwd: '/test',
          version: '2.0.0',
        },
      ];

      // Should not throw error
      expect(() => annotateMessages(messages)).not.toThrow();
      expect(messages[0].internalMessageType).toBeUndefined();
    });

    it('should handle empty messages array', () => {
      const messages: ChatMessage[] = [];

      expect(() => annotateMessages(messages)).not.toThrow();
      expect(messages).toHaveLength(0);
    });

    it('should annotate multiple messages correctly', () => {
      const messages: ChatMessage[] = [
        {
          type: 'user',
          message: {
            role: 'user',
            content: 'Regular message',
          },
          uuid: 'test-uuid-1',
          timestamp: '2025-01-15T10:00:00.000Z',
          sessionId: 'test-session',
          parentUuid: null,
          isSidechain: false,
          userType: 'external',
          cwd: '/test',
          version: '2.0.0',
        },
        {
          type: 'system',
          message: {
            role: 'user',
            content: 'PreToolUse:Edit',
          },
          uuid: 'test-uuid-2',
          timestamp: '2025-01-15T10:00:01.000Z',
          sessionId: 'test-session',
          parentUuid: 'test-uuid-1',
          isSidechain: false,
          userType: 'external',
          cwd: '/test',
          version: '2.0.0',
        },
        {
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: 'Response' }],
          },
          uuid: 'test-uuid-3',
          timestamp: '2025-01-15T10:00:02.000Z',
          sessionId: 'test-session',
          parentUuid: 'test-uuid-2',
          isSidechain: false,
          userType: 'external',
          cwd: '/test',
          version: '2.0.0',
        },
        {
          type: 'system',
          message: {
            role: 'user',
            content: '<local-command-stdout>Output</local-command-stdout>',
          },
          uuid: 'test-uuid-4',
          timestamp: '2025-01-15T10:00:03.000Z',
          sessionId: 'test-session',
          parentUuid: 'test-uuid-3',
          isSidechain: false,
          userType: 'external',
          cwd: '/test',
          version: '2.0.0',
        },
      ];

      annotateMessages(messages);

      expect(messages[0].internalMessageType).toBeUndefined();
      expect(messages[1].internalMessageType).toBe('hook');
      expect(messages[2].internalMessageType).toBeUndefined();
      expect(messages[3].internalMessageType).toBe('terminal_control');
    });

    it('should mutate the original array', () => {
      const messages: ChatMessage[] = [
        {
          type: 'system',
          message: {
            role: 'user',
            content: 'PreToolUse:Read',
          },
          uuid: 'test-uuid-1',
          timestamp: '2025-01-15T10:00:00.000Z',
          sessionId: 'test-session',
          parentUuid: null,
          isSidechain: false,
          userType: 'external',
          cwd: '/test',
          version: '2.0.0',
        },
      ];

      const originalReference = messages[0];
      annotateMessages(messages);

      // Should modify the same object reference
      expect(originalReference.internalMessageType).toBe('hook');
    });

    it('should only annotate system messages for hooks', () => {
      const messages: ChatMessage[] = [
        {
          type: 'user',
          message: {
            role: 'user',
            content: 'PreToolUse:Read', // Contains hook pattern but wrong type
          },
          uuid: 'test-uuid-1',
          timestamp: '2025-01-15T10:00:00.000Z',
          sessionId: 'test-session',
          parentUuid: null,
          isSidechain: false,
          userType: 'external',
          cwd: '/test',
          version: '2.0.0',
        },
      ];

      annotateMessages(messages);

      // Should not annotate because it's not a system message
      expect(messages[0].internalMessageType).toBeUndefined();
    });
  });

  describe('permissionResult annotation', () => {
    it('should annotate permission rejection messages', () => {
      const messages: ChatMessage[] = [
        {
          type: 'user',
          message: {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: 'toolu_123',
                content: "The user doesn't want to proceed with this tool use. The tool use was rejected (eg. if it was a file edit, the new_string was NOT written to the file). STOP what you are doing and wait for the user to tell you how to proceed.",
                is_error: true,
              },
            ],
          },
          uuid: 'test-uuid-1',
          timestamp: '2025-01-15T10:00:00.000Z',
          sessionId: 'test-session',
          parentUuid: null,
          isSidechain: false,
          userType: 'external',
          cwd: '/test',
          version: '2.0.0',
        },
      ];

      annotateMessages(messages);

      expect(messages[0].permissionResult).toBe('rejected');
    });

    it('should not annotate successful tool results', () => {
      const messages: ChatMessage[] = [
        {
          type: 'user',
          message: {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: 'toolu_123',
                content: 'File contents here...',
                is_error: false,
              },
            ],
          },
          uuid: 'test-uuid-1',
          timestamp: '2025-01-15T10:00:00.000Z',
          sessionId: 'test-session',
          parentUuid: null,
          isSidechain: false,
          userType: 'external',
          cwd: '/test',
          version: '2.0.0',
        },
      ];

      annotateMessages(messages);

      expect(messages[0].permissionResult).toBeUndefined();
    });

    it('should not annotate tool errors that are not permission rejections', () => {
      const messages: ChatMessage[] = [
        {
          type: 'user',
          message: {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: 'toolu_123',
                content: 'File not found: /some/path',
                is_error: true,
              },
            ],
          },
          uuid: 'test-uuid-1',
          timestamp: '2025-01-15T10:00:00.000Z',
          sessionId: 'test-session',
          parentUuid: null,
          isSidechain: false,
          userType: 'external',
          cwd: '/test',
          version: '2.0.0',
        },
      ];

      annotateMessages(messages);

      expect(messages[0].permissionResult).toBeUndefined();
    });

    it('should not annotate assistant messages', () => {
      const messages: ChatMessage[] = [
        {
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [
              {
                type: 'tool_use',
                id: 'toolu_123',
                name: 'Edit',
                input: { file_path: '/test' },
              },
            ],
          },
          uuid: 'test-uuid-1',
          timestamp: '2025-01-15T10:00:00.000Z',
          sessionId: 'test-session',
          parentUuid: null,
          isSidechain: false,
          userType: 'external',
          cwd: '/test',
          version: '2.0.0',
        },
      ];

      annotateMessages(messages);

      expect(messages[0].permissionResult).toBeUndefined();
    });

    it('should handle messages with string content', () => {
      const messages: ChatMessage[] = [
        {
          type: 'user',
          message: {
            role: 'user',
            content: 'This is a regular user message',
          },
          uuid: 'test-uuid-1',
          timestamp: '2025-01-15T10:00:00.000Z',
          sessionId: 'test-session',
          parentUuid: null,
          isSidechain: false,
          userType: 'external',
          cwd: '/test',
          version: '2.0.0',
        },
      ];

      annotateMessages(messages);

      expect(messages[0].permissionResult).toBeUndefined();
    });

    it('should handle multiple tool results in one message', () => {
      const messages: ChatMessage[] = [
        {
          type: 'user',
          message: {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: 'toolu_1',
                content: 'Success',
                is_error: false,
              },
              {
                type: 'tool_result',
                tool_use_id: 'toolu_2',
                content: "The user doesn't want to proceed with this tool use. The tool use was rejected",
                is_error: true,
              },
            ],
          },
          uuid: 'test-uuid-1',
          timestamp: '2025-01-15T10:00:00.000Z',
          sessionId: 'test-session',
          parentUuid: null,
          isSidechain: false,
          userType: 'external',
          cwd: '/test',
          version: '2.0.0',
        },
      ];

      annotateMessages(messages);

      expect(messages[0].permissionResult).toBe('rejected');
    });
  });
});
