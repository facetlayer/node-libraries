import type { ChatMessage, ChatSession } from '@facetlayer/claude-code-session-history';
import type {
  SessionMetrics,
  ToolCall,
  PermissionCheck,
  ConfidenceSignal,
  ConfidenceLevel,
} from './types.ts';
import {
  analyzeTextForConfidence,
  calculateConfidenceFromSignals,
  extractTextFromMessage,
} from './confidenceHeuristics.ts';

/**
 * Extract tool calls from a message
 */
function extractToolCalls(message: ChatMessage): ToolCall[] {
  const toolCalls: ToolCall[] = [];

  if (message.message?.content && Array.isArray(message.message.content)) {
    for (const block of message.message.content) {
      if (block.type === 'tool_use' && block.name && block.id) {
        toolCalls.push({
          name: block.name,
          id: block.id,
          input: block.input,
          timestamp: message.timestamp,
        });
      }
    }
  }

  return toolCalls;
}

/**
 * Check if a message represents a permission rejection
 */
function isPermissionRejection(message: ChatMessage): boolean {
  // Check the derived field first
  if (message.permissionResult === 'rejected') {
    return true;
  }

  // Also check tool_result blocks for error patterns
  if (message.message?.content && Array.isArray(message.message.content)) {
    for (const block of message.message.content) {
      if (block.type === 'tool_result' && block.is_error) {
        const content = typeof block.content === 'string' ? block.content : '';
        if (content.includes("user doesn't want to proceed") ||
            content.includes('user rejected') ||
            content.includes('permission denied')) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Extract permission checks from messages
 *
 * Permission checks are inferred from:
 * 1. Hook messages (PreToolUse patterns)
 * 2. Tool result rejections
 * 3. System messages about permissions
 */
function extractPermissionChecks(messages: ChatMessage[]): PermissionCheck[] {
  const permissionChecks: PermissionCheck[] = [];
  const processedToolIds = new Set<string>();

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];

    // Look for hook messages (PreToolUse) - these indicate permission was requested
    if (message.internalMessageType === 'hook') {
      const text = extractTextFromMessage(message);
      const preToolMatch = text.match(/PreToolUse:\s*(\w+)/);
      if (preToolMatch) {
        const toolName = preToolMatch[1];

        // Look ahead for rejection
        let wasRejected = false;
        for (let j = i + 1; j < Math.min(i + 5, messages.length); j++) {
          if (isPermissionRejection(messages[j])) {
            wasRejected = true;
            break;
          }
        }

        permissionChecks.push({
          toolName,
          toolId: `hook-${i}`,
          wasRejected,
          timestamp: message.timestamp,
        });
      }
    }

    // Look for tool_result blocks with is_error that indicate rejection
    if (message.message?.content && Array.isArray(message.message.content)) {
      for (const block of message.message.content) {
        if (block.type === 'tool_result' && block.tool_use_id && !processedToolIds.has(block.tool_use_id)) {
          processedToolIds.add(block.tool_use_id);

          // Find the corresponding tool_use to get the tool name
          let toolName = 'unknown';
          for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
            const prevMessage = messages[j];
            if (prevMessage.message?.content && Array.isArray(prevMessage.message.content)) {
              for (const prevBlock of prevMessage.message.content) {
                if (prevBlock.type === 'tool_use' && prevBlock.id === block.tool_use_id) {
                  toolName = prevBlock.name || 'unknown';
                  break;
                }
              }
            }
          }

          const wasRejected = block.is_error === true && (
            (typeof block.content === 'string' && (
              block.content.includes("user doesn't want to proceed") ||
              block.content.includes('user rejected') ||
              block.content.includes('permission denied')
            ))
          );

          if (wasRejected || block.is_error) {
            permissionChecks.push({
              toolName,
              toolId: block.tool_use_id,
              wasRejected,
              timestamp: message.timestamp,
            });
          }
        }
      }
    }
  }

  return permissionChecks;
}

/**
 * Extract token usage from messages
 */
function extractTokenUsage(messages: ChatMessage[]): {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  totalCacheCreationTokens: number;
} {
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCacheReadTokens = 0;
  let totalCacheCreationTokens = 0;

  for (const message of messages) {
    const usage = message.message?.usage;
    if (usage) {
      totalInputTokens += usage.input_tokens || 0;
      totalOutputTokens += usage.output_tokens || 0;
      totalCacheReadTokens += usage.cache_read_input_tokens || 0;
      totalCacheCreationTokens += usage.cache_creation_input_tokens || 0;
    }
  }

  return {
    totalInputTokens,
    totalOutputTokens,
    totalCacheReadTokens,
    totalCacheCreationTokens,
  };
}

/**
 * Calculate session duration in minutes
 */
function calculateDuration(startTime?: string, endTime?: string): number | undefined {
  if (!startTime || !endTime) return undefined;

  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();

  if (isNaN(start) || isNaN(end)) return undefined;

  return Math.round((end - start) / (1000 * 60));
}

/**
 * Calculate overall confidence for a session
 */
function calculateSessionConfidence(messages: ChatMessage[]): {
  overallConfidence: ConfidenceLevel;
  confidenceScore: number;
  confidenceSignals: ConfidenceSignal[];
} {
  const allSignals: ConfidenceSignal[] = [];

  // Only analyze assistant messages for confidence
  for (const message of messages) {
    if (message.type === 'assistant' || message.message?.role === 'assistant') {
      const text = extractTextFromMessage(message);
      const signals = analyzeTextForConfidence(text);
      allSignals.push(...signals);
    }
  }

  const result = calculateConfidenceFromSignals(allSignals);

  return {
    overallConfidence: result.level,
    confidenceScore: result.score,
    confidenceSignals: allSignals,
  };
}

/**
 * Calculate metrics for a chat session
 */
export function calculateMetrics(session: ChatSession): SessionMetrics {
  const messages = session.messages;

  // Count message types
  let userMessages = 0;
  let assistantMessages = 0;
  let systemMessages = 0;

  for (const message of messages) {
    if (message.type === 'user') {
      userMessages++;
    } else if (message.type === 'assistant') {
      assistantMessages++;
    } else if (message.type === 'system') {
      systemMessages++;
    }
  }

  // Extract tool calls
  const toolCalls: ToolCall[] = [];
  for (const message of messages) {
    toolCalls.push(...extractToolCalls(message));
  }

  const uniqueToolsUsed = [...new Set(toolCalls.map(tc => tc.name))];

  // Extract permission checks
  const permissionChecks = extractPermissionChecks(messages);
  const permissionRejectCount = permissionChecks.filter(pc => pc.wasRejected).length;

  // Calculate confidence
  const confidence = calculateSessionConfidence(messages);

  // Extract token usage
  const tokenUsage = extractTokenUsage(messages);

  // Calculate duration
  const startTime = session.firstMessageTimestamp;
  const endTime = session.lastMessageTimestamp;
  const durationMinutes = calculateDuration(startTime, endTime);

  return {
    sessionId: session.sessionId,
    projectPath: session.projectPath,

    totalMessages: messages.length,
    userMessages,
    assistantMessages,
    systemMessages,

    toolCalls,
    toolCallCount: toolCalls.length,
    uniqueToolsUsed,

    permissionChecks,
    permissionCheckCount: permissionChecks.length,
    permissionRejectCount,

    overallConfidence: confidence.overallConfidence,
    confidenceScore: confidence.confidenceScore,
    confidenceSignals: confidence.confidenceSignals,

    startTime,
    endTime,
    durationMinutes,

    ...tokenUsage,
  };
}

/**
 * Format metrics as a summary string
 */
export function formatMetricsSummary(metrics: SessionMetrics): string {
  const lines: string[] = [];

  lines.push(`Session: ${metrics.sessionId}`);
  lines.push(`Project: ${metrics.projectPath}`);
  lines.push('');

  lines.push('=== Message Counts ===');
  lines.push(`Total messages: ${metrics.totalMessages}`);
  lines.push(`  User: ${metrics.userMessages}`);
  lines.push(`  Assistant: ${metrics.assistantMessages}`);
  lines.push(`  System: ${metrics.systemMessages}`);
  lines.push('');

  lines.push('=== Tool Usage ===');
  lines.push(`Total tool calls: ${metrics.toolCallCount}`);
  lines.push(`Unique tools used: ${metrics.uniqueToolsUsed.length}`);
  if (metrics.uniqueToolsUsed.length > 0) {
    lines.push(`  Tools: ${metrics.uniqueToolsUsed.join(', ')}`);
  }
  lines.push('');

  lines.push('=== Permission Checks ===');
  lines.push(`Permission checks detected: ${metrics.permissionCheckCount}`);
  lines.push(`Permission rejections: ${metrics.permissionRejectCount}`);
  lines.push('');

  lines.push('=== Confidence Analysis ===');
  lines.push(`Overall confidence: ${metrics.overallConfidence.toUpperCase()}`);
  lines.push(`Confidence score: ${metrics.confidenceScore.toFixed(2)}`);
  lines.push(`Signals detected: ${metrics.confidenceSignals.length}`);

  // Show breakdown by level
  const highSignals = metrics.confidenceSignals.filter(s => s.level === 'high');
  const medSignals = metrics.confidenceSignals.filter(s => s.level === 'medium');
  const lowSignals = metrics.confidenceSignals.filter(s => s.level === 'low');

  if (highSignals.length > 0) {
    lines.push(`  High confidence signals (${highSignals.length}): ${highSignals.map(s => s.pattern).join(', ')}`);
  }
  if (medSignals.length > 0) {
    lines.push(`  Medium confidence signals (${medSignals.length}): ${medSignals.map(s => s.pattern).join(', ')}`);
  }
  if (lowSignals.length > 0) {
    lines.push(`  Low confidence signals (${lowSignals.length}): ${lowSignals.map(s => s.pattern).join(', ')}`);
  }
  lines.push('');

  lines.push('=== Token Usage ===');
  lines.push(`Input tokens: ${metrics.totalInputTokens.toLocaleString()}`);
  lines.push(`Output tokens: ${metrics.totalOutputTokens.toLocaleString()}`);
  lines.push(`Cache read tokens: ${metrics.totalCacheReadTokens.toLocaleString()}`);
  lines.push(`Cache creation tokens: ${metrics.totalCacheCreationTokens.toLocaleString()}`);
  lines.push('');

  if (metrics.startTime || metrics.endTime) {
    lines.push('=== Timing ===');
    if (metrics.startTime) lines.push(`Start: ${metrics.startTime}`);
    if (metrics.endTime) lines.push(`End: ${metrics.endTime}`);
    if (metrics.durationMinutes !== undefined) {
      lines.push(`Duration: ${metrics.durationMinutes} minutes`);
    }
  }

  return lines.join('\n');
}
