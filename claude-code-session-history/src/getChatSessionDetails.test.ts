import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { getChatSessionDetails } from './getChatSessionDetails';

const fixturesDir = path.join(__dirname, '..', 'test', 'fixtures', 'claude');

describe('getChatSessionDetails', () => {
  it('should retrieve all messages for a valid session', async () => {
    const messages = await getChatSessionDetails('session-001', 'test-project-1', {
      claudeDir: fixturesDir,
    });

    expect(messages.length).toBeGreaterThan(0);
    // Find first message with sessionId (file-history-snapshot may not have it)
    const messageWithSession = messages.find(m => m.sessionId);
    expect(messageWithSession?.sessionId).toBe('session-001');
  });

  it('should return messages in chronological order', async () => {
    const messages = await getChatSessionDetails('session-001', 'test-project-1', {
      claudeDir: fixturesDir,
    });

    // Verify messages with timestamps are in order
    const messagesWithTimestamp = messages.filter(m => m.timestamp);
    for (let i = 0; i < messagesWithTimestamp.length - 1; i++) {
      const currentTime = new Date(messagesWithTimestamp[i].timestamp).getTime();
      const nextTime = new Date(messagesWithTimestamp[i + 1].timestamp).getTime();
      expect(currentTime).toBeLessThanOrEqual(nextTime);
    }
  });

  it('should include all message properties', async () => {
    const messages = await getChatSessionDetails('session-001', 'test-project-1', {
      claudeDir: fixturesDir,
    });

    // Filter out file-history-snapshot which may not have all fields
    const regularMessages = messages.filter(m => m.type !== 'file-history-snapshot');
    expect(regularMessages.length).toBeGreaterThan(0);

    regularMessages.forEach(message => {
      expect(message.uuid).toBeTruthy();
      expect(message.timestamp).toBeTruthy();
      expect(message.sessionId).toBe('session-001');
      expect(message.type).toBeTruthy();
    });
  });

  it('should parse user messages correctly', async () => {
    const messages = await getChatSessionDetails('session-001', 'test-project-1', {
      claudeDir: fixturesDir,
    });

    const userMessages = messages.filter(m => m.type === 'user');
    expect(userMessages.length).toBeGreaterThan(0);

    userMessages.forEach(message => {
      expect(message.message?.role).toBe('user');
      expect(message.message?.content).toBeTruthy();
    });
  });

  it('should parse assistant messages correctly', async () => {
    const messages = await getChatSessionDetails('session-001', 'test-project-1', {
      claudeDir: fixturesDir,
    });

    const assistantMessages = messages.filter(m => m.type === 'assistant');
    expect(assistantMessages.length).toBeGreaterThan(0);

    assistantMessages.forEach(message => {
      expect(message.message?.role).toBe('assistant');
      expect(message.message?.content).toBeTruthy();
    });
  });

  it('should annotate internal messages', async () => {
    const messages = await getChatSessionDetails('session-002', 'test-project-1', {
      claudeDir: fixturesDir,
    });

    const hookMessage = messages.find(m => m.internalMessageType === 'hook');
    expect(hookMessage).toBeTruthy();
    expect(hookMessage!.type).toBe('system');
    expect(hookMessage!.message?.content).toContain('PreToolUse:');
  });

  it('should annotate terminal control messages', async () => {
    const messages = await getChatSessionDetails('session-003', 'test-project-1', {
      claudeDir: fixturesDir,
    });

    const terminalMessage = messages.find(m => m.internalMessageType === 'terminal_control');
    expect(terminalMessage).toBeTruthy();
    expect(terminalMessage!.message?.content).toContain('/clear');
  });

  it('should throw error for non-existent session', async () => {
    await expect(
      getChatSessionDetails('non-existent-session', 'test-project-1', {
        claudeDir: fixturesDir,
      })
    ).rejects.toThrow('Session file not found');
  });

  it('should throw error for non-existent project', async () => {
    await expect(
      getChatSessionDetails('session-001', 'non-existent-project', {
        claudeDir: fixturesDir,
      })
    ).rejects.toThrow('Session file not found');
  });

  it('should handle sessions from different projects', async () => {
    const messages1 = await getChatSessionDetails('session-001', 'test-project-1', {
      claudeDir: fixturesDir,
    });

    const messages2 = await getChatSessionDetails('session-004', 'test-project-2', {
      claudeDir: fixturesDir,
    });

    const msg1WithSession = messages1.find(m => m.sessionId);
    const msg2WithSession = messages2.find(m => m.sessionId);

    expect(msg1WithSession?.sessionId).toBe('session-001');
    expect(msg2WithSession?.sessionId).toBe('session-004');
    expect(msg1WithSession?.cwd).not.toBe(msg2WithSession?.cwd);
  });

  it('should preserve git branch information', async () => {
    const messages = await getChatSessionDetails('session-002', 'test-project-1', {
      claudeDir: fixturesDir,
    });

    const messagesWithBranch = messages.filter(m => m.gitBranch);
    expect(messagesWithBranch.length).toBeGreaterThan(0);
    expect(messagesWithBranch[0].gitBranch).toBe('feature/new-ui');
  });

  it('should preserve parent-child relationships', async () => {
    const messages = await getChatSessionDetails('session-001', 'test-project-1', {
      claudeDir: fixturesDir,
    });

    // First message should have null parent
    expect(messages[1].parentUuid).toBeNull(); // Skip file-history-snapshot

    // Subsequent messages should reference parent UUIDs
    for (let i = 2; i < messages.length; i++) {
      expect(messages[i].parentUuid).toBeTruthy();
      // Parent UUID should match a previous message's UUID
      const parentExists = messages.slice(0, i).some(m => m.uuid === messages[i].parentUuid);
      expect(parentExists).toBe(true);
    }
  });

  it('should handle sessions with different versions', async () => {
    const messages = await getChatSessionDetails('session-001', 'test-project-1', {
      claudeDir: fixturesDir,
    });

    messages.forEach(message => {
      if (message.version) {
        expect(message.version).toMatch(/^\d+\.\d+\.\d+$/);
      }
    });
  });

  it('should parse message usage statistics when present', async () => {
    const messages = await getChatSessionDetails('session-001', 'test-project-1', {
      claudeDir: fixturesDir,
    });

    const messagesWithUsage = messages.filter(m => m.message?.usage);
    expect(messagesWithUsage.length).toBeGreaterThan(0);

    messagesWithUsage.forEach(message => {
      const usage = message.message!.usage!;
      expect(typeof usage.input_tokens).toBe('number');
      expect(typeof usage.output_tokens).toBe('number');
    });
  });
});
