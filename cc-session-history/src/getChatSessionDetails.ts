import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import type { ChatMessage } from './types.ts';
import { annotateMessages } from './annotateMessages.ts';

export interface GetChatSessionDetailsOptions {
  /**
   * Custom path to Claude directory. Defaults to ~/.claude
   */
  claudeDir?: string;
  /**
   * Enable verbose logging
   */
  verbose?: boolean;
}

/**
 * Retrieves the details (all messages) for a specific session
 * @param sessionId The session ID to retrieve
 * @param projectName The project name (directory) where the session is stored
 * @returns Array of chat messages for the session
 */
export async function getChatSessionDetails(
  sessionId: string,
  projectName: string,
  options: GetChatSessionDetailsOptions = {}
): Promise<ChatMessage[]> {
  const claudeDir = options.claudeDir || path.join(os.homedir(), '.claude');
  const verbose = options.verbose || false;

  if (verbose) {
    console.log(`[getSessionDetails] Getting session details for ${sessionId} in project ${projectName}`);
  }

  const sessionFilePath = path.join(claudeDir, 'projects', projectName, `${sessionId}.jsonl`);

  try {
    const content = await fs.readFile(sessionFilePath, 'utf-8');
    const lines = content.trim().split('\n');

    const messages: ChatMessage[] = lines.map(line => JSON.parse(line));

    annotateMessages(messages);
    return messages;
  } catch (error) {
    if (verbose) {
      console.error(`Failed to read session file: ${sessionFilePath}`, error);
    }

    // Check if the error is a file not found error
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      throw new Error(`Session file not found: ${sessionFilePath}`);
    }

    // Re-throw other errors
    throw error;
  }
}
