import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { ChatMessage, ChatSession, ProjectDirectory } from './types';
import { annotateInternalMessages } from './annotateInternalMessages';

export interface GetChatSessionsOptions {
  /**
   * Custom path to Claude directory. Defaults to ~/.claude/projects
   */
  claudeDir?: string;
  /**
   * Enable verbose logging
   */
  verbose?: boolean;
}

/**
 * Retrieves all Claude Code chat sessions from the history files
 * @returns Array of project directories with their sessions
 */
export async function getChatSessions(options: GetChatSessionsOptions = {}): Promise<ProjectDirectory[]> {
  const claudeDir = options.claudeDir || path.join(os.homedir(), '.claude', 'projects');
  const verbose = options.verbose || false;

  if (verbose) {
    console.log(`[getChatSessions] Starting scan of Claude directory: ${claudeDir}`);
  }

  try {
    await fs.access(claudeDir);
  } catch (error) {
    if (verbose) {
      console.log('[getChatSessions] Claude directory does not exist');
    }
    return [];
  }

  const projectDirents = await fs.readdir(claudeDir, { withFileTypes: true });
  const projectDirs = projectDirents
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  if (verbose) {
    console.log(`[getChatSessions] Found ${projectDirs.length} project directories:`, projectDirs);
  }

  const projects: ProjectDirectory[] = [];

  for (const projectDir of projectDirs) {
    const projectPath = path.join(claudeDir, projectDir);
    const allFiles = await fs.readdir(projectPath);
    const files = allFiles.filter(file => file.endsWith('.jsonl'));

    if (verbose) {
      console.log(`[getChatSessions] Project ${projectDir}: Found ${files.length} .jsonl files`);
    }

    const sessions: ChatSession[] = [];

    for (const file of files) {
      const filePath = path.join(projectPath, file);

      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.trim().split('\n').filter(line => line.trim());

        if (verbose) {
          console.log(`[getChatSessions] File ${file}: ${lines.length} lines`);
        }

        if (lines.length === 0) {
          if (verbose) {
            console.log(`[getChatSessions] Skipping empty file: ${file}`);
          }
          continue;
        }

        const messages: ChatMessage[] = lines.map((line, index) => {
          try {
            return JSON.parse(line);
          } catch (error) {
            if (verbose) {
              console.error(`[getChatSessions] Failed to parse JSON at line ${index + 1} in ${file}:`, error);
            }
            throw error;
          }
        });

        annotateInternalMessages(messages);

        if (messages.length > 0) {
          const sessionId = messages[0].sessionId;

          if (verbose) {
            console.log(`[getChatSessions] Processing session ${sessionId} from ${projectDir}/${file}`);
          }

          // Validate sessionId exists and is a string
          if (!sessionId || typeof sessionId !== 'string') {
            if (verbose) {
              console.warn(`[getChatSessions] Invalid or missing sessionId in ${projectDir}/${file}, first message:`, messages[0]);
            }
            continue;
          }

          const firstMessage = messages[0];
          const lastMessage = messages[messages.length - 1];

          sessions.push({
            sessionId,
            messages,
            firstMessageTimestamp: firstMessage.timestamp,
            lastMessageTimestamp: lastMessage.timestamp,
            projectPath: projectDir,
            messageCount: messages.length
          });

          if (verbose) {
            console.log(`[getChatSessions] Successfully added session ${sessionId} (${messages.length} messages)`);
          }
        }
      } catch (error) {
        if (verbose) {
          console.error(`[getChatSessions] Error processing file ${filePath}:`, error);
        }
        continue;
      }
    }

    if (sessions.length > 0) {
      if (verbose) {
        console.log(`[getChatSessions] Project ${projectDir}: Successfully processed ${sessions.length} sessions`);
      }

      // Sort sessions by last message timestamp
      sessions.sort((a, b) =>
        new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime()
      );

      projects.push({
        path: projectDir,
        sessions
      });
    } else if (verbose) {
      console.log(`[getChatSessions] Project ${projectDir}: No valid sessions found`);
    }
  }

  // Sort projects by most recent session
  projects.sort((a, b) => {
    const aLatest = new Date(a.sessions[0]?.lastMessageTimestamp || 0).getTime();
    const bLatest = new Date(b.sessions[0]?.lastMessageTimestamp || 0).getTime();
    return bLatest - aLatest;
  });

  return projects;
}
