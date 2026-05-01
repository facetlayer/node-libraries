import type { ChatMessage, ChatSession } from './types.ts';
import { extractSessionMetadata } from './sessionMetadata.ts';

export interface SessionMetrics {
  /** Number of tool_result blocks marked is_error. */
  toolErrors: number;
  /** Number of user messages containing the "[Request interrupted by user" marker. */
  interruptCount: number;
  /** Wall-clock duration from first to last message timestamp, in ms. Undefined when unknown. */
  durationMs?: number;
  /** Count of rejected permission checks. */
  permissionRejections: number;
  /** First user-typed prompt (excluding scheduled-task wrappers, hooks, etc.), truncated. */
  firstUserPrompt?: string;
  /** Distinct skill names invoked during the session. */
  skillsInvoked: string[];
  /** Counts of tool_use blocks by tool name. */
  toolCounts: Record<string, number>;
}

const PROMPT_TRUNCATE_LEN = 200;

export function oneLine(s: string, max: number): string {
  const collapsed = s.replace(/\s+/g, ' ').trim();
  if (collapsed.length <= max) return collapsed;
  return collapsed.slice(0, max - 1) + '…';
}

/**
 * True when the message represents a user-typed prompt (not a slash command
 * wrapper, tool result, system caveat, interrupt notification, etc.).
 *
 * Scheduled-task wrappers ARE included — for routine sessions the `<scheduled-task>`
 * tag is effectively the user's prompt for that run, and consumers like
 * `summarize` rely on it being present.
 */
export function isUserTypedPrompt(msg: ChatMessage): boolean {
  if (msg.type !== 'user') return false;
  if (msg.isMeta) return false;
  if (msg.internalMessageType) return false;
  const content = msg.message?.content;
  if (!content) return false;
  if (typeof content === 'string') {
    if (content.startsWith('<local-command') || content.includes('<command-name>')) return false;
    if (content.startsWith('Caveat:')) return false;
    if (content.includes('<task-notification>')) return false;
    if (content.includes('[Request interrupted by user')) return false;
    return content.trim().length > 0;
  }
  if (Array.isArray(content)) {
    const textBlocks = content.filter((b: any) => b.type === 'text' && b.text && b.text.trim().length > 0);
    if (textBlocks.length === 0) return false;
    const joined = textBlocks.map((b: any) => b.text).join('\n');
    if (joined.includes('[Request interrupted by user')) return false;
    if (joined.includes('<task-notification>')) return false;
    if (joined.startsWith('Caveat:')) return false;
    return true;
  }
  return false;
}

export function extractUserText(msg: ChatMessage): string {
  const content = msg.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((b: any) => b.type === 'text' && b.text)
      .map((b: any) => b.text)
      .join('\n');
  }
  return '';
}

/**
 * Compute per-session audit metrics from a list of messages.
 *
 * This is the shared shape returned by `list-sessions --json`, `get-skill-runs --json`,
 * and other row-oriented commands so consumers don't have to drop into `summarize`
 * for each session.
 */
export function computeSessionMetrics(messages: ChatMessage[]): SessionMetrics {
  const meta = extractSessionMetadata(messages);

  let toolErrors = 0;
  let interruptCount = 0;
  let permissionRejections = 0;
  let firstUserPrompt: string | undefined;
  const toolCounts: Record<string, number> = {};

  for (const msg of messages) {
    if (msg.permissionResult === 'rejected') {
      permissionRejections++;
    }

    if (msg.type === 'user' && !msg.isMeta && !msg.internalMessageType) {
      const raw = extractUserText(msg);
      if (raw.includes('[Request interrupted by user')) {
        interruptCount++;
      }
    }

    if (firstUserPrompt === undefined && isUserTypedPrompt(msg)) {
      const text = extractUserText(msg);
      if (text.trim()) firstUserPrompt = oneLine(text, PROMPT_TRUNCATE_LEN);
    }

    const content = msg.message?.content;
    if (Array.isArray(content)) {
      for (const block of content as any[]) {
        if (block.type === 'tool_use') {
          const name = block.name || 'unknown';
          toolCounts[name] = (toolCounts[name] ?? 0) + 1;
        } else if (block.type === 'tool_result' && block.is_error) {
          toolErrors++;
        }
      }
    }
  }

  let durationMs: number | undefined;
  const first = messages.find(m => m.timestamp && !isNaN(Date.parse(m.timestamp)))?.timestamp;
  const last = [...messages].reverse().find(m => m.timestamp && !isNaN(Date.parse(m.timestamp)))?.timestamp;
  if (first && last) {
    const ms = new Date(last).getTime() - new Date(first).getTime();
    if (Number.isFinite(ms) && ms >= 0) durationMs = ms;
  }

  return {
    toolErrors,
    interruptCount,
    durationMs,
    permissionRejections,
    firstUserPrompt,
    skillsInvoked: meta.skillsUsed,
    toolCounts,
  };
}

/** Convenience: compute metrics for a `ChatSession`. */
export function sessionMetricsFor(session: ChatSession): SessionMetrics {
  return computeSessionMetrics(session.messages);
}
