import { describe, it, expect } from 'vitest';
import { annotateMessages, toolNeedsPermission } from './annotateMessages.ts';
import type { ChatMessage } from './types.ts';

function makeMessage(overrides: Partial<ChatMessage> & { permissionMode?: string }): ChatMessage {
  return {
    type: 'user',
    uuid: 'test-uuid',
    timestamp: '2025-01-15T10:00:00.000Z',
    sessionId: 'test-session',
    parentUuid: null,
    isSidechain: false,
    userType: 'external',
    cwd: '/test',
    version: '2.0.0',
    ...overrides,
  } as ChatMessage;
}

describe('annotateMessages', () => {
  describe('internalMessageType annotation', () => {
    it('should annotate PreToolUse hook messages', () => {
      const messages = [makeMessage({
        type: 'system',
        message: { role: 'user', content: 'PreToolUse:Read - System hook activated' },
      })];

      annotateMessages(messages);
      expect(messages[0].internalMessageType).toBe('hook');
    });

    it('should annotate different PreToolUse patterns', () => {
      for (const content of ['PreToolUse:Edit', 'PreToolUse:Write', 'PreToolUse:Bash', 'PreToolUse:Read - with additional text']) {
        const messages = [makeMessage({
          type: 'system',
          message: { role: 'user', content },
        })];
        annotateMessages(messages);
        expect(messages[0].internalMessageType).toBe('hook');
      }
    });

    it('should annotate /clear command messages', () => {
      const messages = [makeMessage({
        type: 'system',
        message: { role: 'user', content: '<command-name>/clear</command-name><local-command-stdout>Cleared</local-command-stdout>' },
      })];
      annotateMessages(messages);
      expect(messages[0].internalMessageType).toBe('terminal_control');
    });

    it('should annotate command stdout messages', () => {
      const messages = [makeMessage({
        type: 'system',
        message: { role: 'user', content: '<local-command-stdout>Command output here</local-command-stdout>' },
      })];
      annotateMessages(messages);
      expect(messages[0].internalMessageType).toBe('terminal_control');
    });

    it('should not annotate regular user messages', () => {
      const messages = [makeMessage({
        message: { role: 'user', content: 'This is a regular user message' },
      })];
      annotateMessages(messages);
      expect(messages[0].internalMessageType).toBeUndefined();
    });

    it('should not annotate assistant messages', () => {
      const messages = [makeMessage({
        type: 'assistant',
        message: { role: 'assistant', content: [{ type: 'text', text: 'Response' }] },
      })];
      annotateMessages(messages);
      expect(messages[0].internalMessageType).toBeUndefined();
    });

    it('should handle messages with non-string content', () => {
      const messages = [makeMessage({
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            { type: 'text', text: 'Some text' },
            { type: 'tool_use', id: 'tool-1', name: 'Read', input: {} },
          ],
        },
      })];
      expect(() => annotateMessages(messages)).not.toThrow();
      expect(messages[0].internalMessageType).toBeUndefined();
    });

    it('should handle messages without message property', () => {
      const messages = [makeMessage({ message: undefined })];
      expect(() => annotateMessages(messages)).not.toThrow();
      expect(messages[0].internalMessageType).toBeUndefined();
    });

    it('should handle empty messages array', () => {
      const messages: ChatMessage[] = [];
      expect(() => annotateMessages(messages)).not.toThrow();
      expect(messages).toHaveLength(0);
    });

    it('should annotate multiple messages correctly', () => {
      const messages = [
        makeMessage({ message: { role: 'user', content: 'Regular message' } }),
        makeMessage({
          type: 'system',
          message: { role: 'user', content: 'PreToolUse:Edit' },
          uuid: 'test-uuid-2',
          timestamp: '2025-01-15T10:00:01.000Z',
        }),
        makeMessage({
          type: 'assistant',
          message: { role: 'assistant', content: [{ type: 'text', text: 'Response' }] },
          uuid: 'test-uuid-3',
          timestamp: '2025-01-15T10:00:02.000Z',
        }),
        makeMessage({
          type: 'system',
          message: { role: 'user', content: '<local-command-stdout>Output</local-command-stdout>' },
          uuid: 'test-uuid-4',
          timestamp: '2025-01-15T10:00:03.000Z',
        }),
      ];

      annotateMessages(messages);

      expect(messages[0].internalMessageType).toBeUndefined();
      expect(messages[1].internalMessageType).toBe('hook');
      expect(messages[2].internalMessageType).toBeUndefined();
      expect(messages[3].internalMessageType).toBe('terminal_control');
    });

    it('should only annotate system messages for hooks', () => {
      const messages = [makeMessage({
        type: 'user',
        message: { role: 'user', content: 'PreToolUse:Read' }, // Contains hook pattern but wrong type
      })];
      annotateMessages(messages);
      expect(messages[0].internalMessageType).toBeUndefined();
    });
  });

  describe('permissionResult annotation', () => {
    it('should annotate permission rejection messages', () => {
      const messages = [makeMessage({
        message: {
          role: 'user',
          content: [{
            type: 'tool_result',
            tool_use_id: 'toolu_123',
            content: "The user doesn't want to proceed with this tool use. The tool use was rejected (eg. if it was a file edit, the new_string was NOT written to the file). STOP what you are doing and wait for the user to tell you how to proceed.",
            is_error: true,
          }],
        },
      })];

      annotateMessages(messages);
      expect(messages[0].permissionResult).toBe('rejected');
    });

    it('should annotate approved permission checks for tools that need permission', () => {
      // Set up: user message sets permissionMode, assistant proposes Bash, user approves
      const messages = [
        makeMessage({
          permissionMode: 'acceptEdits',
          message: { role: 'user', content: 'run the tests' },
          uuid: 'user-msg',
          timestamp: '2025-01-15T10:00:00.000Z',
        }),
        makeMessage({
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [{
              type: 'tool_use',
              id: 'toolu_bash_1',
              name: 'Bash',
              input: { command: 'npm test' },
            }],
          },
          uuid: 'asst-msg',
          timestamp: '2025-01-15T10:00:01.000Z',
        }),
        makeMessage({
          type: 'user',
          message: {
            role: 'user',
            content: [{
              type: 'tool_result',
              tool_use_id: 'toolu_bash_1',
              content: 'All tests passed',
              is_error: false,
            }],
          },
          uuid: 'result-msg',
          timestamp: '2025-01-15T10:00:10.000Z',
        }),
      ];

      annotateMessages(messages);
      expect(messages[2].permissionResult).toBe('approved');
    });

    it('should not annotate auto-approved tools (Read, Glob, Grep)', () => {
      const messages = [
        makeMessage({
          permissionMode: 'default',
          message: { role: 'user', content: 'read the file' },
          uuid: 'user-msg',
        }),
        makeMessage({
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [{
              type: 'tool_use',
              id: 'toolu_read_1',
              name: 'Read',
              input: { file_path: '/test/file.ts' },
            }],
          },
          uuid: 'asst-msg',
          timestamp: '2025-01-15T10:00:01.000Z',
        }),
        makeMessage({
          type: 'user',
          message: {
            role: 'user',
            content: [{
              type: 'tool_result',
              tool_use_id: 'toolu_read_1',
              content: 'file contents',
              is_error: false,
            }],
          },
          uuid: 'result-msg',
          timestamp: '2025-01-15T10:00:02.000Z',
        }),
      ];

      annotateMessages(messages);
      expect(messages[2].permissionResult).toBeUndefined();
    });

    it('should not annotate Edit/Write in acceptEdits mode', () => {
      const messages = [
        makeMessage({
          permissionMode: 'acceptEdits',
          message: { role: 'user', content: 'edit the file' },
          uuid: 'user-msg',
        }),
        makeMessage({
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [{
              type: 'tool_use',
              id: 'toolu_edit_1',
              name: 'Edit',
              input: { file_path: '/test/file.ts', old_string: 'a', new_string: 'b' },
            }],
          },
          uuid: 'asst-msg',
          timestamp: '2025-01-15T10:00:01.000Z',
        }),
        makeMessage({
          type: 'user',
          message: {
            role: 'user',
            content: [{
              type: 'tool_result',
              tool_use_id: 'toolu_edit_1',
              content: 'file edited',
              is_error: false,
            }],
          },
          uuid: 'result-msg',
          timestamp: '2025-01-15T10:00:02.000Z',
        }),
      ];

      annotateMessages(messages);
      expect(messages[2].permissionResult).toBeUndefined();
    });

    it('should not annotate tool errors that are not permission rejections', () => {
      const messages = [makeMessage({
        message: {
          role: 'user',
          content: [{
            type: 'tool_result',
            tool_use_id: 'toolu_123',
            content: 'File not found: /some/path',
            is_error: true,
          }],
        },
      })];

      annotateMessages(messages);
      expect(messages[0].permissionResult).toBeUndefined();
    });

    it('should not annotate assistant messages', () => {
      const messages = [makeMessage({
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [{
            type: 'tool_use',
            id: 'toolu_123',
            name: 'Edit',
            input: { file_path: '/test' },
          }],
        },
      })];

      annotateMessages(messages);
      expect(messages[0].permissionResult).toBeUndefined();
    });

    it('should handle messages with string content', () => {
      const messages = [makeMessage({
        message: { role: 'user', content: 'This is a regular user message' },
      })];
      annotateMessages(messages);
      expect(messages[0].permissionResult).toBeUndefined();
    });

    it('should handle multiple tool results where one is rejected', () => {
      // Assistant proposes two tools
      const messages = [
        makeMessage({
          permissionMode: 'default',
          message: { role: 'user', content: 'do stuff' },
          uuid: 'user-msg',
        }),
        makeMessage({
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [
              { type: 'tool_use', id: 'toolu_1', name: 'Bash', input: { command: 'ls' } },
              { type: 'tool_use', id: 'toolu_2', name: 'Bash', input: { command: 'rm -rf /' } },
            ],
          },
          uuid: 'asst-msg',
          timestamp: '2025-01-15T10:00:01.000Z',
        }),
        makeMessage({
          type: 'user',
          message: {
            role: 'user',
            content: [
              { type: 'tool_result', tool_use_id: 'toolu_1', content: 'Success', is_error: false },
              {
                type: 'tool_result', tool_use_id: 'toolu_2',
                content: "The user doesn't want to proceed with this tool use. The tool use was rejected",
                is_error: true,
              },
            ],
          },
          uuid: 'result-msg',
          timestamp: '2025-01-15T10:00:10.000Z',
        }),
      ];

      annotateMessages(messages);
      // Rejection takes priority over approval
      expect(messages[2].permissionResult).toBe('rejected');
    });

    it('should track permissionMode across messages', () => {
      const messages = [
        // First user message sets default mode
        makeMessage({
          permissionMode: 'default',
          message: { role: 'user', content: 'hello' },
          uuid: 'msg-1',
          timestamp: '2025-01-15T10:00:00.000Z',
        }),
        // Second user message changes to acceptEdits
        makeMessage({
          permissionMode: 'acceptEdits',
          message: { role: 'user', content: 'edit stuff' },
          uuid: 'msg-2',
          timestamp: '2025-01-15T10:00:10.000Z',
        }),
        makeMessage({
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [{
              type: 'tool_use',
              id: 'toolu_bash_1',
              name: 'Bash',
              input: { command: 'echo hi' },
            }],
          },
          uuid: 'msg-3',
          timestamp: '2025-01-15T10:00:11.000Z',
        }),
        makeMessage({
          type: 'user',
          message: {
            role: 'user',
            content: [{
              type: 'tool_result',
              tool_use_id: 'toolu_bash_1',
              content: 'hi',
              is_error: false,
            }],
          },
          uuid: 'msg-4',
          timestamp: '2025-01-15T10:00:20.000Z',
        }),
      ];

      annotateMessages(messages);
      // Should use acceptEdits mode (from msg-2), where Bash needs permission
      expect(messages[3].permissionResult).toBe('approved');
      expect(messages[3].permissionMode).toBe('acceptEdits');
    });
  });

  describe('permissionMode propagation', () => {
    it('should propagate permissionMode to all messages', () => {
      const messages = [
        makeMessage({
          permissionMode: 'acceptEdits',
          message: { role: 'user', content: 'hello' },
          uuid: 'msg-1',
        }),
        makeMessage({
          type: 'assistant',
          message: { role: 'assistant', content: [{ type: 'text', text: 'hi' }] },
          uuid: 'msg-2',
          timestamp: '2025-01-15T10:00:01.000Z',
        }),
      ];

      annotateMessages(messages);
      expect(messages[0].permissionMode).toBe('acceptEdits');
      expect(messages[1].permissionMode).toBe('acceptEdits');
    });

    it('should default to "default" when no permissionMode is set', () => {
      const messages = [
        makeMessage({
          message: { role: 'user', content: 'hello' },
        }),
      ];

      annotateMessages(messages);
      expect(messages[0].permissionMode).toBe('default');
    });
  });
});

describe('toolNeedsPermission', () => {
  it('should return false for always-auto-approved tools', () => {
    for (const tool of ['Read', 'Glob', 'Grep', 'TodoRead', 'TodoWrite', 'TaskList', 'TaskGet', 'TaskCreate', 'TaskUpdate', 'TaskOutput', 'KillShell']) {
      expect(toolNeedsPermission(tool, 'default')).toBe(false);
      expect(toolNeedsPermission(tool, 'acceptEdits')).toBe(false);
      expect(toolNeedsPermission(tool, 'plan')).toBe(false);
    }
  });

  it('should return true for Bash in default and acceptEdits modes', () => {
    expect(toolNeedsPermission('Bash', 'default')).toBe(true);
    expect(toolNeedsPermission('Bash', 'acceptEdits')).toBe(true);
    expect(toolNeedsPermission('Bash', 'plan')).toBe(true);
  });

  it('should return false for Edit/Write in acceptEdits and default modes', () => {
    expect(toolNeedsPermission('Edit', 'acceptEdits')).toBe(false);
    expect(toolNeedsPermission('Edit', 'default')).toBe(false);
    expect(toolNeedsPermission('Write', 'acceptEdits')).toBe(false);
    expect(toolNeedsPermission('Write', 'default')).toBe(false);
  });

  it('should return true for Edit/Write in plan mode', () => {
    expect(toolNeedsPermission('Edit', 'plan')).toBe(true);
    expect(toolNeedsPermission('Write', 'plan')).toBe(true);
  });

  it('should return true for Agent in all non-bypass modes', () => {
    expect(toolNeedsPermission('Agent', 'default')).toBe(true);
    expect(toolNeedsPermission('Agent', 'acceptEdits')).toBe(true);
    expect(toolNeedsPermission('Agent', 'plan')).toBe(true);
  });
});
