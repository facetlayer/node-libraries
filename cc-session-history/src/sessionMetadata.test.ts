import { describe, it, expect } from 'vitest';
import { extractSessionMetadata, skillNameFromSkillFile } from './sessionMetadata.ts';
import type { ChatMessage } from './types.ts';

function userMsg(content: any, extra: Partial<ChatMessage> = {}): ChatMessage {
  return {
    parentUuid: null,
    isSidechain: false,
    userType: 'external',
    cwd: '/tmp',
    sessionId: 's1',
    version: '2.1',
    type: 'user',
    uuid: 'u-' + Math.random(),
    timestamp: '2026-04-20T13:00:00.000Z',
    message: { role: 'user', content },
    ...extra,
  } as ChatMessage;
}

function assistantToolUse(skill: string): ChatMessage {
  return {
    parentUuid: null,
    isSidechain: false,
    userType: 'external',
    cwd: '/tmp',
    sessionId: 's1',
    version: '2.1',
    type: 'assistant',
    uuid: 'a-' + Math.random(),
    timestamp: '2026-04-20T13:00:01.000Z',
    message: {
      role: 'assistant',
      content: [{ type: 'tool_use', id: 'tu-1', name: 'Skill', input: { skill } }],
    },
  } as ChatMessage;
}

describe('skillNameFromSkillFile', () => {
  it('returns the directory name above SKILL.md', () => {
    expect(skillNameFromSkillFile('/Users/example/.claude/scheduled-tasks/example-daily-monitor/SKILL.md'))
      .toBe('example-daily-monitor');
  });
  it('returns null for non-SKILL.md paths', () => {
    expect(skillNameFromSkillFile('/Users/andy/foo/README.md')).toBeNull();
  });
  it('returns null for empty input', () => {
    expect(skillNameFromSkillFile('')).toBeNull();
  });
});

describe('extractSessionMetadata', () => {
  it('detects entrypoint from the first message that has one', () => {
    const messages: ChatMessage[] = [
      { type: 'file-history-snapshot' } as any,
      userMsg('hello', { entrypoint: 'cli' } as any),
    ];
    expect(extractSessionMetadata(messages).entrypoint).toBe('cli');
  });

  it('parses scheduled-task tag and derives skill name from SKILL.md path', () => {
    const messages = [
      userMsg(
        '<scheduled-task name="example-daily-monitor" file="/Users/example/.claude/scheduled-tasks/example-daily-monitor/SKILL.md">\nrun\n</scheduled-task>',
        { entrypoint: 'claude-desktop' } as any
      ),
    ];
    const meta = extractSessionMetadata(messages);
    expect(meta.scheduledTask).toEqual({
      name: 'example-daily-monitor',
      skillFile: '/Users/example/.claude/scheduled-tasks/example-daily-monitor/SKILL.md',
      skillName: 'example-daily-monitor',
    });
    expect(meta.skillsUsed).toContain('example-daily-monitor');
    expect(meta.skillInvocations[0].source).toBe('scheduled-task');
  });

  it('ignores scheduled-task tags whose file is not a SKILL.md path', () => {
    const messages = [
      userMsg('<scheduled-task name="custom-routine" file="/Users/example/elsewhere/something.txt">x</scheduled-task>'),
    ];
    const meta = extractSessionMetadata(messages);
    expect(meta.scheduledTask).toBeUndefined();
  });

  it('detects slash-command skill invocations', () => {
    const messages = [userMsg('<command-name>/vibe-cleanup-typescript</command-name>')];
    const meta = extractSessionMetadata(messages);
    expect(meta.skillsUsed).toContain('vibe-cleanup-typescript');
    expect(meta.skillInvocations[0].source).toBe('slash-command');
  });

  it('ignores built-in slash commands like /clear', () => {
    const messages = [userMsg('<command-name>/clear</command-name>')];
    expect(extractSessionMetadata(messages).skillsUsed).toEqual([]);
  });

  it('detects Skill tool invocations', () => {
    const messages = [assistantToolUse('load-testing')];
    const meta = extractSessionMetadata(messages);
    expect(meta.skillsUsed).toContain('load-testing');
    expect(meta.skillInvocations[0].source).toBe('skill-tool');
  });

  it('deduplicates skillsUsed while preserving invocation list', () => {
    const messages = [
      userMsg('<command-name>/foo</command-name>'),
      assistantToolUse('foo'),
    ];
    const meta = extractSessionMetadata(messages);
    expect(meta.skillsUsed).toEqual(['foo']);
    expect(meta.skillInvocations.length).toBe(2);
  });
});
