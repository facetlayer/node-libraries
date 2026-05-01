import { listAllSessions } from './listAllSessions.ts';
import { listChatSessions } from './listChatSessions.ts';
import { pathToProjectDir } from './printChatSessions.ts';
import type { ChatSession } from './types.ts';

export interface LoadSessionsOptions {
  /** Project directory name (e.g. `-Users-andy-foo`) or absolute path. Ignored when `allProjects` is true. */
  project?: string;
  /** When true, scan every project under the Claude dir. */
  allProjects?: boolean;
  claudeDir?: string;
  verbose?: boolean;
}

/**
 * Load sessions for a list/aggregation-style command.
 *
 * Picks between scanning every project (`allProjects`), an explicitly named
 * project, or the project derived from `process.cwd()`. Centralizes the
 * project-name normalization so individual commands don't each carry a private
 * copy of this branch.
 */
export async function loadSessionsForCommand(options: LoadSessionsOptions): Promise<ChatSession[]> {
  if (options.allProjects) {
    return listAllSessions({ claudeDir: options.claudeDir, verbose: options.verbose });
  }
  const project = options.project
    ? (options.project.startsWith('/') ? pathToProjectDir(options.project) : options.project)
    : pathToProjectDir(process.cwd());
  return listChatSessions({ project, claudeDir: options.claudeDir, verbose: options.verbose });
}
