import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { listChatSessions } from './listChatSessions';

const fixturesDir = path.join(__dirname, '..', 'test', 'fixtures', 'claude');

describe('listChatSessions', () => {
  it('should return all sessions for a valid project', async () => {
    const sessions = await listChatSessions({
      project: 'test-project-1',
      claudeDir: fixturesDir,
    });

    expect(sessions).toHaveLength(3);
    expect(sessions[0].sessionId).toBe('session-003'); // Most recent
    expect(sessions[1].sessionId).toBe('session-002');
    expect(sessions[2].sessionId).toBe('session-001'); // Oldest
  });

  it('should sort sessions by last message timestamp (most recent first)', async () => {
    const sessions = await listChatSessions({
      project: 'test-project-1',
      claudeDir: fixturesDir,
    });

    expect(sessions.length).toBeGreaterThan(0);

    // Verify sessions are sorted by lastMessageTimestamp descending
    for (let i = 0; i < sessions.length - 1; i++) {
      const currentTime = new Date(sessions[i].lastMessageTimestamp).getTime();
      const nextTime = new Date(sessions[i + 1].lastMessageTimestamp).getTime();
      expect(currentTime).toBeGreaterThanOrEqual(nextTime);
    }
  });

  it('should return empty array for non-existent project', async () => {
    const sessions = await listChatSessions({
      project: 'non-existent-project',
      claudeDir: fixturesDir,
    });

    expect(sessions).toEqual([]);
  });

  it('should include message count for each session', async () => {
    const sessions = await listChatSessions({
      project: 'test-project-1',
      claudeDir: fixturesDir,
    });

    sessions.forEach(session => {
      expect(session.messageCount).toBeGreaterThan(0);
      expect(session.messageCount).toBe(session.messages.length);
    });
  });

  it('should include first and last message timestamps', async () => {
    const sessions = await listChatSessions({
      project: 'test-project-1',
      claudeDir: fixturesDir,
    });

    sessions.forEach(session => {
      // First/last timestamps may come from snapshot messages which may not have timestamp
      // But at least one message should have a timestamp
      const messagesWithTimestamp = session.messages.filter(m => m.timestamp);
      expect(messagesWithTimestamp.length).toBeGreaterThan(0);

      if (session.firstMessageTimestamp) {
        expect(new Date(session.firstMessageTimestamp).getTime()).not.toBeNaN();
      }
      if (session.lastMessageTimestamp) {
        expect(new Date(session.lastMessageTimestamp).getTime()).not.toBeNaN();
      }

      // If both exist, first should be before or equal to last
      if (session.firstMessageTimestamp && session.lastMessageTimestamp) {
        const firstTime = new Date(session.firstMessageTimestamp).getTime();
        const lastTime = new Date(session.lastMessageTimestamp).getTime();
        expect(firstTime).toBeLessThanOrEqual(lastTime);
      }
    });
  });

  it('should include project path for each session', async () => {
    const sessions = await listChatSessions({
      project: 'test-project-1',
      claudeDir: fixturesDir,
    });

    sessions.forEach(session => {
      expect(session.projectPath).toBe('test-project-1');
    });
  });

  it('should annotate internal messages', async () => {
    const sessions = await listChatSessions({
      project: 'test-project-1',
      claudeDir: fixturesDir,
    });

    // Find session-002 which has a hook message
    const session2 = sessions.find(s => s.sessionId === 'session-002');
    expect(session2).toBeTruthy();

    const hookMessage = session2!.messages.find(m => m.internalMessageType === 'hook');
    expect(hookMessage).toBeTruthy();
    expect(hookMessage!.type).toBe('system');

    // Find session-003 which has a terminal control message
    const session3 = sessions.find(s => s.sessionId === 'session-003');
    expect(session3).toBeTruthy();

    const terminalMessage = session3!.messages.find(m => m.internalMessageType === 'terminal_control');
    expect(terminalMessage).toBeTruthy();
  });

  it('should skip empty files', async () => {
    const sessions = await listChatSessions({
      project: 'test-project-2',
      claudeDir: fixturesDir,
    });

    // Should only include session-004, not the empty session file
    expect(sessions).toHaveLength(1);
    expect(sessions[0].sessionId).toBe('session-004');
  });

  it('should apply pagination with limit', async () => {
    const sessions = await listChatSessions({
      project: 'test-project-1',
      claudeDir: fixturesDir,
      limit: 2,
    });

    expect(sessions).toHaveLength(2);
    expect(sessions[0].sessionId).toBe('session-003'); // Most recent
    expect(sessions[1].sessionId).toBe('session-002');
  });

  it('should apply pagination with offset', async () => {
    const sessions = await listChatSessions({
      project: 'test-project-1',
      claudeDir: fixturesDir,
      offset: 1,
    });

    expect(sessions).toHaveLength(2);
    expect(sessions[0].sessionId).toBe('session-002');
    expect(sessions[1].sessionId).toBe('session-001');
  });

  it('should apply pagination with both offset and limit', async () => {
    const sessions = await listChatSessions({
      project: 'test-project-1',
      claudeDir: fixturesDir,
      offset: 1,
      limit: 1,
    });

    expect(sessions).toHaveLength(1);
    expect(sessions[0].sessionId).toBe('session-002');
  });

  it('should handle offset beyond available sessions', async () => {
    const sessions = await listChatSessions({
      project: 'test-project-1',
      claudeDir: fixturesDir,
      offset: 10,
    });

    expect(sessions).toEqual([]);
  });

  it('should parse all messages in each session correctly', async () => {
    const sessions = await listChatSessions({
      project: 'test-project-1',
      claudeDir: fixturesDir,
    });

    sessions.forEach(session => {
      // Filter out file-history-snapshot which may not have all fields
      const regularMessages = session.messages.filter(m => m.type !== 'file-history-snapshot');
      expect(regularMessages.length).toBeGreaterThan(0);

      regularMessages.forEach(message => {
        // Verify required fields exist
        expect(message.uuid).toBeTruthy();
        expect(message.timestamp).toBeTruthy();
        expect(message.sessionId).toBe(session.sessionId);
        expect(message.type).toMatch(/^(user|assistant|system)$/);
      });
    });
  });

  it('should return different sessions for different projects', async () => {
    const sessions1 = await listChatSessions({
      project: 'test-project-1',
      claudeDir: fixturesDir,
    });

    const sessions2 = await listChatSessions({
      project: 'test-project-2',
      claudeDir: fixturesDir,
    });

    expect(sessions1.length).toBe(3);
    expect(sessions2.length).toBe(1);

    // Verify they don't share session IDs
    const sessionIds1 = sessions1.map(s => s.sessionId);
    const sessionIds2 = sessions2.map(s => s.sessionId);

    sessionIds1.forEach(id => {
      expect(sessionIds2).not.toContain(id);
    });
  });
});
