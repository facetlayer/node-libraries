import { describe, it, expect } from 'vitest';
import { computeSessionMetrics } from './sessionMetrics.ts';
import type { ChatMessage } from './types.ts';

function userText(text: string, ts: string, extras: Partial<ChatMessage> = {}): ChatMessage {
  return {
    parentUuid: null,
    isSidechain: false,
    userType: 'external',
    cwd: '/tmp',
    sessionId: 'sess',
    version: '1.0',
    type: 'user',
    uuid: `u-${ts}`,
    timestamp: ts,
    message: { role: 'user', content: text },
    ...extras,
  } as ChatMessage;
}

function assistantBlocks(blocks: any[], ts: string): ChatMessage {
  return {
    parentUuid: null,
    isSidechain: false,
    userType: 'external',
    cwd: '/tmp',
    sessionId: 'sess',
    version: '1.0',
    type: 'assistant',
    uuid: `a-${ts}`,
    timestamp: ts,
    message: { role: 'assistant', content: blocks },
  } as ChatMessage;
}

describe('computeSessionMetrics', () => {
  it('counts tool errors, tool counts, and computes duration', () => {
    const messages: ChatMessage[] = [
      userText('hi', '2026-04-25T00:00:00Z'),
      assistantBlocks([
        { type: 'tool_use', id: 't1', name: 'Bash', input: { command: 'ls' } },
        { type: 'tool_use', id: 't2', name: 'Read', input: { file_path: '/x' } },
      ], '2026-04-25T00:01:00Z'),
      assistantBlocks([
        { type: 'tool_result', tool_use_id: 't1', is_error: true, content: 'boom' },
      ], '2026-04-25T00:02:00Z'),
    ];

    const m = computeSessionMetrics(messages);
    expect(m.toolErrors).toBe(1);
    expect(m.toolCounts).toEqual({ Bash: 1, Read: 1 });
    expect(m.durationMs).toBe(120_000);
    expect(m.firstUserPrompt).toBe('hi');
  });

  it('detects user interrupts', () => {
    const messages: ChatMessage[] = [
      userText('start', '2026-04-25T00:00:00Z'),
      userText('[Request interrupted by user]', '2026-04-25T00:00:30Z'),
    ];
    const m = computeSessionMetrics(messages);
    expect(m.interruptCount).toBe(1);
  });

  it('treats <scheduled-task> wrappers as the first user prompt for routine sessions', () => {
    // For routine runs the scheduled-task tag IS the user's prompt — it identifies
    // what the routine ran. Both `summarize` and the metrics module agree here.
    const messages: ChatMessage[] = [
      userText('<scheduled-task name="x" file="/y/SKILL.md">go</scheduled-task>', '2026-04-25T00:00:00Z'),
      userText('actual user question', '2026-04-25T00:01:00Z'),
    ];
    const m = computeSessionMetrics(messages);
    expect(m.firstUserPrompt).toContain('<scheduled-task');
  });

  it('counts permission rejections and skills invoked', () => {
    const messages: ChatMessage[] = [
      userText('hi', '2026-04-25T00:00:00Z'),
      assistantBlocks([
        { type: 'tool_use', id: 's1', name: 'Skill', input: { skill: 'load-testing' } },
      ], '2026-04-25T00:01:00Z'),
      // A rejected permission check (annotated by annotateMessages, but we set it
      // directly here since this is a unit test of metrics over raw messages).
      {
        ...assistantBlocks([
          { type: 'tool_result', tool_use_id: 's1', is_error: true, content: "The user doesn't want to proceed" },
        ], '2026-04-25T00:02:00Z'),
        permissionResult: 'rejected',
      } as ChatMessage,
    ];
    const m = computeSessionMetrics(messages);
    expect(m.permissionRejections).toBe(1);
    expect(m.skillsInvoked).toContain('load-testing');
  });
});
