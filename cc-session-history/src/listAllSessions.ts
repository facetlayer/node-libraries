import * as fs from 'fs/promises';
import { listChatSessions } from './listChatSessions.ts';
import { getClaudeProjectsDir } from './paths.ts';
import type { ChatSession } from './types.ts';

export interface ListAllSessionsOptions {
  claudeDir?: string;
  verbose?: boolean;
}

/**
 * Read every project under the Claude directory and return all sessions, sorted
 * by lastMessageTimestamp descending. Used by commands that need to operate
 * across all projects (--all-projects).
 */
export async function listAllSessions(options: ListAllSessionsOptions = {}): Promise<ChatSession[]> {
  const projectsDir = getClaudeProjectsDir(options.claudeDir);

  let projectDirs: string[];
  try {
    const projectDirents = await fs.readdir(projectsDir, { withFileTypes: true });
    projectDirs = projectDirents
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
  } catch {
    return [];
  }

  const all: ChatSession[] = [];
  for (const projectDir of projectDirs) {
    const sessions = await listChatSessions({
      project: projectDir,
      claudeDir: options.claudeDir,
      verbose: options.verbose,
    });
    all.push(...sessions);
  }

  all.sort((a, b) =>
    new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime()
  );

  return all;
}
