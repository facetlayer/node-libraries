import type { ChatMessage } from "./types.ts";

const PERMISSION_REJECTED_MESSAGE = "The user doesn't want to proceed with this tool use. The tool use was rejected";

/**
 * Tools that are always auto-approved regardless of permission mode.
 */
const ALWAYS_AUTO_APPROVED_TOOLS = new Set([
  'Read', 'Glob', 'Grep',
  // Task/Todo tools are internal and auto-approved
  'TodoRead', 'TodoWrite', 'TaskList', 'TaskGet', 'TaskCreate', 'TaskUpdate',
  // Other internal tools
  'TaskOutput', 'KillShell',
]);

/**
 * Tools that are auto-approved in acceptEdits mode (in addition to always-auto-approved).
 */
const ACCEPT_EDITS_AUTO_APPROVED_TOOLS = new Set([
  'Edit', 'Write', 'NotebookEdit', 'MultiEdit',
]);

/**
 * Determine if a tool would require a permission prompt under the given permission mode.
 *
 * Note: Claude Code also has per-user allowlists that can auto-approve specific
 * tool invocations (e.g., certain Bash commands). This function only checks the
 * mode-level rules; allowlisted invocations may still show up as permission checks.
 */
export function toolNeedsPermission(toolName: string, permissionMode: string): boolean {
  if (ALWAYS_AUTO_APPROVED_TOOLS.has(toolName)) return false;

  switch (permissionMode) {
    case 'acceptEdits':
      // acceptEdits auto-approves file editing tools on top of the always-auto list
      return !ACCEPT_EDITS_AUTO_APPROVED_TOOLS.has(toolName);
    case 'default':
      // default mode auto-approves editing tools too (based on observed behavior)
      return !ACCEPT_EDITS_AUTO_APPROVED_TOOLS.has(toolName);
    case 'plan':
      // plan mode is more restrictive — most tools need permission
      return true;
    default:
      // Unknown mode — assume it needs permission
      return true;
  }
}

/**
 * Annotate messages with derived information:
 * - internalMessageType: identifies terminal control messages and hooks
 * - permissionResult: identifies permission check outcomes ('approved' or 'rejected')
 * - permissionMode: propagated from user-typed messages
 */
export function annotateMessages(messages: ChatMessage[]) {
  let currentPermissionMode = 'default';

  for (const message of messages) {
    // Track permissionMode from user-typed messages (the raw field from JSONL)
    const rawMessage = message as any;
    if (rawMessage.permissionMode) {
      currentPermissionMode = rawMessage.permissionMode;
    }

    // Propagate active permission mode to all messages
    message.permissionMode = currentPermissionMode;

    annotateInternalMessageType(message);
    annotatePermissionResult(message, messages, currentPermissionMode);
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
 * A permission check is detected when:
 * - A user message contains a tool_result
 * - The corresponding tool_use required permission under the active permission mode
 *
 * Rejected checks: tool_result has is_error: true with the rejection message.
 * Approved checks: tool_result for a permission-requiring tool that was not rejected.
 */
function annotatePermissionResult(message: ChatMessage, allMessages: ChatMessage[], permissionMode: string) {
  if (message.type !== 'user') return;

  const content = message.message?.content;
  if (!Array.isArray(content)) return;

  for (const block of content) {
    if (block.type !== 'tool_result' || !block.tool_use_id) continue;

    // Check for rejection
    if (
      block.is_error === true &&
      typeof block.content === 'string' &&
      block.content.includes(PERMISSION_REJECTED_MESSAGE)
    ) {
      message.permissionResult = 'rejected';
      return;
    }

    // Check if this tool_result corresponds to a tool that needs permission
    const toolUse = findToolUseForResult(allMessages, message, block.tool_use_id);
    if (toolUse && toolNeedsPermission(toolUse.name, permissionMode)) {
      message.permissionResult = 'approved';
      // Don't return - a later block might be a rejection which takes priority
    }
  }
}

/**
 * Find the tool_use block that matches a given tool_use_id by searching
 * backwards from the given message.
 */
function findToolUseForResult(messages: ChatMessage[], fromMessage: ChatMessage, toolUseId: string): { name: string; input: any } | null {
  const fromIndex = messages.indexOf(fromMessage);
  if (fromIndex < 0) return null;

  for (let i = fromIndex - 1; i >= 0; i--) {
    const content = messages[i].message?.content;
    if (!Array.isArray(content)) continue;

    for (const block of content) {
      if (block.type === 'tool_use' && block.id === toolUseId) {
        return { name: block.name || 'unknown', input: block.input };
      }
    }
  }
  return null;
}

// Re-export with old name for backwards compatibility
export const annotateInternalMessages = annotateMessages;
