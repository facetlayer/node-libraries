import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import type { ChatMessage, ChatSession } from './types.ts';
import { annotateMessages } from './annotateMessages.ts';

export interface ListChatSessionsOptions {
  /**
   * Project path to get sessions for (required)
   */
  project: string;
  /**
   * Custom path to Claude directory. Defaults to ~/.claude
   */
  claudeDir?: string;
  /**
   * Enable verbose logging
   */
  verbose?: boolean;
  /**
   * Number of sessions to skip (for pagination)
   */
  offset?: number;
  /**
   * Maximum number of sessions to return (for pagination)
   */
  limit?: number;
}

/**
 * Retrieves all Claude Code chat sessions for a specific project
 * @param options Options including the required project path
 * @returns Array of chat sessions for the specified project
 */
export async function listChatSessions(options: ListChatSessionsOptions): Promise<ChatSession[]> {
  const claudeDir = options.claudeDir || path.join(os.homedir(), '.claude');
  const verbose = options.verbose || false;
  const projectDir = options.project;

  if (verbose) {
    console.log(`[listChatSessions] Scanning project: ${projectDir} in ${claudeDir}`);
  }

  const projectPath = path.join(claudeDir, 'projects', projectDir);

  // Check if project directory exists
  try {
    await fs.access(projectPath);
  } catch (error) {
    if (verbose) {
      console.log(`[listChatSessions] Project directory does not exist: ${projectPath}`);
    }
    return [];
  }

  // Read all .jsonl files in the project directory
  const allFiles = await fs.readdir(projectPath);
  const files = allFiles.filter(file => file.endsWith('.jsonl'));

  if (verbose) {
    console.log(`[listChatSessions] Project ${projectDir}: Found ${files.length} .jsonl files`);
  }

  const sessions: ChatSession[] = [];

  for (const file of files) {
    const filePath = path.join(projectPath, file);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line.trim());

      if (verbose) {
        console.log(`[listChatSessions] File ${file}: ${lines.length} lines`);
      }

      if (lines.length === 0) {
        if (verbose) {
          console.log(`[listChatSessions] Skipping empty file: ${file}`);
        }
        continue;
      }

      const messages: ChatMessage[] = lines.map((line, index) => {
        try {
          return JSON.parse(line);
        } catch (error) {
          if (verbose) {
            console.error(`[listChatSessions] Failed to parse JSON at line ${index + 1} in ${file}:`, error);
          }
          throw error;
        }
      });

      annotateMessages(messages);

      if (messages.length > 0) {
        // Find sessionId from first message that has it (some messages like file-history-snapshot may not have it)
        const messageWithSession = messages.find(m => m.sessionId);
        const sessionId = messageWithSession?.sessionId;

        if (verbose) {
          console.log(`[listChatSessions] Processing session ${sessionId} from ${projectDir}/${file}`);
        }

        // Validate sessionId exists and is a string
        if (!sessionId || typeof sessionId !== 'string') {
          if (verbose) {
            console.warn(`[listChatSessions] Invalid or missing sessionId in ${projectDir}/${file}`);
          }
          continue;
        }

        // Find first and last messages with valid timestamps
        const firstMessageWithTimestamp = messages.find(m => m.timestamp);
        const lastMessageWithTimestamp = [...messages].reverse().find(m => m.timestamp);

        sessions.push({
          sessionId,
          messages,
          firstMessageTimestamp: firstMessageWithTimestamp?.timestamp,
          lastMessageTimestamp: lastMessageWithTimestamp?.timestamp ?? '',
          projectPath: projectDir,
          messageCount: messages.length
        });

        if (verbose) {
          console.log(`[listChatSessions] Successfully added session ${sessionId} (${messages.length} messages)`);
        }
      }
    } catch (error) {
      if (verbose) {
        console.error(`[listChatSessions] Error processing file ${filePath}:`, error);
      }
      continue;
    }
  }

  if (verbose) {
    console.log(`[listChatSessions] Project ${projectDir}: Successfully processed ${sessions.length} sessions`);
  }

  // Sort sessions by last message timestamp (most recent first)
  sessions.sort((a, b) =>
    new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime()
  );

  // Apply pagination if specified
  if (options.offset !== undefined || options.limit !== undefined) {
    const offset = options.offset || 0;
    const limit = options.limit;

    if (verbose) {
      console.log(`[listChatSessions] Applying pagination: offset=${offset}, limit=${limit}`);
      console.log(`[listChatSessions] Total sessions before pagination: ${sessions.length}`);
    }

    const paginatedSessions = limit !== undefined
      ? sessions.slice(offset, offset + limit)
      : sessions.slice(offset);

    if (verbose) {
      console.log(`[listChatSessions] Sessions after pagination: ${paginatedSessions.length}`);
    }

    return paginatedSessions;
  }

  return sessions;
}
