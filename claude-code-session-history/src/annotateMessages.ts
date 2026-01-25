import type { ChatMessage } from "./types.ts";

const PERMISSION_REJECTED_MESSAGE = "The user doesn't want to proceed with this tool use. The tool use was rejected";

/**
 * Annotate messages with derived information:
 * - internalMessageType: identifies terminal control messages and hooks
 * - permissionResult: identifies permission check outcomes (currently only 'rejected')
 */
export function annotateMessages(messages: ChatMessage[]) {
  for (const message of messages) {
    annotateInternalMessageType(message);
    annotatePermissionResult(message);
  }
}

/**
 * Detect and annotate internal message types (hooks, terminal control)
 */
function annotateInternalMessageType(message: ChatMessage) {
  const content = message.message?.content;

  if (typeof content === 'string') {
    // Check for PreToolUse hook pattern (e.g., "PreToolUse:Edit")
    if (content.includes('PreToolUse:') && message.type === 'system') {
      message.internalMessageType = 'hook';
    }
    // Check for /clear command pattern
    else if (content.includes('<command-name>/clear</command-name>')) {
      message.internalMessageType = 'terminal_control';
    }
    // Check for command stdout pattern
    else if (content.includes('<local-command-stdout>')) {
      message.internalMessageType = 'terminal_control';
    }
  }
}

/**
 * Detect and annotate permission check results.
 *
 * When a user rejects a tool use permission, the message contains a tool_result
 * with is_error: true and a specific rejection message.
 */
function annotatePermissionResult(message: ChatMessage) {
  // Permission rejections appear in user messages with tool_result content
  if (message.type !== 'user') {
    return;
  }

  const content = message.message?.content;
  if (!Array.isArray(content)) {
    return;
  }

  for (const block of content) {
    if (
      block.type === 'tool_result' &&
      block.is_error === true &&
      typeof block.content === 'string' &&
      block.content.includes(PERMISSION_REJECTED_MESSAGE)
    ) {
      message.permissionResult = 'rejected';
      return;
    }
  }
}

// Re-export with old name for backwards compatibility
export const annotateInternalMessages = annotateMessages;
