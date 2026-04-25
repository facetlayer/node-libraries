import { describe, it, expect } from 'vitest';
import { filterSessions, parseTimeBound, normalizeListArg } from './sessionFilters.ts';
import type { ChatSession } from './types.ts';

function session(partial: Partial<ChatSession>): ChatSession {
  return {
    sessionId: 's',
    messages: [],
    lastMessageTimestamp: '2026-04-20T12:00:00.000Z',
    projectPath: 'p',
    messageCount: 0,
    ...partial,
  };
}

describe('parseTimeBound', () => {
  const now = new Date('2026-04-25T00:00:00.000Z');

  it('parses ISO dates', () => {
    expect(parseTimeBound('2026-04-20', now)?.toISOString()).toContain('2026-04-20');
  });

  it('parses relative durations: 7d', () => {
    const result = parseTimeBound('7d', now)!;
    expect(now.getTime() - result.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('parses 24h, 30m, 2w', () => {
    expect(now.getTime() - parseTimeBound('24h', now)!.getTime()).toBe(24 * 60 * 60 * 1000);
    expect(now.getTime() - parseTimeBound('30m', now)!.getTime()).toBe(30 * 60 * 1000);
    expect(now.getTime() - parseTimeBound('2w', now)!.getTime()).toBe(14 * 24 * 60 * 60 * 1000);
  });

  it('treats bare numbers as days', () => {
    expect(now.getTime() - parseTimeBound('3', now)!.getTime()).toBe(3 * 24 * 60 * 60 * 1000);
  });

  it('returns null for nonsense', () => {
    expect(parseTimeBound('not-a-date', now)).toBeNull();
  });
});

describe('normalizeListArg', () => {
  it('returns undefined when missing', () => {
    expect(normalizeListArg(undefined)).toBeUndefined();
  });
  it('splits comma-separated values', () => {
    expect(normalizeListArg('a,b,c')).toEqual(['a', 'b', 'c']);
  });
  it('flattens repeated array values', () => {
    expect(normalizeListArg(['a', 'b,c'])).toEqual(['a', 'b', 'c']);
  });
  it('drops empty entries', () => {
    expect(normalizeListArg(',,a,, ,')).toEqual(['a']);
  });
});

describe('filterSessions', () => {
  const now = new Date('2026-04-25T00:00:00.000Z');
  const sessions: ChatSession[] = [
    session({ sessionId: 'cli-1', skillsUsed: ['foo'], entrypoint: 'cli', lastMessageTimestamp: '2026-04-24T00:00:00.000Z' }),
    session({
      sessionId: 'routine-foo',
      entrypoint: 'claude-desktop',
      scheduledTask: { name: 'foo-monitor', skillFile: '/x/foo-monitor/SKILL.md', skillName: 'foo-monitor' },
      skillsUsed: ['foo-monitor'],
      lastMessageTimestamp: '2026-04-23T00:00:00.000Z',
    }),
    session({
      sessionId: 'routine-bar',
      entrypoint: 'claude-desktop',
      scheduledTask: { name: 'bar-monitor', skillFile: '/x/bar-monitor/SKILL.md', skillName: 'bar-monitor' },
      skillsUsed: ['bar-monitor'],
      lastMessageTimestamp: '2026-04-10T00:00:00.000Z',
    }),
  ];

  it('--routine keeps only sessions with a scheduled task', () => {
    const out = filterSessions(sessions, { routine: true }, now);
    expect(out.map(s => s.sessionId)).toEqual(['routine-foo', 'routine-bar']);
  });

  it('--routine-name implies --routine and matches by name', () => {
    const out = filterSessions(sessions, { routineName: ['foo-monitor'] }, now);
    expect(out.map(s => s.sessionId)).toEqual(['routine-foo']);
  });

  it('--skill matches against skillsUsed', () => {
    const out = filterSessions(sessions, { skill: ['foo'] }, now);
    expect(out.map(s => s.sessionId)).toEqual(['cli-1']);
  });

  it('--entrypoint filter', () => {
    const out = filterSessions(sessions, { entrypoint: 'cli' }, now);
    expect(out.map(s => s.sessionId)).toEqual(['cli-1']);
  });

  it('--since drops older sessions', () => {
    const out = filterSessions(sessions, { since: '7d' }, now);
    expect(out.map(s => s.sessionId).sort()).toEqual(['cli-1', 'routine-foo']);
  });

  it('throws on unparseable --since', () => {
    expect(() => filterSessions(sessions, { since: 'garbage' }, now)).toThrow();
  });
});
